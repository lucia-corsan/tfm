import type { GeoPoint } from '../../api/types';
import { distanceToRouteMetres } from './geo';

export interface LocationSample extends GeoPoint {
  accuracyM: number;
  timestampMs: number;
}

export type RouteTrackingStatus =
  | 'waiting_for_location'
  | 'poor_accuracy'
  | 'on_route'
  | 'possible_deviation'
  | 'confirmation_required';

export interface DeviationDetectorConfig {
  maximumAccuracyM: number;
  minimumConsecutiveOutsideSamples: number;
  minimumOutsideDurationMs: number;
  routeDistanceThresholdM: number;
}

export interface DeviationDetectorState {
  consecutiveOutsideSamples: number;
  distanceToRouteM: number | null;
  firstOutsideTimestampMs: number | null;
  status: RouteTrackingStatus;
}

export const DEFAULT_DEVIATION_CONFIG: DeviationDetectorConfig = {
  maximumAccuracyM: 25,
  minimumConsecutiveOutsideSamples: 3,
  minimumOutsideDurationMs: 10_000,
  routeDistanceThresholdM: 30,
};

export const INITIAL_DEVIATION_STATE: DeviationDetectorState = {
  consecutiveOutsideSamples: 0,
  distanceToRouteM: null,
  firstOutsideTimestampMs: null,
  status: 'waiting_for_location',
};

export function evaluateLocationSample(
  previous: DeviationDetectorState,
  sample: LocationSample,
  route: GeoPoint[],
  config: DeviationDetectorConfig = DEFAULT_DEVIATION_CONFIG,
): DeviationDetectorState {
  if (sample.accuracyM > config.maximumAccuracyM) {
    return {
      consecutiveOutsideSamples: 0,
      distanceToRouteM: null,
      firstOutsideTimestampMs: null,
      status: 'poor_accuracy',
    };
  }

  const distanceToRouteM = distanceToRouteMetres(sample, route);
  if (distanceToRouteM <= config.routeDistanceThresholdM) {
    return {
      consecutiveOutsideSamples: 0,
      distanceToRouteM,
      firstOutsideTimestampMs: null,
      status: 'on_route',
    };
  }

  const firstOutsideTimestampMs =
    previous.firstOutsideTimestampMs ?? sample.timestampMs;
  const consecutiveOutsideSamples = previous.consecutiveOutsideSamples + 1;
  const enoughSamples =
    consecutiveOutsideSamples >= config.minimumConsecutiveOutsideSamples;
  const enoughTime =
    sample.timestampMs - firstOutsideTimestampMs >=
    config.minimumOutsideDurationMs;
  return {
    consecutiveOutsideSamples,
    distanceToRouteM,
    firstOutsideTimestampMs,
    status:
      enoughSamples && enoughTime
        ? 'confirmation_required'
        : 'possible_deviation',
  };
}
