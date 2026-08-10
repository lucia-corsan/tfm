import { useCallback, useRef, useState } from 'react';

import { compareRoutes, RouteApiError } from '@/api/client';
import type { RouteApiErrorCode } from '@/api/client';
import type { RouteCompareRequest, RouteCompareResponse } from '@/api/types';
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
  | { status: 'success'; response: RouteCompareResponse }
  | { status: 'error'; code: RouteApiErrorCode };

interface RouteComparisonController {
  compareSelectedProfile: () => Promise<void>;
  selectedProfileId: DemoProfileId;
  selectProfile: (profileId: DemoProfileId) => void;
  state: ComparisonState;
}

export function useRouteComparison(
  compare: CompareRoutesFunction = compareRoutes,
): RouteComparisonController {
  const [selectedProfileId, setSelectedProfileId] =
    useState<DemoProfileId>('balanced_demo');
  const [state, setState] = useState<ComparisonState>({ status: 'idle' });
  const requestVersion = useRef(0);

  const selectProfile = useCallback((profileId: DemoProfileId) => {
    requestVersion.current += 1;
    setSelectedProfileId(profileId);
    setState({ status: 'idle' });
  }, []);

  const compareSelectedProfile = useCallback(async () => {
    const currentVersion = requestVersion.current + 1;
    requestVersion.current = currentVersion;
    setState({ status: 'loading' });

    try {
      const response = await compare(buildPilotComparisonRequest(selectedProfileId));
      if (requestVersion.current === currentVersion) {
        setState({ response, status: 'success' });
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
  }, [compare, selectedProfileId]);

  return {
    compareSelectedProfile,
    selectedProfileId,
    selectProfile,
    state,
  };
}
