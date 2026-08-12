import type {
  AccessibilityAttribute,
  ApiErrorCode,
  ApiErrorResponse,
  ComparedRoute,
  ConstraintCode,
  ConstraintViolation,
  GeoPoint,
  PlaceResult,
  PlaceSearchResponse,
  PreferenceWeights,
  ReasonKind,
  RejectedRoute,
  RouteCategory,
  RouteCompareResponse,
  RouteReason,
  RouteScore,
  RouteSource,
  RouteWarning,
  ScoringDimension,
} from '@/api/types';

const PREFERENCE_KEYS: ScoringDimension[] = [
  'distance',
  'complex_crossings',
  'crossing_support',
  'sidewalk_evidence',
  'steps',
  'surface',
  'orientation_complexity',
  'slope',
  'uncertainty',
];

const ROUTE_CATEGORIES: RouteCategory[] = [
  'balanced',
  'fewer_complex_crossings',
  'simple_or_short',
];
const ROUTE_SOURCES: RouteSource[] = ['fixture', 'ors'];
const REASON_KINDS: ReasonKind[] = [
  'relative_advantage',
  'low_absolute_cost',
  'least_costly_active_factor',
];
const ACCESSIBILITY_ATTRIBUTES: AccessibilityAttribute[] = [
  'sidewalk',
  'step_free',
  'pedestrian_access',
  'crossing_compatibility',
  'traffic_signals',
  'audible_signals',
  'tactile_paving',
  'kerb',
  'ramp_access',
  'surface',
  'slope',
];
const CONSTRAINT_CODES: ConstraintCode[] = [
  'steps',
  'pedestrian_access',
  'incompatible_crossings',
  'maximum_slope',
  'maximum_detour',
];
const API_ERROR_CODES: ApiErrorCode[] = [
  'invalid_request',
  'route_scenario_not_found',
  'routing_provider_unavailable',
  'place_search_unavailable',
];

export class InvalidApiResponseError extends Error {
  constructor() {
    super('La respuesta del servidor no tiene el formato esperado.');
    this.name = 'InvalidApiResponseError';
  }
}

function invalidResponse(): never {
  throw new InvalidApiResponseError();
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return invalidResponse();
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    return invalidResponse();
  }
  return value;
}

function asBoolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    return invalidResponse();
  }
  return value;
}

function asNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return invalidResponse();
  }
  return value;
}

function asBoundedNumber(value: unknown, minimum: number, maximum: number): number {
  const number = asNumber(value);
  if (number < minimum || number > maximum) {
    return invalidResponse();
  }
  return number;
}

function asEnumValue<T extends string>(value: unknown, values: readonly T[]): T {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    return invalidResponse();
  }
  return value as T;
}

function parseGeoPoint(value: unknown): GeoPoint {
  const point = asRecord(value);
  return {
    latitude: asBoundedNumber(point.latitude, -90, 90),
    longitude: asBoundedNumber(point.longitude, -180, 180),
  };
}

function parsePlaceResult(value: unknown): PlaceResult {
  const place = asRecord(value);
  return {
    place_id: asString(place.place_id),
    name: asString(place.name),
    description: asString(place.description),
    location: parseGeoPoint(place.location),
    source: asEnumValue(
      place.source,
      ['pilot_catalog', 'ors_geocoder'] as const,
    ),
  };
}

export function parsePlaceSearchResponse(value: unknown): PlaceSearchResponse {
  const response = asRecord(value);
  if (!Array.isArray(response.places) || response.places.length > 10) {
    return invalidResponse();
  }
  const places = response.places.map(parsePlaceResult);
  if (new Set(places.map((place) => place.place_id)).size !== places.length) {
    return invalidResponse();
  }
  return { places };
}

function parseWeights(value: unknown): PreferenceWeights {
  const weights = asRecord(value);
  return Object.fromEntries(
    PREFERENCE_KEYS.map((key) => [key, asBoundedNumber(weights[key], 0, 1)]),
  ) as unknown as PreferenceWeights;
}

function parseScore(value: unknown): RouteScore {
  const score = asRecord(value);
  const normalizedWeights = parseWeights(score.normalized_weights);
  const costs = parseWeights(score.costs);
  const contributions = parseWeights(score.contributions);
  const totalCost = asBoundedNumber(score.total_cost, 0, 1);
  const adequacy = asBoundedNumber(score.adequacy, 0, 1);
  const weightSum = Object.values(normalizedWeights).reduce(
    (total, weight) => total + weight,
    0,
  );
  const contributionSum = Object.values(contributions).reduce(
    (total, contribution) => total + contribution,
    0,
  );
  if (
    Math.abs(weightSum - 1) > 1e-8 ||
    Math.abs(contributionSum - totalCost) > 1e-8 ||
    Math.abs(adequacy - (1 - totalCost)) > 1e-8
  ) {
    return invalidResponse();
  }

  return {
    route_id: asString(score.route_id),
    normalized_weights: normalizedWeights,
    costs,
    contributions,
    confidence: asBoundedNumber(score.confidence, 0, 1),
    uncertainty: asBoundedNumber(score.uncertainty, 0, 1),
    total_cost: totalCost,
    adequacy,
  };
}

