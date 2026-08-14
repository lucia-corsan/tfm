import {
  evaluateLocationSample,
  INITIAL_DEVIATION_STATE,
  type LocationSample,
} from '@/features/location/deviationDetector';

describe('conservative route deviation detector', () => {
  const route = [
    { latitude: 40.43, longitude: -3.72 },
    { latitude: 40.431, longitude: -3.72 },
  ];

  function sample(
    timestampMs: number,
    longitude = -3.7195,
    accuracyM = 5,
  ): LocationSample {
    return {
      accuracyM,
      latitude: 40.4305,
      longitude,
      timestampMs,
    };
  }

  test('ignores an imprecise measurement and breaks the sequence', () => {
    const possible = evaluateLocationSample(
      INITIAL_DEVIATION_STATE,
      sample(0),
      route,
    );
    const result = evaluateLocationSample(
      possible,
      sample(5_000, -3.7195, 30),
      route,
    );

    expect(result).toEqual({
      consecutiveOutsideSamples: 0,
      distanceToRouteM: null,
      firstOutsideTimestampMs: null,
      status: 'poor_accuracy',
    });
  });

  test('one reliable measurement outside the route is only possible deviation', () => {
    const result = evaluateLocationSample(
      INITIAL_DEVIATION_STATE,
      sample(0),
      route,
    );
    expect(result.status).toBe('possible_deviation');
    expect(result.consecutiveOutsideSamples).toBe(1);
  });

  test('three fast samples do not satisfy the temporal condition', () => {
    const first = evaluateLocationSample(
      INITIAL_DEVIATION_STATE,
      sample(0),
      route,
    );
    const second = evaluateLocationSample(first, sample(2_000), route);
    const third = evaluateLocationSample(second, sample(4_000), route);
    expect(third.status).toBe('possible_deviation');
    expect(third.consecutiveOutsideSamples).toBe(3);
  });

  test('reliable outside samples over ten seconds request confirmation', () => {
    const first = evaluateLocationSample(
      INITIAL_DEVIATION_STATE,
      sample(0),
      route,
    );
    const second = evaluateLocationSample(first, sample(5_000), route);
    const third = evaluateLocationSample(second, sample(10_000), route);
    expect(third.status).toBe('confirmation_required');
  });

  test('a reliable on-route sample resets prior deviation evidence', () => {
    const possible = evaluateLocationSample(
      INITIAL_DEVIATION_STATE,
      sample(0),
      route,
    );
    const result = evaluateLocationSample(
      possible,
      sample(5_000, -3.72),
      route,
    );
    expect(result.status).toBe('on_route');
    expect(result.consecutiveOutsideSamples).toBe(0);
    expect(result.firstOutsideTimestampMs).toBeNull();
  });
});
