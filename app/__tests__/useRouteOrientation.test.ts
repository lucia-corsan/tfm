import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

import {
  ORIENTATION_CHECK_TIMEOUT_MS,
  useRouteOrientation,
} from '@/features/orientation/useRouteOrientation';

jest.mock('expo-location', () => ({
  watchHeadingAsync: jest.fn(),
}));

const watchHeading = jest.mocked(Location.watchHeadingAsync);

describe('route orientation observer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('observes only after a request and stops after three stable readings', async () => {
    let listener!: Location.LocationHeadingCallback;
    const remove = jest.fn();
    const onResult = jest.fn();
    watchHeading.mockImplementation(async (callback) => {
      listener = callback;
      return { remove };
    });
    const { result } = await renderHook(() =>
      useRouteOrientation({
        desiredHeadingDeg: 0,
        instructionKey: 'route:1',
        onResult,
      }),
    );

    expect(watchHeading).not.toHaveBeenCalled();
    await act(async () => result.current.check());
    expect(result.current.status).toBe('checking');

    await act(async () => {
      listener({ accuracy: 3, magHeading: 2, trueHeading: 2 });
      listener({ accuracy: 3, magHeading: 359, trueHeading: 359 });
      listener({ accuracy: 3, magHeading: 1, trueHeading: 1 });
    });

    expect(result.current.status).toBe('aligned');
    expect(onResult).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'aligned' }),
    );
    expect(remove).toHaveBeenCalledTimes(1);
  });

  test('reports low accuracy after the bounded observation period', async () => {
    jest.useFakeTimers();
    let listener!: Location.LocationHeadingCallback;
    const onResult = jest.fn();
    watchHeading.mockImplementation(async (callback) => {
      listener = callback;
      return { remove: jest.fn() };
    });
    const { result } = await renderHook(() =>
      useRouteOrientation({
        desiredHeadingDeg: 0,
        instructionKey: 'route:1',
        onResult,
      }),
    );
    await act(async () => result.current.check());
    await act(async () => {
      listener({ accuracy: 1, magHeading: 0, trueHeading: -1 });
      jest.advanceTimersByTime(ORIENTATION_CHECK_TIMEOUT_MS);
    });

    await waitFor(() => expect(result.current.status).toBe('low_accuracy'));
    expect(onResult).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'low_accuracy' }),
    );
    jest.useRealTimers();
  });

  test('does not start the sensor when the route has no following direction', async () => {
    const onResult = jest.fn();
    const { result } = await renderHook(() =>
      useRouteOrientation({
        desiredHeadingDeg: null,
        instructionKey: 'route:last',
        onResult,
      }),
    );

    await act(async () => result.current.check());
    expect(result.current.status).toBe('no_route_direction');
    expect(watchHeading).not.toHaveBeenCalled();
  });

  test('removes an active observer when the instruction changes', async () => {
    const remove = jest.fn();
    watchHeading.mockResolvedValue({ remove });
    const onResult = jest.fn();
    const { result, rerender } = await renderHook(
      ({ instructionKey }: { instructionKey: string }) =>
        useRouteOrientation({
          desiredHeadingDeg: 0,
          instructionKey,
          onResult,
        }),
      {
        initialProps: { instructionKey: 'route:1' } as {
          instructionKey: string;
        },
      },
    );
    await act(async () => result.current.check());
    await act(async () => rerender({ instructionKey: 'route:2' }));

    expect(remove).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('idle');
  });
});
