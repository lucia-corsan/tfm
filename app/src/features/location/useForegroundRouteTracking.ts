import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

import type { GeoPoint } from '@/api/types';
import {
  evaluateLocationSample,
  INITIAL_DEVIATION_STATE,
  type DeviationDetectorState,
  type LocationSample,
} from '@/features/location/deviationDetector';

export type ForegroundTrackingStatus =
  | DeviationDetectorState['status']
  | 'gps_inactive'
  | 'requesting_permission'
  | 'permission_denied'
  | 'location_unavailable';

export interface ForegroundRouteTrackingState {
  accuracyM: number | null;
  distanceToRouteM: number | null;
  status: ForegroundTrackingStatus;
}

const INITIAL_TRACKING_STATE: ForegroundRouteTrackingState = {
  accuracyM: null,
  distanceToRouteM: null,
  status: 'gps_inactive',
};

export function useForegroundRouteTracking(
  route: GeoPoint[],
  onReliableSample: (sample: LocationSample) => void,
  enabled: boolean,
): ForegroundRouteTrackingState {
  const [state, setState] = useState(INITIAL_TRACKING_STATE);
  const detectorState = useRef(INITIAL_DEVIATION_STATE);
  const sampleHandler = useRef(onReliableSample);

  useEffect(() => {
    sampleHandler.current = onReliableSample;
  }, [onReliableSample]);

  useEffect(() => {
    if (!enabled) {
      detectorState.current = INITIAL_DEVIATION_STATE;
      return undefined;
    }

    let active = true;
    let subscription: Location.LocationSubscription | undefined;
    detectorState.current = INITIAL_DEVIATION_STATE;

    async function startTracking() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!active) {
          return;
        }
        if (permission.status !== Location.PermissionStatus.GRANTED) {
          setState({
            accuracyM: null,
            distanceToRouteM: null,
            status: 'permission_denied',
          });
          return;
        }
        setState({
          accuracyM: null,
          distanceToRouteM: null,
          status: 'waiting_for_location',
        });
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 3,
            timeInterval: 3_000,
          },
          (location) => {
            if (!active) {
              return;
            }
            const sample: LocationSample = {
              accuracyM: location.coords.accuracy ?? Number.POSITIVE_INFINITY,
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              timestampMs: location.timestamp,
            };
            detectorState.current = evaluateLocationSample(
              detectorState.current,
              sample,
              route,
            );
            if (sample.accuracyM <= 25) {
              sampleHandler.current(sample);
            }
            setState({
              accuracyM: Number.isFinite(sample.accuracyM)
                ? sample.accuracyM
                : null,
              distanceToRouteM: detectorState.current.distanceToRouteM,
              status: detectorState.current.status,
            });
          },
        );
        if (!active) {
          subscription.remove();
        }
      } catch {
        if (active) {
          setState({
            accuracyM: null,
            distanceToRouteM: null,
            status: 'location_unavailable',
          });
        }
      }
    }

    void startTracking();
    return () => {
      active = false;
      subscription?.remove();
    };
  }, [enabled, route]);

  return state;
}
