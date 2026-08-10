import { act, render, userEvent } from '@testing-library/react-native';

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

  test('announces a network error and offers an accessible retry', async () => {
    const compare = jest.fn().mockRejectedValue(new RouteApiError('network_error'));
    const screen = await render(<RouteComparisonScreen compare={compare} />);
    const user = userEvent.setup();

    await user.press(
      screen.getByRole('button', { name: ES.routeComparison.compareButton }),
    );

    await screen.findByRole('alert', {
      name: `${ES.routeComparison.errorTitle}. ${ES.routeComparison.errors.network_error}`,
    });
    screen.getByRole('button', { name: ES.routeComparison.retryButton });
  });
});
