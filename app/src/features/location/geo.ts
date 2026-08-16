import type { GeoPoint } from '../../api/types';

const EARTH_RADIUS_M = 6_371_000;

interface LocalPoint {
  x: number;
  y: number;
}

function toLocalMetres(point: GeoPoint, latitudeReference: number): LocalPoint {
  const radians = Math.PI / 180;
  return {
    x:
      EARTH_RADIUS_M *
      point.longitude *
      radians *
      Math.cos(latitudeReference * radians),
    y: EARTH_RADIUS_M * point.latitude * radians,
  };
}

function distanceToSegment(
  point: LocalPoint,
  start: LocalPoint,
  end: LocalPoint,
): number {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX ** 2 + segmentY ** 2;
  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  const projection =
    ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) /
    lengthSquared;
  const boundedProjection = Math.max(0, Math.min(1, projection));
  const nearestX = start.x + boundedProjection * segmentX;
  const nearestY = start.y + boundedProjection * segmentY;
  return Math.hypot(point.x - nearestX, point.y - nearestY);
}

export function distanceBetweenPointsMetres(
  first: GeoPoint,
  second: GeoPoint,
): number {
  const latitudeReference = (first.latitude + second.latitude) / 2;
  const firstLocal = toLocalMetres(first, latitudeReference);
  const secondLocal = toLocalMetres(second, latitudeReference);
  return Math.hypot(
    firstLocal.x - secondLocal.x,
    firstLocal.y - secondLocal.y,
  );
}

export function distanceToRouteMetres(
  point: GeoPoint,
  route: GeoPoint[],
): number {
  if (route.length < 2) {
    throw new Error('A route requires at least two points.');
  }
  const latitudeReference = point.latitude;
  const localPoint = toLocalMetres(point, latitudeReference);
  let minimumDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < route.length - 1; index += 1) {
    minimumDistance = Math.min(
      minimumDistance,
      distanceToSegment(
        localPoint,
        toLocalMetres(route[index], latitudeReference),
        toLocalMetres(route[index + 1], latitudeReference),
      ),
    );
  }
  return minimumDistance;
}
