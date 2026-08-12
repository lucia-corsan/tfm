import {
  buildPilotComparisonRequest,
  DEMO_PROFILES,
  PILOT_DESTINATION_PLACE,
  PILOT_ORIGIN_PLACE,
} from '@/features/route-comparison/profiles';

describe('route comparison demonstration profiles', () => {
  test('keeps every gradual factor active in the balanced profile', () => {
    expect(Object.values(DEMO_PROFILES.balanced_demo.declared_weights)).toEqual(
      Array(9).fill(1),
    );
  });

  test('prioritizes complex crossings without disabling other evidence', () => {
    const weights = DEMO_PROFILES.simpler_crossings_demo.declared_weights;

    expect(weights.complex_crossings).toBe(8);
    expect(weights.uncertainty).toBe(1);
    expect(Object.values(weights).every((weight) => weight > 0)).toBe(true);
  });

  test('builds a fresh request for the exact pilot endpoints', () => {
    const first = buildPilotComparisonRequest('balanced_demo');
    const second = buildPilotComparisonRequest('balanced_demo');

    expect(first.origin).toEqual({ latitude: 40.4353, longitude: -3.7191 });
    expect(first.destination).toEqual({ latitude: 40.4211, longitude: -3.7206 });
    expect(first.profile.profile_id).toBe('balanced_demo');
    expect(first).not.toBe(second);
    expect(first.profile.declared_weights).not.toBe(second.profile.declared_weights);
  });

  test('uses selected coordinates without mutating the catalog places', () => {
    const origin = { latitude: 40.4304497, longitude: -3.7155854 };
    const destination = { latitude: 40.4246983, longitude: -3.7118298 };

    const request = buildPilotComparisonRequest(
      'balanced_demo',
      origin,
      destination,
    );

    expect(request.origin).toEqual(origin);
    expect(request.destination).toEqual(destination);
    expect(request.origin).not.toBe(origin);
    expect(PILOT_ORIGIN_PLACE.name).toBe('Moncloa');
    expect(PILOT_DESTINATION_PLACE.name).toBe('Príncipe Pío');
  });
});
