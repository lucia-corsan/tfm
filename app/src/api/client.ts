import type {
  ApiErrorCode,
  PlaceSearchResponse,
  RouteCompareRequest,
  RouteCompareResponse,
  RouteRerouteRequest,
} from '@/api/types';
import {
  InvalidApiResponseError,
  parseApiErrorResponse,
  parsePlaceSearchResponse,
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

interface RouteRequestOptions {
  baseUrl?: string;
  fetchImplementation?: typeof fetch;
  signal?: AbortSignal;
}

interface SearchPlacesOptions {
  baseUrl?: string;
  fetchImplementation?: typeof fetch;
  limit?: number;
  signal?: AbortSignal;
}

export async function searchPlaces(
  query: string,
  options: SearchPlacesOptions = {},
): Promise<PlaceSearchResponse> {
  const baseUrl = (options.baseUrl ?? API_BASE_URL).replace(/\/+$/, '');
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const parameters = new URLSearchParams({
    q: query,
    limit: String(options.limit ?? 5),
  });
  let response: Response;

  try {
    response = await fetchImplementation(
      `${baseUrl}/places/search?${parameters.toString()}`,
      {
        headers: { Accept: 'application/json' },
        method: 'GET',
        signal: options.signal,
      },
    );
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
    return parsePlaceSearchResponse(payload);
  } catch (error) {
    if (error instanceof InvalidApiResponseError) {
      throw new RouteApiError('invalid_response', response.status);
    }
    throw error;
  }
}

export async function compareRoutes(
  request: RouteCompareRequest,
  options: RouteRequestOptions = {},
): Promise<RouteCompareResponse> {
  return postRouteRequest('compare', request, options);
}

export async function rerouteRoutes(
  request: RouteRerouteRequest,
  options: RouteRequestOptions = {},
): Promise<RouteCompareResponse> {
  return postRouteRequest('reroute', request, options);
}

async function postRouteRequest(
  operation: 'compare' | 'reroute',
  request: RouteCompareRequest | RouteRerouteRequest,
  options: RouteRequestOptions,
): Promise<RouteCompareResponse> {
  const baseUrl = (options.baseUrl ?? API_BASE_URL).replace(/\/+$/, '');
  const fetchImplementation = options.fetchImplementation ?? fetch;
  let response: Response;

  try {
    response = await fetchImplementation(`${baseUrl}/routes/${operation}`, {
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
