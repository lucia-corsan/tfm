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
  | 'location_unavailable'
  | 'reroute_in_progress'
  | 'reroute_cooldown';

export interface ForegroundRouteTrackingState {
  accuracyM: number | null;
  distanceToRouteM: number | null;
  latestReliablePosition: GeoPoint | null;
  status: ForegroundTrackingStatus;
}

export interface ForegroundRouteTrackingController
  extends ForegroundRouteTrackingState {
  pauseForReroute: () => void;
  resetDeviationEvidence: () => void;
  startRerouteCooldown: () => void;
}

export const REROUTE_COOLDOWN_MS = 60_000;

const INITIAL_TRACKING_STATE: ForegroundRouteTrackingState = {
  accuracyM: null,
  distanceToRouteM: null,
  latestReliablePosition: null,
  status: 'gps_inactive',
};

export function useForegroundRouteTracking(
  route: GeoPoint[],
  onReliableSample: (sample: LocationSample) => void,
  enabled: boolean,
): ForegroundRouteTrackingController {
  const [state, setState] = useState(INITIAL_TRACKING_STATE);
  const detectorState = useRef(INITIAL_DEVIATION_STATE);
  const detectionPaused = useRef(false);
  const cooldownUntilMs = useRef(0);
  const routeHandler = useRef(route);
  const sampleHandler = useRef(onReliableSample);

  useEffect(() => {
    routeHandler.current = route;
  }, [route]);

  useEffect(() => {
    sampleHandler.current = onReliableSample;
  }, [onReliableSample]);

  useEffect(() => {
    if (!enabled) {
      detectorState.current = INITIAL_DEVIATION_STATE;
      detectionPaused.current = false;
      cooldownUntilMs.current = 0;
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
            latestReliablePosition: null,
            status: 'permission_denied',
          });
          return;
        }
        setState({
          accuracyM: null,
          distanceToRouteM: null,
          latestReliablePosition: null,
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
            const isReliable = sample.accuracyM <= 25;
            if (isReliable) {
              sampleHandler.current(sample);
            }
            if (detectionPaused.current) {
              setState((previous) => ({
                accuracyM: Number.isFinite(sample.accuracyM)
                  ? sample.accuracyM
                  : null,
                distanceToRouteM: previous.distanceToRouteM,
                latestReliablePosition: isReliable
                  ? {
                      latitude: sample.latitude,
                      longitude: sample.longitude,
                    }
                  : previous.latestReliablePosition,
                status: 'reroute_in_progress',
              }));
              return;
            }
            if (Date.now() < cooldownUntilMs.current) {
              detectorState.current = INITIAL_DEVIATION_STATE;
              setState((previous) => ({
                accuracyM: Number.isFinite(sample.accuracyM)
                  ? sample.accuracyM
                  : null,
                distanceToRouteM: null,
                latestReliablePosition: isReliable
                  ? {
                      latitude: sample.latitude,
                      longitude: sample.longitude,
                    }
                  : previous.latestReliablePosition,
                status: 'reroute_cooldown',
              }));
              return;
            }
            detectorState.current = evaluateLocationSample(
              detectorState.current,
              sample,
              routeHandler.current,
            );
            setState((previous) => ({
              accuracyM: Number.isFinite(sample.accuracyM)
                ? sample.accuracyM
                : null,
              distanceToRouteM: detectorState.current.distanceToRouteM,
              latestReliablePosition: isReliable
                ? {
                    latitude: sample.latitude,
                    longitude: sample.longitude,
                  }
                : previous.latestReliablePosition,
              status: detectorState.current.status,
            }));
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
            latestReliablePosition: null,
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
  }, [enabled]);

  const pauseForReroute = () => {
    detectionPaused.current = true;
    detectorState.current = INITIAL_DEVIATION_STATE;
    setState((previous) => ({
      ...previous,
      status: 'reroute_in_progress',
    }));
  };

  const resetDeviationEvidence = () => {
    detectionPaused.current = false;
    cooldownUntilMs.current = 0;
    detectorState.current = INITIAL_DEVIATION_STATE;
    setState((previous) => ({
      ...previous,
      status: previous.latestReliablePosition
        ? 'possible_deviation'
        : 'waiting_for_location',
    }));
  };

  const startRerouteCooldown = () => {
    detectionPaused.current = false;
    cooldownUntilMs.current = Date.now() + REROUTE_COOLDOWN_MS;
    detectorState.current = INITIAL_DEVIATION_STATE;
    setState((previous) => ({
      ...previous,
      distanceToRouteM: null,
      status: 'reroute_cooldown',
    }));
  };

  return {
    ...state,
    pauseForReroute,
    resetDeviationEvidence,
    startRerouteCooldown,
  };
}
