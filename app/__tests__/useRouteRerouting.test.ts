import { act, renderHook } from '@testing-library/react-native';

import { RouteApiError } from '@/api/client';
import type {
  ComparedRoute,
  RouteCompareResponse,
  RouteRerouteRequest,
} from '@/api/types';
import { useRouteRerouting } from '@/features/navigation/useRouteRerouting';

const request: RouteRerouteRequest = {
  current_position: { latitude: 40.43, longitude: -3.71 },
  destination: { latitude: 40.4211, longitude: -3.7206 },
  profile: {
    profile_id: 'balanced_demo',
    avoid_steps: true,
    require_pedestrian_access: true,
    avoid_incompatible_crossings: true,
    maximum_slope_percent: null,
    maximum_detour_ratio: 1.5,
    declared_weights: {
      distance: 1,
      complex_crossings: 1,
      crossing_support: 1,
      sidewalk_evidence: 1,
      steps: 1,
      surface: 1,
      orientation_complexity: 1,
      slope: 1,
      uncertainty: 1,
    },
  },
};

const replacementRoute = {
  route_id: 'rerouted_route',
  rank: 1,
} as ComparedRoute;

function response(routes: ComparedRoute[]): RouteCompareResponse {
  return {
    scenario_id: 'pilot',
    scenario_name: 'Recálculo piloto',
    origin: request.current_position,
    destination: request.destination,
    profile_id: request.profile.profile_id,
    routes,
    rejected_routes: [],
  };
}

describe('route rerouting state', () => {
  test('returns the first validated route after one confirmed request', async () => {
    const reroute = jest.fn().mockResolvedValue(response([replacementRoute]));
    const { result } = await renderHook(() => useRouteRerouting(reroute));
    let selected: ComparedRoute | null = null;

    await act(async () => {
      selected = await result.current.recalculate(request);
    });

    expect(reroute).toHaveBeenCalledWith(request);
    expect(selected).toBe(replacementRoute);
    expect(result.current.state.status).toBe('success');
  });

  test('keeps the caller without a replacement when no route is accepted', async () => {
    const reroute = jest.fn().mockResolvedValue(response([]));
    const { result } = await renderHook(() => useRouteRerouting(reroute));
    let selected: ComparedRoute | null = replacementRoute;

    await act(async () => {
      selected = await result.current.recalculate(request);
    });

    expect(selected).toBeNull();
    expect(result.current.state).toEqual({
      code: 'no_valid_routes',
      status: 'error',
    });
  });

  test('prevents a duplicate request while recalculation is in progress', async () => {
    let resolveRequest!: (value: RouteCompareResponse) => void;
    const reroute = jest.fn(
      () =>
        new Promise<RouteCompareResponse>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const { result } = await renderHook(() => useRouteRerouting(reroute));
    let firstRequest!: Promise<ComparedRoute | null>;
    let duplicateResult!: ComparedRoute | null;

    await act(async () => {
      firstRequest = result.current.recalculate(request);
      duplicateResult = await result.current.recalculate(request);
    });
    expect(duplicateResult).toBeNull();
    expect(reroute).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRequest(response([replacementRoute]));
      await firstRequest;
    });
  });

  test('exposes a controlled error and does not create a replacement route', async () => {
    const reroute = jest
      .fn()
      .mockRejectedValue(new RouteApiError('routing_provider_unavailable', 503));
    const { result } = await renderHook(() => useRouteRerouting(reroute));
    let selected: ComparedRoute | null = replacementRoute;

    await act(async () => {
      selected = await result.current.recalculate(request);
    });

    expect(selected).toBeNull();
    expect(result.current.state).toEqual({
      code: 'routing_provider_unavailable',
      status: 'error',
    });
  });

  test('ignores a response that arrives after navigation has closed', async () => {
    let resolveRequest!: (value: RouteCompareResponse) => void;
    const reroute = jest.fn(
      () =>
        new Promise<RouteCompareResponse>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const { result, unmount } = await renderHook(() =>
      useRouteRerouting(reroute),
    );
    let pending!: Promise<ComparedRoute | null>;

    await act(async () => {
      pending = result.current.recalculate(request);
    });
    await act(async () => unmount());
    let selected: ComparedRoute | null = replacementRoute;
    await act(async () => {
      resolveRequest(response([replacementRoute]));
      selected = await pending;
    });

    expect(selected).toBeNull();
  });
});
