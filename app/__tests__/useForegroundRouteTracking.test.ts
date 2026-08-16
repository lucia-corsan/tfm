import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { useForegroundRouteTracking } from '@/features/location/useForegroundRouteTracking';

jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  PermissionStatus: { GRANTED: 'granted' },
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

const requestPermission = jest.mocked(
  Location.requestForegroundPermissionsAsync,
);
const watchPosition = jest.mocked(Location.watchPositionAsync);
const route = [
  { latitude: 40.43, longitude: -3.72 },
  { latitude: 40.431, longitude: -3.72 },
];

describe('foreground route tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does not request location permission until GPS is explicitly enabled', async () => {
    const { result } = await renderHook(() =>
      useForegroundRouteTracking(route, jest.fn(), false),
    );

    expect(result.current.status).toBe('gps_inactive');
    expect(requestPermission).not.toHaveBeenCalled();
    expect(watchPosition).not.toHaveBeenCalled();
  });

  test('keeps manual navigation available when permission is denied', async () => {
    requestPermission.mockResolvedValue({ status: 'denied' } as never);
    const { result } = await renderHook(() =>
      useForegroundRouteTracking(route, jest.fn(), true),
    );

    await waitFor(() => expect(result.current.status).toBe('permission_denied'));
    expect(watchPosition).not.toHaveBeenCalled();
  });

  test('starts one foreground observer and removes it on unmount', async () => {
    const remove = jest.fn();
    requestPermission.mockResolvedValue({ status: 'granted' } as never);
    watchPosition.mockResolvedValue({ remove } as never);
    const { unmount } = await renderHook(() =>
      useForegroundRouteTracking(route, jest.fn(), true),
    );

    await waitFor(() => expect(watchPosition).toHaveBeenCalledTimes(1));
    await act(async () => {
      unmount();
    });
    expect(remove).toHaveBeenCalledTimes(1);
  });

  test('forwards only reliable samples and exposes on-route state', async () => {
    let listener!: Location.LocationCallback;
    const onReliableSample = jest.fn();
    requestPermission.mockResolvedValue({ status: 'granted' } as never);
    watchPosition.mockImplementation(async (_options, callback) => {
      listener = callback;
      return { remove: jest.fn() } as never;
    });
    const { result } = await renderHook(() =>
      useForegroundRouteTracking(route, onReliableSample, true),
    );
    await waitFor(() => expect(watchPosition).toHaveBeenCalled());

    await act(async () => {
      listener({
        coords: {
          accuracy: 5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: 40.4305,
          longitude: -3.72,
          speed: null,
        },
        mocked: true,
        timestamp: 1_000,
      });
    });

    expect(result.current.status).toBe('on_route');
    expect(onReliableSample).toHaveBeenCalledTimes(1);
    expect(result.current.latestReliablePosition).toEqual({
      latitude: 40.4305,
      longitude: -3.72,
    });
  });

  test('does not forward a sample with accuracy worse than 25 metres', async () => {
    let listener!: Location.LocationCallback;
    const onReliableSample = jest.fn();
    requestPermission.mockResolvedValue({ status: 'granted' } as never);
    watchPosition.mockImplementation(async (_options, callback) => {
      listener = callback;
      return { remove: jest.fn() } as never;
    });
    const { result } = await renderHook(() =>
      useForegroundRouteTracking(route, onReliableSample, true),
    );
    await waitFor(() => expect(watchPosition).toHaveBeenCalled());

    await act(async () => {
      listener({
        coords: {
          accuracy: 40,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: 40.4305,
          longitude: -3.72,
          speed: null,
        },
        mocked: true,
        timestamp: 1_000,
      });
    });

    expect(result.current.status).toBe('poor_accuracy');
    expect(onReliableSample).not.toHaveBeenCalled();
  });

  test('pauses deviation decisions during rerouting and resets after rejection', async () => {
    requestPermission.mockResolvedValue({ status: 'granted' } as never);
    watchPosition.mockResolvedValue({ remove: jest.fn() } as never);
    const { result } = await renderHook(() =>
      useForegroundRouteTracking(route, jest.fn(), true),
    );
    await waitFor(() => expect(watchPosition).toHaveBeenCalled());

    await act(async () => result.current.pauseForReroute());
    expect(result.current.status).toBe('reroute_in_progress');

    await act(async () => result.current.resetDeviationEvidence());
    expect(result.current.status).toBe('waiting_for_location');
  });

  test('suppresses deviation alerts during the minute after a valid reroute', async () => {
    let listener!: Location.LocationCallback;
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    requestPermission.mockResolvedValue({ status: 'granted' } as never);
    watchPosition.mockImplementation(async (_options, callback) => {
      listener = callback;
      return { remove: jest.fn() } as never;
    });
    const { result } = await renderHook(() =>
      useForegroundRouteTracking(route, jest.fn(), true),
    );
    await waitFor(() => expect(watchPosition).toHaveBeenCalled());

    await act(async () => result.current.startRerouteCooldown());
    await act(async () => {
      listener({
        coords: {
          accuracy: 5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: 40.44,
          longitude: -3.71,
          speed: null,
        },
        mocked: true,
        timestamp: 2_000,
      });
    });

    expect(result.current.status).toBe('reroute_cooldown');

    now.mockReturnValue(61_001);
    await act(async () => {
      listener({
        coords: {
          accuracy: 5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: 40.4305,
          longitude: -3.72,
          speed: null,
        },
        mocked: true,
        timestamp: 62_000,
      });
    });

    expect(result.current.status).toBe('on_route');
    now.mockRestore();
  });
});
