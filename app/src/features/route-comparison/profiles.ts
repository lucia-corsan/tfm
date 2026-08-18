import type {
  GeoPoint,
  MobilityProfile,
  PlaceResult,
  PreferenceWeights,
  RouteCompareRequest,
} from '@/api/types';

export type DemoProfileId = 'balanced_demo' | 'simpler_crossings_demo';

export const PILOT_ORIGIN_PLACE: PlaceResult = {
  place_id: 'moncloa',
  name: 'Moncloa',
  description: 'Intercambiador y entorno de la plaza de Moncloa.',
  location: { latitude: 40.4353, longitude: -3.7191 },
  source: 'pilot_catalog',
};

export const PILOT_DESTINATION_PLACE: PlaceResult = {
  place_id: 'principe_pio',
  name: 'Príncipe Pío',
  description: 'Intercambiador y entorno de la estación de Príncipe Pío.',
  location: { latitude: 40.4211, longitude: -3.7206 },
  source: 'pilot_catalog',
};

const BALANCED_WEIGHTS: PreferenceWeights = {
  distance: 1,
  complex_crossings: 1,
  crossing_support: 1,
  sidewalk_evidence: 1,
  steps: 1,
  surface: 1,
  orientation_complexity: 1,
  slope: 1,
  uncertainty: 1,
};

const SIMPLER_CROSSINGS_WEIGHTS: PreferenceWeights = {
  ...BALANCED_WEIGHTS,
  complex_crossings: 8,
};

function createProfile(
  profileId: DemoProfileId,
  declaredWeights: PreferenceWeights,
): MobilityProfile {
  return {
    profile_id: profileId,
    avoid_steps: true,
    require_pedestrian_access: true,
    avoid_incompatible_crossings: true,
    maximum_slope_percent: null,
    maximum_detour_ratio: 1.5,
    declared_weights: { ...declaredWeights },
  };
}

export const DEMO_PROFILES: Record<DemoProfileId, MobilityProfile> = {
  balanced_demo: createProfile('balanced_demo', BALANCED_WEIGHTS),
  simpler_crossings_demo: createProfile(
    'simpler_crossings_demo',
    SIMPLER_CROSSINGS_WEIGHTS,
  ),
};

export function buildPilotComparisonRequest(
  profileId: DemoProfileId,
  origin: GeoPoint = PILOT_ORIGIN_PLACE.location,
  destination: GeoPoint = PILOT_DESTINATION_PLACE.location,
  effectiveWeights?: PreferenceWeights,
): RouteCompareRequest {
  return {
    origin: { ...origin },
    destination: { ...destination },
    profile: {
      ...DEMO_PROFILES[profileId],
      declared_weights: { ...DEMO_PROFILES[profileId].declared_weights },
    },
    ...(effectiveWeights
      ? { effective_weights: { ...effectiveWeights } }
      : {}),
  };
}
