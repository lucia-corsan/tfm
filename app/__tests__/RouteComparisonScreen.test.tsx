import { act, fireEvent, render, userEvent } from '@testing-library/react-native';

import { RouteApiError } from '@/api/client';
import type {
  ComparedRoute,
  RouteCompareRequest,
  RouteCompareResponse,
} from '@/api/types';
import { RouteComparisonScreen } from '@/screens/RouteComparisonScreen';
import { ES } from '../i18n/es';

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

function route(
  routeId: string,
  name: string,
  rank: number,
  adequacy: number,
): ComparedRoute {
  return {
    route_id: routeId,
    name,
    rank,
    category: rank === 1 ? 'balanced' : 'fewer_complex_crossings',
    source: 'fixture',
    is_synthetic: true,
    geometry: [
      { latitude: 40.4353, longitude: -3.7191 },
      { latitude: 40.4211, longitude: -3.7206 },
    ],
    distance_m: rank === 1 ? 1810 : 1980,
    duration_s: rank === 1 ? 1470 : 1610,
    score: {
      route_id: routeId,
      normalized_weights: weights,
      costs: weights,
      contributions,
      confidence: rank === 1 ? 0.75 : 0.69,
      uncertainty: rank === 1 ? 0 : 1 / 11,
      total_cost: 1 - adequacy,
      adequacy,
    },
    reasons: [
      {
        kind: 'relative_advantage',
        dimension: rank === 1 ? 'distance' : 'complex_crossings',
        cost: 0.1,
        contribution: 0.01,
        comparison_cost: 0.2,
      },
    ],
    warnings:
      rank === 1
        ? [
            {
              attribute: 'slope',
              state: 'unfavorable',
              coverage_ratio: 0.7,
              note: 'El escenario simula un tramo con pendiente relevante.',
            },
          ]
        : [],
  };
}

