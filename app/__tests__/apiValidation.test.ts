import {
  InvalidApiResponseError,
  parseApiErrorResponse,
  parsePlaceSearchResponse,
  parseRouteCompareResponse,
} from '@/api/validation';

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
    origin: { latitude: 40.4353, longitude: -3.7191 },
    destination: { latitude: 40.4211, longitude: -3.7206 },
    profile_id: 'balanced_demo',
    routes: [
      {
        route_id: 'balanced_route',
        name: 'Alternativa equilibrada',
        rank: 1,
        category: 'balanced',
        source: 'fixture',
        is_synthetic: true,
        geometry: [
          { latitude: 40.4353, longitude: -3.7191 },
          { latitude: 40.4211, longitude: -3.7206 },
        ],
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
        warnings: [
          {
            attribute: 'slope',
            state: 'unfavorable',
            coverage_ratio: 0.7,
            note: 'Pendiente relevante.',
          },
        ],
      },
    ],
    rejected_routes: [
      {
        route_id: 'simple_route',
        name: 'Alternativa más sencilla de seguir',
        category: 'simple_or_short',
        source: 'fixture',
        is_synthetic: true,
        violations: [
          {
            code: 'incompatible_crossings',
            actual_value: null,
            limit_value: null,
          },
        ],
      },
    ],
  };
}

describe('route comparison API validation', () => {
  test('accepts and returns a complete valid response', () => {
    const response = parseRouteCompareResponse(validResponse());

    expect(response.routes[0].route_id).toBe('balanced_route');
    expect(response.routes[0].warnings[0].attribute).toBe('slope');
    expect(response.rejected_routes[0].violations[0].code).toBe(
      'incompatible_crossings',
    );
  });

  test('rejects a metric outside its valid range', () => {
    const response = validResponse();
    response.routes[0].score.adequacy = 1.2;

    expect(() => parseRouteCompareResponse(response)).toThrow(
      InvalidApiResponseError,
    );
  });

  test('rejects an adequacy that does not match the total cost', () => {
    const response = validResponse();
    response.routes[0].score.adequacy = 0.7;

    expect(() => parseRouteCompareResponse(response)).toThrow(
      InvalidApiResponseError,
    );
  });

  test('rejects a score attached to a different route', () => {
    const response = validResponse();
    response.routes[0].score.route_id = 'another_route';

    expect(() => parseRouteCompareResponse(response)).toThrow(
      InvalidApiResponseError,
    );
  });

  test('rejects non-consecutive ranks', () => {
    const response = validResponse();
    response.routes[0].rank = 2;

    expect(() => parseRouteCompareResponse(response)).toThrow(
      InvalidApiResponseError,
    );
  });

  test('accepts a documented API error code', () => {
    expect(parseApiErrorResponse({ code: 'invalid_request' })).toEqual({
      code: 'invalid_request',
    });
  });

  test('rejects an undocumented API error code', () => {
    expect(() => parseApiErrorResponse({ code: 'token_leaked' })).toThrow(
      InvalidApiResponseError,
    );
  });
});

describe('place-search API validation', () => {
  const validPlaces = {
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

  test('accepts a bounded result from the pilot catalog', () => {
    expect(parsePlaceSearchResponse(validPlaces)).toEqual(validPlaces);
  });

  test('rejects unknown sources and coordinates outside WGS84', () => {
    expect(() =>
      parsePlaceSearchResponse({
        places: [{ ...validPlaces.places[0], source: 'untrusted_provider' }],
      }),
    ).toThrow(InvalidApiResponseError);
    expect(() =>
      parsePlaceSearchResponse({
        places: [
          {
            ...validPlaces.places[0],
            location: { latitude: 100, longitude: -3.7206 },
          },
        ],
      }),
    ).toThrow(InvalidApiResponseError);
  });

  test('accepts a validated ORS geocoder result inside the public schema', () => {
    const response = parsePlaceSearchResponse({
      places: [
        {
          ...validPlaces.places[0],
          place_id: 'ors_0123456789abcdef01234567',
          name: 'Calle de Ferraz, 22',
          source: 'ors_geocoder',
        },
      ],
    });

    expect(response.places[0].source).toBe('ors_geocoder');
  });

  test('rejects duplicate place identifiers', () => {
    expect(() =>
      parsePlaceSearchResponse({
        places: [validPlaces.places[0], validPlaces.places[0]],
      }),
    ).toThrow(InvalidApiResponseError);
  });
});
