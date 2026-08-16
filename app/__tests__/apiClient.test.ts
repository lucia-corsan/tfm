import {
  compareRoutes,
  rerouteRoutes,
  RouteApiError,
  searchPlaces,
} from '@/api/client';
import type { RouteCompareRequest, RouteRerouteRequest } from '@/api/types';

const request: RouteCompareRequest = {
  origin: { latitude: 40.4353, longitude: -3.7191 },
  destination: { latitude: 40.4211, longitude: -3.7206 },
  profile: {
    profile_id: 'balanced_demo',
    avoid_steps: true,
    require_pedestrian_access: true,
    avoid_incompatible_crossings: true,
    maximum_slope_percent: null,
    maximum_detour_ratio: 1.5,
    declared_weights: {
      distance: 1,
      complex_crossings: 1,
      crossing_support: 1,
      sidewalk_evidence: 1,
      steps: 1,
      surface: 1,
      orientation_complexity: 1,
      slope: 1,
      uncertainty: 1,
    },
  },
};

const weights = {
  distance: 1 / 9,
  complex_crossings: 1 / 9,
  crossing_support: 1 / 9,
  sidewalk_evidence: 1 / 9,
  steps: 1 / 9,
  surface: 1 / 9,
  orientation_complexity: 1 / 9,
  slope: 1 / 9,
  uncertainty: 1 / 9,
};

const contributions = {
  distance: 0.02,
  complex_crossings: 0.03,
  crossing_support: 0.02,
  sidewalk_evidence: 0.02,
  steps: 0.02,
  surface: 0.02,
  orientation_complexity: 0.03,
  slope: 0.04,
  uncertainty: 0,
};

function validResponse() {
  return {
    scenario_id: 'moncloa_principe_pio',
    scenario_name: 'Moncloa a Príncipe Pío',
    origin: request.origin,
    destination: request.destination,
    profile_id: request.profile.profile_id,
    routes: [
      {
        route_id: 'balanced_route',
        name: 'Alternativa equilibrada',
        rank: 1,
        category: 'balanced',
        source: 'fixture',
        is_synthetic: true,
        geometry: [request.origin, request.destination],
        distance_m: 1810,
        duration_s: 1470,
        instructions: [
          {
            sequence: 1,
            maneuver: 'depart',
            text: 'Empieza el recorrido.',
            street_name: null,
            distance_m: 1810,
            duration_s: 1470,
            geometry_index: 0,
            location: request.origin,
            accessibility_events: [],
          },
        ],
        score: {
          route_id: 'balanced_route',
          normalized_weights: weights,
          costs: weights,
          contributions,
          confidence: 0.75,
          uncertainty: 0,
          total_cost: 0.2,
          adequacy: 0.8,
        },
        reasons: [
          {
            kind: 'relative_advantage',
            dimension: 'distance',
            cost: 0.04,
            contribution: 0.004,
            comparison_cost: 0.09,
          },
        ],
        warnings: [],
      },
    ],
    rejected_routes: [],
  };
}

function mockedResponse(payload: unknown, status = 200): Response {
  return {
    json: jest.fn().mockResolvedValue(payload),
    ok: status >= 200 && status < 300,
    status,
  } as unknown as Response;
}

describe('route comparison API client', () => {
  test('posts the profile and returns a validated comparison', async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockedResponse(validResponse()));

    const result = await compareRoutes(request, {
      baseUrl: 'http://10.0.2.2:8000/api/v1/',
      fetchImplementation: fetchMock as typeof fetch,
    });

    expect(result.routes[0].route_id).toBe('balanced_route');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://10.0.2.2:8000/api/v1/routes/compare',
      expect.objectContaining({
        body: JSON.stringify(request),
        method: 'POST',
      }),
    );
  });

  test('preserves a documented backend error code', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(mockedResponse({ code: 'invalid_request' }, 422));

    await expect(
      compareRoutes(request, { fetchImplementation: fetchMock as typeof fetch }),
    ).rejects.toMatchObject({ code: 'invalid_request', status: 422 });
  });

  test('turns an incompatible success payload into a controlled error', async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockedResponse({ routes: [] }));

    await expect(
      compareRoutes(request, { fetchImplementation: fetchMock as typeof fetch }),
    ).rejects.toEqual(expect.any(RouteApiError));
    await expect(
      compareRoutes(request, { fetchImplementation: fetchMock as typeof fetch }),
    ).rejects.toMatchObject({ code: 'invalid_response' });
  });

  test('turns a network failure into a controlled error without technical details', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('192.168.0.23 refused'));

    await expect(
      compareRoutes(request, { fetchImplementation: fetchMock as typeof fetch }),
    ).rejects.toMatchObject({ code: 'network_error', status: null });
  });
});

describe('route rerouting API client', () => {
  const rerouteRequest: RouteRerouteRequest = {
    current_position: request.origin,
    destination: request.destination,
    profile: request.profile,
  };

  test('posts the confirmed position and validates the complete response', async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockedResponse(validResponse()));

    const result = await rerouteRoutes(rerouteRequest, {
      baseUrl: 'http://10.0.2.2:8000/api/v1/',
      fetchImplementation: fetchMock as typeof fetch,
    });

    expect(result.routes[0].route_id).toBe('balanced_route');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://10.0.2.2:8000/api/v1/routes/reroute',
      expect.objectContaining({
        body: JSON.stringify(rerouteRequest),
        method: 'POST',
      }),
    );
  });

  test('turns a rerouting network failure into a controlled error', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('private URL'));

    await expect(
      rerouteRoutes(rerouteRequest, {
        fetchImplementation: fetchMock as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: 'network_error', status: null });
  });
});

describe('place-search API client', () => {
  test('encodes the query and validates the returned places', async () => {
    const payload = {
      places: [
        {
          place_id: 'principe_pio',
          name: 'Príncipe Pío',
          description: 'Intercambiador y entorno de la estación de Príncipe Pío.',
          location: { latitude: 40.4211, longitude: -3.7206 },
          source: 'pilot_catalog',
        },
      ],
    };
    const fetchMock = jest.fn().mockResolvedValue(mockedResponse(payload));

    const result = await searchPlaces('Príncipe Pío', {
      baseUrl: 'http://10.0.2.2:8000/api/v1/',
      fetchImplementation: fetchMock as typeof fetch,
      limit: 3,
    });

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://10.0.2.2:8000/api/v1/places/search?q=Pr%C3%ADncipe+P%C3%ADo&limit=3',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  test('preserves the retryable external place-search error', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      mockedResponse({ code: 'place_search_unavailable' }, 503),
    );

    await expect(
      searchPlaces('Ferraz 22', {
        fetchImplementation: fetchMock as typeof fetch,
      }),
    ).rejects.toMatchObject({
      code: 'place_search_unavailable',
      status: 503,
    });
  });

  test('turns a network failure into the shared controlled error', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('connection refused'));

    await expect(
      searchPlaces('Moncloa', { fetchImplementation: fetchMock as typeof fetch }),
    ).rejects.toMatchObject({ code: 'network_error', status: null });
  });
});
