import { act, renderHook } from '@testing-library/react-native';

import { RouteApiError } from '@/api/client';
import type { RouteCompareResponse } from '@/api/types';
import { useRouteComparison } from '@/features/route-comparison/useRouteComparison';

function successfulResponse(profileId = 'balanced_demo'): RouteCompareResponse {
  return {
    scenario_id: 'moncloa_principe_pio',
    scenario_name: 'Moncloa a Príncipe Pío',
    origin: { latitude: 40.4353, longitude: -3.7191 },
    destination: { latitude: 40.4211, longitude: -3.7206 },
    profile_id: profileId,
    routes: [],
    rejected_routes: [],
  };
}

describe('route comparison state', () => {
  test('loads the selected profile and exposes a successful result', async () => {
    const compare = jest.fn().mockResolvedValue(successfulResponse());
    const { result } = await renderHook(() => useRouteComparison(compare));

    await act(async () => {
      await result.current.compareSelectedProfile();
    });

    expect(compare).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: expect.objectContaining({ profile_id: 'balanced_demo' }),
      }),
    );
    expect(result.current.state.status).toBe('success');
  });

  test('clears an old result when the profile changes', async () => {
    const compare = jest.fn().mockResolvedValue(successfulResponse());
    const { result } = await renderHook(() => useRouteComparison(compare));

    await act(async () => {
      await result.current.compareSelectedProfile();
    });
    await act(() => result.current.selectProfile('simpler_crossings_demo'));

    expect(result.current.selectedProfileId).toBe('simpler_crossings_demo');
    expect(result.current.state).toEqual({ status: 'idle' });
  });

  test('exposes a stable error code instead of technical network details', async () => {
    const compare = jest.fn().mockRejectedValue(new RouteApiError('network_error'));
    const { result } = await renderHook(() => useRouteComparison(compare));

    await act(async () => {
      await result.current.compareSelectedProfile();
    });

    expect(result.current.state).toEqual({
      code: 'network_error',
      status: 'error',
    });
  });

  test('ignores an obsolete response after the profile changes', async () => {
    let resolveRequest: ((response: RouteCompareResponse) => void) | undefined;
    const compare = jest.fn(
      () =>
        new Promise<RouteCompareResponse>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const { result } = await renderHook(() => useRouteComparison(compare));

    let pendingRequest!: Promise<void>;
    await act(async () => {
      pendingRequest = result.current.compareSelectedProfile();
      await Promise.resolve();
    });
    await act(() => result.current.selectProfile('simpler_crossings_demo'));
    await act(async () => {
      resolveRequest?.(successfulResponse());
      await pendingRequest;
    });

    expect(result.current.state).toEqual({ status: 'idle' });
  });

  test('sends the selected origin and destination to the comparison', async () => {
    const compare = jest.fn().mockResolvedValue(successfulResponse());
    const { result } = await renderHook(() => useRouteComparison(compare));

    await act(() => {
      result.current.selectOrigin({
        place_id: 'arguelles',
        name: 'Argüelles',
        description: 'Entorno de la estación de Argüelles.',
        location: { latitude: 40.4304497, longitude: -3.7155854 },
        source: 'pilot_catalog',
      });
    });
    await act(async () => {
      await result.current.compareSelectedProfile();
    });

    expect(compare).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: { latitude: 40.4304497, longitude: -3.7155854 },
        destination: { latitude: 40.4211, longitude: -3.7206 },
      }),
    );
  });

  test('does not compare when origin and destination are the same place', async () => {
    const compare = jest.fn();
    const { result } = await renderHook(() => useRouteComparison(compare));

    await act(() => result.current.selectOrigin(result.current.destination));
    await act(async () => {
      await result.current.compareSelectedProfile();
    });

    expect(result.current.canCompare).toBe(false);
    expect(compare).not.toHaveBeenCalled();
  });
});
