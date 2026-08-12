export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export type PlaceSource = 'pilot_catalog';

export interface PlaceResult {
  place_id: string;
  name: string;
  description: string;
  location: GeoPoint;
  source: PlaceSource;
}

export interface PlaceSearchResponse {
  places: PlaceResult[];
}

export interface PreferenceWeights {
  distance: number;
  complex_crossings: number;
  crossing_support: number;
  sidewalk_evidence: number;
  steps: number;
  surface: number;
  orientation_complexity: number;
  slope: number;
  uncertainty: number;
}

export interface MobilityProfile {
  profile_id: string;
  avoid_steps: boolean;
  require_pedestrian_access: boolean;
  avoid_incompatible_crossings: boolean;
  maximum_slope_percent: number | null;
  maximum_detour_ratio: number;
  declared_weights: PreferenceWeights;
}

export interface RouteCompareRequest {
  origin: GeoPoint;
  destination: GeoPoint;
  profile: MobilityProfile;
}

export type RouteCategory =
  | 'balanced'
  | 'fewer_complex_crossings'
  | 'simple_or_short';

export type RouteSource = 'fixture' | 'ors';

export type EvidenceState = 'favorable' | 'unfavorable' | 'unknown';

export type AccessibilityAttribute =
  | 'sidewalk'
  | 'step_free'
  | 'pedestrian_access'
  | 'crossing_compatibility'
  | 'traffic_signals'
  | 'audible_signals'
  | 'tactile_paving'
  | 'kerb'
  | 'ramp_access'
  | 'surface'
  | 'slope';

export type ScoringDimension = keyof PreferenceWeights;

export type ReasonKind =
  | 'relative_advantage'
  | 'low_absolute_cost'
  | 'least_costly_active_factor';

export interface RouteScore {
  route_id: string;
  normalized_weights: PreferenceWeights;
  costs: PreferenceWeights;
  contributions: PreferenceWeights;
  confidence: number;
  uncertainty: number;
  total_cost: number;
  adequacy: number;
}

export interface RouteReason {
  kind: ReasonKind;
  dimension: ScoringDimension;
  cost: number;
  contribution: number;
  comparison_cost: number | null;
}

export interface RouteWarning {
  attribute: AccessibilityAttribute;
  state: Exclude<EvidenceState, 'favorable'>;
  coverage_ratio: number;
  note: string | null;
}

export interface ComparedRoute {
  route_id: string;
  name: string;
  rank: number;
  category: RouteCategory;
  source: RouteSource;
  is_synthetic: boolean;
  geometry: GeoPoint[];
  distance_m: number;
  duration_s: number;
  score: RouteScore;
  reasons: RouteReason[];
  warnings: RouteWarning[];
}

export type ConstraintCode =
  | 'steps'
  | 'pedestrian_access'
  | 'incompatible_crossings'
  | 'maximum_slope'
  | 'maximum_detour';

export interface ConstraintViolation {
  code: ConstraintCode;
  actual_value: number | null;
  limit_value: number | null;
}

export interface RejectedRoute {
  route_id: string;
  name: string;
  category: RouteCategory;
  source: RouteSource;
  is_synthetic: boolean;
  violations: ConstraintViolation[];
}

export interface RouteCompareResponse {
  scenario_id: string;
  scenario_name: string;
  origin: GeoPoint;
  destination: GeoPoint;
  profile_id: string;
  routes: ComparedRoute[];
  rejected_routes: RejectedRoute[];
}

export type ApiErrorCode =
  | 'invalid_request'
  | 'route_scenario_not_found'
  | 'routing_provider_unavailable';

export interface ApiErrorResponse {
  code: ApiErrorCode;
}
