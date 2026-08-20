import { useCallback, useRef, useState } from 'react';

import { compareRoutes, RouteApiError } from '@/api/client';
import type { RouteApiErrorCode } from '@/api/client';
import type {
  PlaceResult,
  PreferenceWeights,
  RouteCompareRequest,
  RouteCompareResponse,
} from '@/api/types';
import {
  buildPilotComparisonRequest,
  type DemoProfileId,
} from '@/features/route-comparison/profiles';

export type CompareRoutesFunction = (
  request: RouteCompareRequest,
) => Promise<RouteCompareResponse>;

export type ComparisonState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'success';
      request: RouteCompareRequest;
      response: RouteCompareResponse;
    }
  | { status: 'error'; code: RouteApiErrorCode };

interface RouteComparisonController {
  canCompare: boolean;
  compareSelectedProfile: (effectiveWeights?: PreferenceWeights) => Promise<void>;
  destination: PlaceResult | null;
  origin: PlaceResult | null;
  /** Vuelve al estado inicial para regresar a la pantalla de búsqueda. */
  reset: () => void;
  selectDestination: (place: PlaceResult) => void;
  selectOrigin: (place: PlaceResult) => void;
  selectedProfileId: DemoProfileId;
  selectProfile: (profileId: DemoProfileId) => void;
  state: ComparisonState;
}

export function useRouteComparison(
  compare: CompareRoutesFunction = compareRoutes,
): RouteComparisonController {
  const [selectedProfileId, setSelectedProfileId] =
    useState<DemoProfileId>('balanced_demo');
  const [origin, setOrigin] = useState<PlaceResult | null>(null);
  const [destination, setDestination] = useState<PlaceResult | null>(null);
  const [state, setState] = useState<ComparisonState>({ status: 'idle' });
  const requestVersion = useRef(0);
  const canCompare =
    origin !== null &&
    destination !== null &&
    origin.place_id !== destination.place_id;

  const resetComparison = useCallback(() => {
    requestVersion.current += 1;
    setState({ status: 'idle' });
  }, []);

  const selectProfile = useCallback((profileId: DemoProfileId) => {
    setSelectedProfileId(profileId);
    resetComparison();
  }, [resetComparison]);

  const selectOrigin = useCallback((place: PlaceResult) => {
    setOrigin(place);
    resetComparison();
  }, [resetComparison]);

  const selectDestination = useCallback((place: PlaceResult) => {
    setDestination(place);
    resetComparison();
  }, [resetComparison]);

  const compareSelectedProfile = useCallback(async (
    effectiveWeights?: PreferenceWeights,
  ) => {
    if (!canCompare || origin === null || destination === null) {
      return;
    }
    const currentVersion = requestVersion.current + 1;
    requestVersion.current = currentVersion;
    setState({ status: 'loading' });

    try {
      const request = buildPilotComparisonRequest(
        selectedProfileId,
        origin.location,
        destination.location,
        effectiveWeights,
      );
      const response = await compare(request);
      if (requestVersion.current === currentVersion) {
        setState({ request, response, status: 'success' });
      }
    } catch (error) {
      if (requestVersion.current !== currentVersion) {
        return;
      }
      setState({
        code: error instanceof RouteApiError ? error.code : 'invalid_response',
        status: 'error',
      });
    }
  }, [canCompare, compare, destination, origin, selectedProfileId]);

  return {
    canCompare,
    compareSelectedProfile,
    destination,
    origin,
    reset: resetComparison,
    selectDestination,
    selectOrigin,
    selectedProfileId,
    selectProfile,
    state,
  };
}
