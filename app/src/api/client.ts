import type {
  ApiErrorCode,
  RouteCompareRequest,
  RouteCompareResponse,
} from '@/api/types';
import {
  InvalidApiResponseError,
  parseApiErrorResponse,
  parseRouteCompareResponse,
} from '@/api/validation';
import { API_BASE_URL } from '@/config/environment';

export type RouteApiErrorCode = ApiErrorCode | 'invalid_response' | 'network_error';

export class RouteApiError extends Error {
  constructor(
    public readonly code: RouteApiErrorCode,
    public readonly status: number | null = null,
  ) {
    super(code);
    this.name = 'RouteApiError';
  }
}

interface CompareRoutesOptions {
  baseUrl?: string;
  fetchImplementation?: typeof fetch;
  signal?: AbortSignal;
}

export async function compareRoutes(
  request: RouteCompareRequest,
  options: CompareRoutesOptions = {},
): Promise<RouteCompareResponse> {
  const baseUrl = (options.baseUrl ?? API_BASE_URL).replace(/\/+$/, '');
  const fetchImplementation = options.fetchImplementation ?? fetch;
  let response: Response;

  try {
    response = await fetchImplementation(`${baseUrl}/routes/compare`, {
      body: JSON.stringify(request),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: options.signal,
    });
  } catch {
    throw new RouteApiError('network_error');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new RouteApiError('invalid_response', response.status);
  }

  if (!response.ok) {
    try {
      const error = parseApiErrorResponse(payload);
      throw new RouteApiError(error.code, response.status);
    } catch (error) {
      if (error instanceof RouteApiError) {
        throw error;
      }
      throw new RouteApiError('invalid_response', response.status);
    }
  }

  try {
    return parseRouteCompareResponse(payload);
  } catch (error) {
    if (error instanceof InvalidApiResponseError) {
      throw new RouteApiError('invalid_response', response.status);
    }
    throw error;
  }
}
