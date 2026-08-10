import { compareRoutes, RouteApiError } from '@/api/client';
import type { RouteCompareRequest } from '@/api/types';

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