function parseReason(value: unknown): RouteReason {
  const reason = asRecord(value);
  return {
    kind: asEnumValue(reason.kind, REASON_KINDS),
    dimension: asEnumValue(reason.dimension, PREFERENCE_KEYS),
    cost: asBoundedNumber(reason.cost, 0, 1),
    contribution: asBoundedNumber(reason.contribution, 0, 1),
    comparison_cost:
      reason.comparison_cost === null
        ? null
        : asBoundedNumber(reason.comparison_cost, 0, 1),
  };
}

function parseWarning(value: unknown): RouteWarning {
  const warning = asRecord(value);
  const state = asEnumValue(warning.state, ['unknown', 'unfavorable'] as const);
  return {
    attribute: asEnumValue(warning.attribute, ACCESSIBILITY_ATTRIBUTES),
    state,
    coverage_ratio: asBoundedNumber(warning.coverage_ratio, 0, 1),
    note: warning.note === null ? null : asString(warning.note),
  };
}

function parseComparedRoute(value: unknown): ComparedRoute {
  const route = asRecord(value);
  if (!Array.isArray(route.geometry) || route.geometry.length < 2) {
    return invalidResponse();
  }
  if (!Array.isArray(route.reasons) || route.reasons.length < 1 || route.reasons.length > 3) {
    return invalidResponse();
  }
  if (!Array.isArray(route.warnings)) {
    return invalidResponse();
  }

  const routeId = asString(route.route_id);
  const score = parseScore(route.score);
  if (score.route_id !== routeId) {
    return invalidResponse();
  }

  return {
    route_id: routeId,
    name: asString(route.name),
    rank: asBoundedNumber(route.rank, 1, 3),
    category: asEnumValue(route.category, ROUTE_CATEGORIES),
    source: asEnumValue(route.source, ROUTE_SOURCES),
    is_synthetic: asBoolean(route.is_synthetic),
    geometry: route.geometry.map(parseGeoPoint),
    distance_m: asBoundedNumber(route.distance_m, Number.EPSILON, Number.MAX_VALUE),
    duration_s: asBoundedNumber(route.duration_s, Number.EPSILON, Number.MAX_VALUE),
    score,
    reasons: route.reasons.map(parseReason),
    warnings: route.warnings.map(parseWarning),
  };
}

function parseViolation(value: unknown): ConstraintViolation {
  const violation = asRecord(value);
  return {
    code: asEnumValue(violation.code, CONSTRAINT_CODES),
    actual_value:
      violation.actual_value === null
        ? null
        : asBoundedNumber(violation.actual_value, 0, Number.MAX_VALUE),
    limit_value:
      violation.limit_value === null
        ? null
        : asBoundedNumber(violation.limit_value, 0, Number.MAX_VALUE),
  };
}

function parseRejectedRoute(value: unknown): RejectedRoute {
  const route = asRecord(value);
  if (!Array.isArray(route.violations) || route.violations.length === 0) {
    return invalidResponse();
  }
  return {
    route_id: asString(route.route_id),
    name: asString(route.name),
    category: asEnumValue(route.category, ROUTE_CATEGORIES),
    source: asEnumValue(route.source, ROUTE_SOURCES),
    is_synthetic: asBoolean(route.is_synthetic),
    violations: route.violations.map(parseViolation),
  };
}

export function parseRouteCompareResponse(value: unknown): RouteCompareResponse {
  const response = asRecord(value);
  if (!Array.isArray(response.routes) || response.routes.length > 3) {
    return invalidResponse();
  }
  if (!Array.isArray(response.rejected_routes) || response.rejected_routes.length > 3) {
    return invalidResponse();
  }

  const routes = response.routes.map(parseComparedRoute);
  const rejectedRoutes = response.rejected_routes.map(parseRejectedRoute);
  const allIds = [
    ...routes.map((route) => route.route_id),
    ...rejectedRoutes.map((route) => route.route_id),
  ];
  const expectedRanks = routes.map((_, index) => index + 1);
  if (
    allIds.length > 3 ||
    new Set(allIds).size !== allIds.length ||
    routes.some((route, index) => route.rank !== expectedRanks[index])
  ) {
    return invalidResponse();
  }

  return {
    scenario_id: asString(response.scenario_id),
    scenario_name: asString(response.scenario_name),
    origin: parseGeoPoint(response.origin),
    destination: parseGeoPoint(response.destination),
    profile_id: asString(response.profile_id),
    routes,
    rejected_routes: rejectedRoutes,
  };
}

export function parseApiErrorResponse(value: unknown): ApiErrorResponse {
  const response = asRecord(value);
  return { code: asEnumValue(response.code, API_ERROR_CODES) };
}
