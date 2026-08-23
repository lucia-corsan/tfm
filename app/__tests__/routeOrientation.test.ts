import {
  bearingBetweenPoints,
  evaluateStableHeading,
  normalizeHeading,
  routeBearingAfterGeometryIndex,
  signedHeadingDifference,
} from '@/features/orientation/routeOrientation';

describe('route orientation calculations', () => {
  test('normalizes headings and chooses the shortest turn across north', () => {
    expect(normalizeHeading(-10)).toBe(350);
    expect(normalizeHeading(370)).toBe(10);
    expect(signedHeadingDifference(350, 10)).toBe(20);
    expect(signedHeadingDifference(10, 350)).toBe(-20);
  });

  test('calculates the four cardinal bearings', () => {
    const origin = { latitude: 40, longitude: -3 };
    expect(
      bearingBetweenPoints(origin, { latitude: 41, longitude: -3 }),
    ).toBeCloseTo(0, 5);
    expect(
      bearingBetweenPoints(origin, { latitude: 40, longitude: -2 }),
    ).toBeCloseTo(89.68, 1);
    expect(
      bearingBetweenPoints(origin, { latitude: 39, longitude: -3 }),
    ).toBeCloseTo(180, 5);
    expect(
      bearingBetweenPoints(origin, { latitude: 40, longitude: -4 }),
    ).toBeCloseTo(270.32, 1);
  });

  test('looks ahead instead of using nearly coincident geometry vertices', () => {
    const bearing = routeBearingAfterGeometryIndex(
      [
        { latitude: 40, longitude: -3 },
        { latitude: 40.000001, longitude: -3 },
        { latitude: 40.001, longitude: -3 },
      ],
      0,
    );
    expect(bearing).toBeCloseTo(0, 2);
  });

  test('returns no route direction at the end of the geometry', () => {
    expect(
      routeBearingAfterGeometryIndex(
        [
          { latitude: 40, longitude: -3 },
          { latitude: 40.001, longitude: -3 },
        ],
        1,
      ),
    ).toBeNull();
  });

  test('accepts three stable readings around geographic north', () => {
    const result = evaluateStableHeading(
      [
        { accuracy: 3, headingDeg: 358 },
        { accuracy: 2, headingDeg: 1 },
        { accuracy: 3, headingDeg: 3 },
      ],
      5,
    );
    expect(result?.classification).toBe('aligned');
    expect(result?.currentHeadingDeg).toBeCloseTo(0.67, 1);
  });

  test('rejects inaccurate or mutually inconsistent readings', () => {
    expect(
      evaluateStableHeading(
        [
          { accuracy: 1, headingDeg: 0 },
          { accuracy: 1, headingDeg: 0 },
          { accuracy: 1, headingDeg: 0 },
        ],
        0,
      ),
    ).toBeNull();
    expect(
      evaluateStableHeading(
        [
          { accuracy: 3, headingDeg: 0 },
          { accuracy: 3, headingDeg: 40 },
          { accuracy: 3, headingDeg: 80 },
        ],
        0,
      ),
    ).toBeNull();
  });

  test('requires three reliable readings after an inaccurate sample', () => {
    expect(
      evaluateStableHeading(
        [
          { accuracy: 3, headingDeg: 0 },
          { accuracy: 1, headingDeg: 0 },
          { accuracy: 3, headingDeg: 1 },
          { accuracy: 3, headingDeg: 2 },
        ],
        0,
      ),
    ).toBeNull();
    expect(
      evaluateStableHeading(
        [
          { accuracy: 1, headingDeg: 0 },
          { accuracy: 3, headingDeg: 1 },
          { accuracy: 3, headingDeg: 2 },
          { accuracy: 3, headingDeg: 0 },
        ],
        0,
      )?.classification,
    ).toBe('aligned');
  });

  test.each([
    [35, 'adjust_left'],
    [325, 'adjust_right'],
    [90, 'clearly_off_left'],
    [270, 'clearly_off_right'],
  ])('classifies a stable heading of %d degrees as %s', (heading, expected) => {
    const result = evaluateStableHeading(
      [
        { accuracy: 3, headingDeg: heading },
        { accuracy: 3, headingDeg: heading + 1 },
        { accuracy: 3, headingDeg: heading - 1 },
      ],
      0,
    );
    expect(result?.classification).toBe(expected);
  });
});
