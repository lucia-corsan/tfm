import { act, renderHook } from '@testing-library/react-native';

import { RouteApiError } from '@/api/client';
import type { MobilityProfile, RouteCompareResponse } from '@/api/types';
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

/** El flujo empieza sin lugares: las pruebas eligen los suyos. */
const ORIGIN_PLACE = {
  place_id: 'moncloa',
  name: 'Moncloa',
  description: 'Intercambiador y entorno de la plaza de Moncloa.',
  location: { latitude: 40.4353, longitude: -3.7191 },
  source: 'pilot_catalog' as const,
};

const DESTINATION_PLACE = {
  place_id: 'principe_pio',
  name: 'Príncipe Pío',
  description: 'Intercambiador y entorno de la estación de Príncipe Pío.',
  location: { latitude: 40.4211, longitude: -3.7206 },
  source: 'pilot_catalog' as const,
};

/** Deja el controlador con un trayecto elegido y comparable. */
async function chooseJourney(
  result: { current: ReturnType<typeof useRouteComparison> },
): Promise<void> {
  await act(() => result.current.selectOrigin(ORIGIN_PLACE));
  await act(() => result.current.selectDestination(DESTINATION_PLACE));
}

describe('route comparison state', () => {
  test('loads the selected profile and exposes a successful result', async () => {
    const compare = jest.fn().mockResolvedValue(successfulResponse());
    const { result } = await renderHook(() => useRouteComparison(compare));

    await chooseJourney(result);

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

  test('sends effective weights separately from the declared profile', async () => {
    const compare = jest.fn().mockResolvedValue(successfulResponse());
    const { result } = await renderHook(() => useRouteComparison(compare));
    const effectiveWeights = {
      distance: 1,
      complex_crossings: 0,
      crossing_support: 0,
      sidewalk_evidence: 0,
      steps: 0,
      surface: 0,
      orientation_complexity: 0,
      slope: 0,
      uncertainty: 0,
    };

    await chooseJourney(result);

    await act(async () => {
      await result.current.compareSelectedProfile(effectiveWeights);
    });

    expect(compare).toHaveBeenCalledWith(
      expect.objectContaining({
        effective_weights: effectiveWeights,
        profile: expect.objectContaining({
          declared_weights: expect.objectContaining({
            distance: 1,
            complex_crossings: 1,
          }),
        }),
      }),
    );
  });

  test('uses the questionnaire profile instead of a demonstration profile', async () => {
    const compare = jest
      .fn()
      .mockResolvedValue(successfulResponse('onboarding_profile'));
    const profile: MobilityProfile = {
      avoid_incompatible_crossings: true,
      avoid_steps: false,
      declared_weights: {
        complex_crossings: 3,
        crossing_support: 1,
        distance: 0,
        orientation_complexity: 2,
        sidewalk_evidence: 2,
        slope: 1,
        steps: 3,
        surface: 2,
        uncertainty: 3,
      },
      maximum_detour_ratio: 1.25,
      maximum_slope_percent: null,
      profile_id: 'onboarding_profile',
      require_pedestrian_access: true,
    };
    const { result } = await renderHook(() =>
      useRouteComparison(compare, profile),
    );

    await chooseJourney(result);
    await act(async () => {
      await result.current.compareSelectedProfile();
    });

    expect(compare).toHaveBeenCalledWith(
      expect.objectContaining({ profile }),
    );
  });

  test('clears an old result when the profile changes', async () => {
    const compare = jest.fn().mockResolvedValue(successfulResponse());
    const { result } = await renderHook(() => useRouteComparison(compare));

    await chooseJourney(result);

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

    await chooseJourney(result);

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
    await act(() => result.current.selectDestination(DESTINATION_PLACE));
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

    await chooseJourney(result);
    await act(() => result.current.selectOrigin(DESTINATION_PLACE));
    await act(async () => {
      await result.current.compareSelectedProfile();
    });

    expect(result.current.canCompare).toBe(false);
    expect(compare).not.toHaveBeenCalled();
  });
});
