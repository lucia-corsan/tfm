import { act, renderHook } from '@testing-library/react-native';

import type { ComparedRoute } from '@/api/types';
import { useManualNavigation } from '@/features/navigation/useManualNavigation';

const route = {
  instructions: [
    {
      sequence: 1,
      location: { latitude: 40.43, longitude: -3.72 },
    },
    {
      sequence: 2,
      location: { latitude: 40.4305, longitude: -3.72 },
    },
    {
      sequence: 3,
      location: { latitude: 40.431, longitude: -3.72 },
    },
  ],
} as ComparedRoute;

describe('automatic navigation progress', () => {
  test('advances once when a precise sample reaches the next maneuver', async () => {
    const { result } = await renderHook(() => useManualNavigation(route));

    await act(async () => {
      result.current.handleReliableLocation({
        accuracyM: 5,
        latitude: 40.4305,
        longitude: -3.72,
        timestampMs: 1_000,
      });
    });

    expect(result.current.currentIndex).toBe(1);
  });

  test('does not advance with accuracy worse than fifteen metres', async () => {
    const { result } = await renderHook(() => useManualNavigation(route));

    await act(async () => {
      result.current.handleReliableLocation({
        accuracyM: 20,
        latitude: 40.4305,
        longitude: -3.72,
        timestampMs: 1_000,
      });
    });

    expect(result.current.currentIndex).toBe(0);
  });

  test('does not skip to a later instruction in one measurement', async () => {
    const repeatedLocationRoute = {
      ...route,
      instructions: route.instructions.map((instruction, index) => ({
        ...instruction,
        location:
          index === 0
            ? instruction.location
            : { latitude: 40.4305, longitude: -3.72 },
      })),
    } as ComparedRoute;
    const { result } = await renderHook(() =>
      useManualNavigation(repeatedLocationRoute),
    );

    await act(async () => {
      result.current.handleReliableLocation({
        accuracyM: 5,
        latitude: 40.4305,
        longitude: -3.72,
        timestampMs: 1_000,
      });
    });

    expect(result.current.currentIndex).toBe(1);
  });
});
