import {
  distanceBetweenPointsMetres,
  distanceToRouteMetres,
} from '@/features/location/geo';

describe('GPS geometry', () => {
  const route = [
    { latitude: 40.43, longitude: -3.72 },
    { latitude: 40.431, longitude: -3.72 },
  ];

  test('returns approximately zero for a point on the route', () => {
    expect(
      distanceToRouteMetres(
        { latitude: 40.4305, longitude: -3.72 },
        route,
      ),
    ).toBeLessThan(0.1);
  });

  test('measures the perpendicular distance to the nearest segment', () => {
    const distance = distanceToRouteMetres(
      { latitude: 40.4305, longitude: -3.7195 },
      route,
    );
    expect(distance).toBeGreaterThan(41);
    expect(distance).toBeLessThan(44);
  });

  test('measures distance between nearby points in metres', () => {
    const distance = distanceBetweenPointsMetres(route[0], route[1]);
    expect(distance).toBeGreaterThan(110);
    expect(distance).toBeLessThan(112);
  });

  test('rejects a route without a segment', () => {
    expect(() => distanceToRouteMetres(route[0], [route[0]])).toThrow(
      'A route requires at least two points.',
    );
  });
});