function response(firstRoute = 'balanced'): RouteCompareResponse {
  const balanced = route('balanced_route', 'Alternativa equilibrada', 1, 0.8);
  const simpler = route(
    'fewer_crossings_route',
    'Alternativa con cruces más sencillos',
    2,
    0.76,
  );
  const routes =
    firstRoute === 'balanced'
      ? [balanced, simpler]
      : [
          { ...simpler, rank: 1 },
          { ...balanced, rank: 2 },
        ];

  return {
    scenario_id: 'moncloa_principe_pio',
    scenario_name: 'Moncloa a Príncipe Pío',
    origin: { latitude: 40.4353, longitude: -3.7191 },
    destination: { latitude: 40.4211, longitude: -3.7206 },
    profile_id:
      firstRoute === 'balanced' ? 'balanced_demo' : 'simpler_crossings_demo',
    routes,
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

describe('<RouteComparisonScreen />', () => {
  test('shows the accessible initial profile selection', async () => {
    const screen = await render(
      <RouteComparisonScreen compare={jest.fn()} />,
    );

    screen.getByRole('header', { name: ES.routeComparison.title });
    screen.getByRole('radio', {
      name: ES.routeComparison.profiles.balanced_demo.label,
      selected: true,
    });
    screen.getByRole('button', { name: ES.routeComparison.compareButton });
    screen.getByText(ES.routeComparison.idleDescription);
  });

  test('presents metrics, reasons, warnings, and rejected routes', async () => {
    const compare = jest.fn().mockResolvedValue(response());
    const screen = await render(<RouteComparisonScreen compare={compare} />);
    const user = userEvent.setup();

    await user.press(
      screen.getByRole('button', { name: ES.routeComparison.compareButton }),
    );

    await screen.findByText(ES.routeComparison.resultSummary(2, 1));
    screen.getByRole('header', { name: 'Alternativa equilibrada' });
    screen.getByLabelText(`${ES.routeComparison.adequacy}: 80 %`);
    screen.getByLabelText(`${ES.routeComparison.confidence}: 75 %`);
    screen.getByLabelText(`${ES.routeComparison.uncertainty}: 0 %`);
    screen.getByText(/Ventaja respecto a las demás alternativas: distancia/);
    screen.getByRole('alert', {
      name: /Evidencia desfavorable sobre pendiente/,
    });
    screen.getByRole('header', { name: 'Alternativa más sencilla de seguir' });
    screen.getByText(ES.routeComparison.constraints.incompatible_crossings);
  });

  test('exposes result paragraphs as independent Spanish reading stops', async () => {
    const compare = jest.fn().mockResolvedValue(response());
    const screen = await render(<RouteComparisonScreen compare={compare} />);
    const user = userEvent.setup();

    await user.press(
      screen.getByRole('button', { name: ES.routeComparison.compareButton }),
    );

    const introduction = await screen.findByRole('text', {
      name: ES.routeComparison.resultIntroduction,
    });
    const reasonsHeader = screen.getAllByRole('header', {
      name: ES.routeComparison.reasonsTitle,
    })[0];
    const firstReason = screen.getByRole('text', {
      name: /Ventaja respecto a las demás alternativas: distancia/,
    });
    const warningsHeader = screen.getAllByRole('header', {
      name: ES.routeComparison.unfavorableEvidenceTitle,
    })[0];

    expect(introduction.props.accessibilityLanguage).toBe('es-ES');
    expect(reasonsHeader.props.accessibilityLanguage).toBe('es-ES');
    expect(firstReason.props.accessibilityLanguage).toBe('es-ES');
    expect(warningsHeader.props.accessibilityLanguage).toBe('es-ES');
  });

  test('explains real route provenance and the attributes behind uncertainty', async () => {
    const realRoute: ComparedRoute = {
      ...route('ors_route_1', 'Alternativa más corta', 1, 0.62),
      source: 'ors',
      is_synthetic: false,
      score: {
        ...route('ors_route_1', 'Alternativa más corta', 1, 0.62).score,
        route_id: 'ors_route_1',
        uncertainty: 3 / 11,
      },
      warnings: [
        {
          attribute: 'step_free',
          state: 'unknown',
          coverage_ratio: 0,
          note: 'La ausencia de escalones cartografiados no confirma una ruta sin escalones.',
        },
        {
          attribute: 'crossing_compatibility',
          state: 'unknown',
          coverage_ratio: 0.69,
          note: 'Compatibilidad estimada solo a partir de cruces peatonales declarados.',
        },
        {
          attribute: 'slope',
          state: 'unknown',
          coverage_ratio: 0,
          note: 'Pendiente numérica no disponible.',
        },
        {
          attribute: 'audible_signals',
          state: 'unfavorable',
          coverage_ratio: 0.47,
          note: 'Ayudas acústicas o vibratorias declaradas en OSM.',
        },
      ],
    };
    const realResponse: RouteCompareResponse = {
      ...response(),
      routes: [realRoute],
      rejected_routes: [],
    };
    const compare = jest.fn().mockResolvedValue(realResponse);
    const screen = await render(<RouteComparisonScreen compare={compare} />);
    const user = userEvent.setup();

    await user.press(
      screen.getByRole('button', { name: ES.routeComparison.compareButton }),
    );

    await screen.findByRole('text', { name: ES.routeComparison.realData });
    screen.getByRole('text', {
      name: ES.routeComparison.realDataProvenance,
    });
    screen.getByRole('text', {
      name: ES.routeComparison.unknownEvidenceIntroduction('27 %', 3),
    });
    screen.getByRole('text', {
      name: /Información no confirmada sobre ausencia de escalones/,
    });
    screen.getByRole('text', {
      name: /Información no confirmada sobre compatibilidad de los cruces/,
    });
    screen.getByRole('text', {
      name: /Información no confirmada sobre pendiente/,
    });
    screen.getByRole('alert', {
      name: /Evidencia desfavorable sobre señales acústicas/,
    });
    expect(screen.queryByText(ES.routeComparison.syntheticData)).toBeNull();
  });

  test('sends the crossings profile and presents its changed order', async () => {
    const compare = jest.fn((request: RouteCompareRequest) =>
      Promise.resolve(
        response(
          request.profile.profile_id === 'simpler_crossings_demo'
            ? 'simpler'
            : 'balanced',
        ),
      ),
    );
    const screen = await render(<RouteComparisonScreen compare={compare} />);
    const user = userEvent.setup();

    await user.press(
      screen.getByRole('radio', {
        name: ES.routeComparison.profiles.simpler_crossings_demo.label,
      }),
    );
    await user.press(
      screen.getByRole('button', { name: ES.routeComparison.compareButton }),
    );

    expect(compare).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: expect.objectContaining({
          profile_id: 'simpler_crossings_demo',
          declared_weights: expect.objectContaining({ complex_crossings: 8 }),
        }),
      }),
    );
    await screen.findByText(ES.routeComparison.resultSummary(2, 1));
    expect(
      screen.getAllByRole('header').find(
        (element) =>
          element.props.children === 'Alternativa con cruces más sencillos',
      ),
    ).toBeDefined();
    screen.getByText(ES.routeComparison.rankLabel(1));
  });

  test('announces loading and disables duplicate submissions', async () => {
    let resolveComparison: ((value: RouteCompareResponse) => void) | undefined;
    const compare = jest.fn(
      () =>
        new Promise<RouteCompareResponse>((resolve) => {
          resolveComparison = resolve;
        }),
    );
    const screen = await render(<RouteComparisonScreen compare={compare} />);
    const user = userEvent.setup();

    await user.press(
      screen.getByRole('button', { name: ES.routeComparison.compareButton }),
    );

    screen.getByRole('progressbar', { name: ES.routeComparison.loading });
    screen.getByRole('button', {
      disabled: true,
      name: ES.routeComparison.loadingButton,
    });

    await act(async () => resolveComparison?.(response()));
  });

  test.each([
    'invalid_request',
    'route_scenario_not_found',
    'routing_provider_unavailable',
    'invalid_response',
    'network_error',
  ] as const)('presents the controlled %s error without technical details', async (code) => {
    const compare = jest.fn().mockRejectedValue(new RouteApiError(code));
    const screen = await render(<RouteComparisonScreen compare={compare} />);
    const user = userEvent.setup();

    await user.press(
      screen.getByRole('button', { name: ES.routeComparison.compareButton }),
    );

    await screen.findByRole('alert', {
      name: `${ES.routeComparison.errorTitle}. ${ES.routeComparison.errors[code]}`,
    });
    screen.getByRole('button', { name: ES.routeComparison.retryButton });
    expect(screen.queryByText(/HTTP|localhost|10\.0\.2\.2|ORS_API_KEY/)).toBeNull();
  });

  test('explains when every candidate violates a critical restriction', async () => {
    const rejectedOnly: RouteCompareResponse = {
      ...response(),
      routes: [],
    };
    const compare = jest.fn().mockResolvedValue(rejectedOnly);
    const screen = await render(<RouteComparisonScreen compare={compare} />);
    const user = userEvent.setup();

    await user.press(
      screen.getByRole('button', { name: ES.routeComparison.compareButton }),
    );

    await screen.findByRole('header', {
      name: ES.routeComparison.noAcceptedRoutesTitle,
    });
    screen.getByRole('text', {
      name: ES.routeComparison.noAcceptedRoutesDescription,
    });
    screen.getByRole('header', { name: ES.routeComparison.rejectedTitle });
    screen.getByText(ES.routeComparison.constraints.incompatible_crossings);
    expect(screen.queryByText(ES.routeComparison.resultIntroduction)).toBeNull();
  });

  test('searches a place and sends its selected coordinates', async () => {
    const arguelles = {
      place_id: 'arguelles',
      name: 'Argüelles',
      description: 'Entorno de la estación de Argüelles.',
      location: { latitude: 40.4304497, longitude: -3.7155854 },
      source: 'pilot_catalog' as const,
    };
    const search = jest.fn().mockResolvedValue({ places: [arguelles] });
    const compare = jest.fn().mockResolvedValue(response());
    const screen = await render(
      <RouteComparisonScreen compare={compare} search={search} />,
    );
    const user = userEvent.setup();

    fireEvent.changeText(
      screen.getByLabelText(
        ES.routeComparison.placeSearch.origin.inputLabel,
      ),
      'Arguelles',
    );
    await user.press(
      screen.getByRole('button', {
        name: ES.routeComparison.placeSearch.origin.searchButton,
      }),
    );
    await user.press(
      await screen.findByRole('button', {
        name: `${arguelles.name}. ${arguelles.description}`,
      }),
    );
    await user.press(
      screen.getByRole('button', { name: ES.routeComparison.compareButton }),
    );

    expect(search).toHaveBeenCalledWith('Arguelles');
    expect(compare).toHaveBeenCalledWith(
      expect.objectContaining({ origin: arguelles.location }),
    );
  });

  test('selects a geocoded street address and sends its coordinates', async () => {
    const address = {
      place_id: 'ors_0123456789abcdef01234567',
      name: 'Calle de Ferraz 22',
      description: 'Calle de Ferraz 22, Madrid, España',
      location: { latitude: 40.4298, longitude: -3.7185 },
      source: 'ors_geocoder' as const,
    };
    const search = jest.fn().mockResolvedValue({ places: [address] });
    const compare = jest.fn().mockResolvedValue(response());
    const screen = await render(
      <RouteComparisonScreen compare={compare} search={search} />,
    );
    const user = userEvent.setup();

    fireEvent.changeText(
      screen.getByLabelText(
        ES.routeComparison.placeSearch.origin.inputLabel,
      ),
      'Ferraz 22',
    );
    await user.press(
      screen.getByRole('button', {
        name: ES.routeComparison.placeSearch.origin.searchButton,
      }),
    );
    await user.press(
      await screen.findByRole('button', {
        name: `${address.name}. ${address.description}`,
      }),
    );
    await user.press(
      screen.getByRole('button', { name: ES.routeComparison.compareButton }),
    );

    expect(search).toHaveBeenCalledWith('Ferraz 22');
    expect(compare).toHaveBeenCalledWith(
      expect.objectContaining({ origin: address.location }),
    );
  });

  test('blocks a comparison when both selected places are the same', async () => {
    const moncloa = {
      place_id: 'moncloa',
      name: 'Moncloa',
      description: 'Intercambiador y entorno de la plaza de Moncloa.',
      location: { latitude: 40.4353, longitude: -3.7191 },
      source: 'pilot_catalog' as const,
    };
    const search = jest.fn().mockResolvedValue({ places: [moncloa] });
    const compare = jest.fn();
    const screen = await render(
      <RouteComparisonScreen compare={compare} search={search} />,
    );
    const user = userEvent.setup();

    fireEvent.changeText(
      screen.getByLabelText(
        ES.routeComparison.placeSearch.destination.inputLabel,
      ),
      'Moncloa',
    );
    await user.press(
      screen.getByRole('button', {
        name: ES.routeComparison.placeSearch.destination.searchButton,
      }),
    );
    await user.press(
      await screen.findByRole('button', {
        name: `${moncloa.name}. ${moncloa.description}`,
      }),
    );

    screen.getByRole('alert', { name: ES.routeComparison.samePlaceError });
    screen.getByRole('button', {
      disabled: true,
      name: ES.routeComparison.compareButton,
    });
    expect(compare).not.toHaveBeenCalled();
  });
});
