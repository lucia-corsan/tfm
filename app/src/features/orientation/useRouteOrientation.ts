import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

import {
  evaluateStableHeading,
  type HeadingSample,
  type RouteOrientationResult,
} from '@/features/orientation/routeOrientation';

export const ORIENTATION_CHECK_TIMEOUT_MS = 8_000;

export type RouteOrientationStatus =
  | 'idle'
  | 'checking'
  | 'aligned'
  | 'adjust_left'
  | 'adjust_right'
  | 'clearly_off_left'
  | 'clearly_off_right'
  | 'low_accuracy'
  | 'unavailable'
  | 'no_route_direction';

export interface RouteOrientationState {
  instructionKey: string;
  result: RouteOrientationResult | null;
  status: RouteOrientationStatus;
}

interface UseRouteOrientationOptions {
  desiredHeadingDeg: number | null;
  instructionKey: string;
  onResult: (state: RouteOrientationState) => void;
}

interface RouteOrientationController extends RouteOrientationState {
  check: () => Promise<void>;
}

const IDLE_STATE: RouteOrientationState = {
  instructionKey: '',
  result: null,
  status: 'idle',
};

/** Observa la brújula solo durante una comprobación solicitada por la persona. */
export function useRouteOrientation({
  desiredHeadingDeg,
  instructionKey,
  onResult,
}: UseRouteOrientationOptions): RouteOrientationController {
  const [storedState, setStoredState] = useState(IDLE_STATE);
  const active = useRef(true);
  const requestId = useRef(0);
  const resultHandler = useRef(onResult);
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    resultHandler.current = onResult;
  }, [onResult]);

  const stopObservation = useCallback(() => {
    subscription.current?.remove();
    subscription.current = null;
    if (timeout.current !== null) {
      clearTimeout(timeout.current);
      timeout.current = null;
    }
  }, []);

  useEffect(() => {
    requestId.current += 1;
    stopObservation();
  }, [instructionKey, stopObservation]);

  useEffect(
    () => () => {
      active.current = false;
      requestId.current += 1;
      stopObservation();
    },
    [stopObservation],
  );

  const complete = useCallback(
    (nextState: RouteOrientationState) => {
      requestId.current += 1;
      stopObservation();
      if (!active.current) {
        return;
      }
      setStoredState(nextState);
      resultHandler.current(nextState);
    },
    [stopObservation],
  );

  const check = useCallback(async () => {
    stopObservation();
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    if (desiredHeadingDeg === null) {
      complete({
        instructionKey,
        result: null,
        status: 'no_route_direction',
      });
      return;
    }

    setStoredState({ instructionKey, result: null, status: 'checking' });
    const samples: HeadingSample[] = [];
    let receivedHeading = false;
    timeout.current = setTimeout(() => {
      if (active.current && requestId.current === currentRequest) {
        complete({
          instructionKey,
          result: null,
          status: receivedHeading ? 'low_accuracy' : 'unavailable',
        });
      }
    }, ORIENTATION_CHECK_TIMEOUT_MS);

    try {
      const nextSubscription = await Location.watchHeadingAsync((heading) => {
        if (!active.current || requestId.current !== currentRequest) {
          return;
        }
        receivedHeading = true;
        const headingDeg =
          heading.trueHeading >= 0 ? heading.trueHeading : heading.magHeading;
        samples.push({ accuracy: heading.accuracy, headingDeg });
        const result = evaluateStableHeading(samples, desiredHeadingDeg);
        if (result !== null) {
          complete({
            instructionKey,
            result,
            status: result.classification,
          });
        }
      });
      if (!active.current || requestId.current !== currentRequest) {
        nextSubscription.remove();
        return;
      }
      subscription.current = nextSubscription;
    } catch {
      if (active.current && requestId.current === currentRequest) {
        complete({
          instructionKey,
          result: null,
          status: 'unavailable',
        });
      }
    }
  }, [complete, desiredHeadingDeg, instructionKey, stopObservation]);

  const visibleState =
    storedState.instructionKey === instructionKey ? storedState : IDLE_STATE;
  return { ...visibleState, check };
}
