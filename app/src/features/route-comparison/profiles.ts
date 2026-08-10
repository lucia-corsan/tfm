import type {
  MobilityProfile,
  PreferenceWeights,
  RouteCompareRequest,
} from '@/api/types';

export type DemoProfileId = 'balanced_demo' | 'simpler_crossings_demo';

const PILOT_ORIGIN = { latitude: 40.4353, longitude: -3.7191 } as const;
const PILOT_DESTINATION = { latitude: 40.4211, longitude: -3.7206 } as const;

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
): RouteCompareRequest {
  return {
    origin: { ...PILOT_ORIGIN },
    destination: { ...PILOT_DESTINATION },
    profile: {
      ...DEMO_PROFILES[profileId],
      declared_weights: { ...DEMO_PROFILES[profileId].declared_weights },
    },
  };
}
