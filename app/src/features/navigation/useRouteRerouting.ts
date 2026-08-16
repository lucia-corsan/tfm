import { useCallback, useEffect, useRef, useState } from 'react';

import { rerouteRoutes, RouteApiError } from '@/api/client';
import type { RouteApiErrorCode } from '@/api/client';
import type {
  ComparedRoute,
  RouteCompareResponse,
  RouteRerouteRequest,
} from '@/api/types';

export type RerouteRoutesFunction = (
  request: RouteRerouteRequest,
) => Promise<RouteCompareResponse>;

export type ReroutingErrorCode = RouteApiErrorCode | 'no_valid_routes';

export type RouteReroutingState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; response: RouteCompareResponse }
  | { status: 'error'; code: ReroutingErrorCode };

interface RouteReroutingController {
  recalculate: (request: RouteRerouteRequest) => Promise<ComparedRoute | null>;
  reset: () => void;
  state: RouteReroutingState;
}

export function useRouteRerouting(
  reroute: RerouteRoutesFunction = rerouteRoutes,
): RouteReroutingController {
  const [state, setState] = useState<RouteReroutingState>({ status: 'idle' });
  const mounted = useRef(true);
  const requestInProgress = useRef(false);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const reset = useCallback(() => {
    if (!requestInProgress.current) {
      setState({ status: 'idle' });
    }
  }, []);

  const recalculate = useCallback(
    async (request: RouteRerouteRequest): Promise<ComparedRoute | null> => {
      if (requestInProgress.current) {
        return null;
      }
      requestInProgress.current = true;
      setState({ status: 'loading' });
      try {
        const response = await reroute(request);
        if (!mounted.current) {
          return null;
        }
        if (response.routes.length === 0) {
          setState({ code: 'no_valid_routes', status: 'error' });
          return null;
        }
        setState({ response, status: 'success' });
        return response.routes[0];
      } catch (error) {
        if (mounted.current) {
          setState({
            code:
              error instanceof RouteApiError ? error.code : 'invalid_response',
            status: 'error',
          });
        }
        return null;
      } finally {
        requestInProgress.current = false;
      }
    },
    [reroute],
  );

  return { recalculate, reset, state };
}
