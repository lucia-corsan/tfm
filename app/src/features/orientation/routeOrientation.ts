import type { GeoPoint } from '@/api/types';
import { distanceBetweenPointsMetres } from '@/features/location/geo';

export const MINIMUM_HEADING_ACCURACY = 2;
export const REQUIRED_STABLE_SAMPLES = 3;
export const MAXIMUM_SAMPLE_SPREAD_DEG = 15;
export const ALIGNED_THRESHOLD_DEG = 25;
export const CLEARLY_OFF_THRESHOLD_DEG = 60;
export const ROUTE_LOOKAHEAD_METRES = 12;

export interface HeadingSample {
  accuracy: number;
  headingDeg: number;
}

export type RouteOrientationClassification =
  | 'aligned'
  | 'adjust_left'
  | 'adjust_right'
  | 'clearly_off_left'
  | 'clearly_off_right';

export interface RouteOrientationResult {
  classification: RouteOrientationClassification;
  currentHeadingDeg: number;
  desiredHeadingDeg: number;
  signedDifferenceDeg: number;
}

/** Normaliza un ángulo al intervalo de 0 a menos de 360 grados. */
export function normalizeHeading(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** Devuelve el giro mínimo desde la dirección actual hasta la deseada. */
export function signedHeadingDifference(
  currentHeadingDeg: number,
  desiredHeadingDeg: number,
): number {
  const difference =
    normalizeHeading(desiredHeadingDeg) - normalizeHeading(currentHeadingDeg);
  return ((difference + 540) % 360) - 180;
}

/** Calcula el rumbo inicial entre dos coordenadas geográficas. */
export function bearingBetweenPoints(
  start: GeoPoint,
  end: GeoPoint,
): number {
  const radians = Math.PI / 180;
  const startLatitude = start.latitude * radians;
  const endLatitude = end.latitude * radians;
  const longitudeDifference =
    (end.longitude - start.longitude) * radians;
  const x =
    Math.sin(longitudeDifference) * Math.cos(endLatitude);
  const y =
    Math.cos(startLatitude) * Math.sin(endLatitude) -
    Math.sin(startLatitude) *
      Math.cos(endLatitude) *
      Math.cos(longitudeDifference);
  return normalizeHeading(Math.atan2(x, y) / radians);
}

/**
 * Obtiene una dirección útil del recorrido después de una maniobra.
 *
 * Se mira varios metros por delante para no depender de dos vértices casi
 * coincidentes, que producirían una dirección inestable.
 */
export function routeBearingAfterGeometryIndex(
  geometry: GeoPoint[],
  geometryIndex: number,
  lookaheadMetres = ROUTE_LOOKAHEAD_METRES,
): number | null {
  if (
    geometryIndex < 0 ||
    geometryIndex >= geometry.length - 1 ||
    geometry.length < 2
  ) {
    return null;
  }

  const start = geometry[geometryIndex];
  let lastDistinctPoint: GeoPoint | null = null;
  for (let index = geometryIndex + 1; index < geometry.length; index += 1) {
    const candidate = geometry[index];
    const distance = distanceBetweenPointsMetres(start, candidate);
    if (distance < 0.5) {
      continue;
    }
    lastDistinctPoint = candidate;
    if (distance >= lookaheadMetres) {
      return bearingBetweenPoints(start, candidate);
    }
  }
  return lastDistinctPoint
    ? bearingBetweenPoints(start, lastDistinctPoint)
    : null;
}

function circularMean(headings: number[]): number {
  const radians = Math.PI / 180;
  const sine = headings.reduce(
    (total, heading) => total + Math.sin(heading * radians),
    0,
  );
  const cosine = headings.reduce(
    (total, heading) => total + Math.cos(heading * radians),
    0,
  );
  return normalizeHeading(Math.atan2(sine, cosine) / radians);
}

function maximumDistanceFromMean(
  headings: number[],
  meanHeading: number,
): number {
  return Math.max(
    ...headings.map((heading) =>
      Math.abs(signedHeadingDifference(meanHeading, heading)),
    ),
  );
}

/** Clasifica una orientación solo cuando las lecturas son fiables y estables. */
export function evaluateStableHeading(
  samples: HeadingSample[],
  desiredHeadingDeg: number,
): RouteOrientationResult | null {
  const reliable = samples.slice(-REQUIRED_STABLE_SAMPLES);
  if (
    reliable.length < REQUIRED_STABLE_SAMPLES ||
    reliable.some(
      (sample) =>
        !Number.isFinite(sample.headingDeg) ||
        sample.accuracy < MINIMUM_HEADING_ACCURACY,
    )
  ) {
    return null;
  }

  const currentHeadingDeg = circularMean(
    reliable.map((sample) => normalizeHeading(sample.headingDeg)),
  );
  if (
    maximumDistanceFromMean(
      reliable.map((sample) => sample.headingDeg),
      currentHeadingDeg,
    ) > MAXIMUM_SAMPLE_SPREAD_DEG
  ) {
    return null;
  }

  const signedDifferenceDeg = signedHeadingDifference(
    currentHeadingDeg,
    desiredHeadingDeg,
  );
  const absoluteDifference = Math.abs(signedDifferenceDeg);
  let classification: RouteOrientationClassification;
  if (absoluteDifference <= ALIGNED_THRESHOLD_DEG) {
    classification = 'aligned';
  } else if (absoluteDifference <= CLEARLY_OFF_THRESHOLD_DEG) {
    classification = signedDifferenceDeg < 0 ? 'adjust_left' : 'adjust_right';
  } else {
    classification =
      signedDifferenceDeg < 0 ? 'clearly_off_left' : 'clearly_off_right';
  }

  return {
    classification,
    currentHeadingDeg,
    desiredHeadingDeg: normalizeHeading(desiredHeadingDeg),
    signedDifferenceDeg,
  };
}
