import { act, fireEvent, render, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { RouteApiError } from '@/api/client';
import type {
  ComparedRoute,
  RouteCompareRequest,
  RouteCompareResponse,
} from '@/api/types';
import { RouteComparisonScreen } from '@/screens/RouteComparisonScreen';
import type { PreferenceStorage } from '@/features/adaptive-preferences/storage';
import {
  DEFAULT_ONBOARDING_ANSWERS,
  SKIPPED_ONBOARDING_ANSWERS,
} from '@/features/onboarding/answers';
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

class MemoryPreferenceStorage implements PreferenceStorage {
  readonly values = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async removeItem(key: string): Promise<void> {
    this.values.delete(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
}

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
    instructions: [
      {
        sequence: 1,
        maneuver: 'depart',
        text: 'Empieza el recorrido hacia calle de la Princesa.',
        street_name: 'calle de la Princesa',
        distance_m: 120,
        duration_s: 95,
        geometry_index: 0,
        location: { latitude: 40.4353, longitude: -3.7191 },
        accessibility_events: [],
      },
      {
        sequence: 2,
        maneuver: 'arrive',
        text: 'Has llegado al destino.',
        street_name: null,
        distance_m: 0,
        duration_s: 0,
        geometry_index: 1,
        location: { latitude: 40.4211, longitude: -3.7206 },
        accessibility_events: [],
      },
    ],
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

/**
 * Recorre el flujo hasta el último paso de configuración.
 *
 * El orden es destino, origen, confirmación del trayecto y perfil; las cuatro
 * pantallas terminan en el mismo botón «Siguiente».
 */
async function goToComparisonStep(
  screen: ReturnType<typeof render> extends Promise<infer R> ? R : never,
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await chooseJourney(screen, user);
  for (let advance = 0; advance < 2; advance += 1) {
    await user.press(
      screen.getByRole('button', { name: ES.placeQuery.nextButton }),
    );
  }
}

/** Recorre la configuración y solicita la comparación. */
async function compareRoutes(
  screen: ReturnType<typeof render> extends Promise<infer R> ? R : never,
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await goToComparisonStep(screen, user);
  await user.press(
    screen.getByRole('button', { name: ES.routeComparison.compareButton }),
  );
}

const MONCLOA = {
  place_id: 'moncloa',
  name: 'Moncloa',
  description: 'Intercambiador y entorno de la plaza de Moncloa.',
  location: { latitude: 40.4353, longitude: -3.7191 },
  source: 'pilot_catalog' as const,
};

const PRINCIPE_PIO = {
  place_id: 'principe_pio',
  name: 'Príncipe Pío',
  description: 'Intercambiador y entorno de la estación de Príncipe Pío.',
  location: { latitude: 40.4211, longitude: -3.7206 },
  source: 'pilot_catalog' as const,
};

/** Devuelve los dos lugares del piloto para cualquier consulta. */
function pilotSearch() {
  return jest.fn().mockResolvedValue({ places: [PRINCIPE_PIO, MONCLOA] });
}

/** Elige un lugar en la pantalla activa y confirma con «Siguiente». */
async function choosePlace(
  screen: ReturnType<typeof render> extends Promise<infer R> ? R : never,
  user: ReturnType<typeof userEvent.setup>,
  field: 'destination' | 'origin',
  place: typeof MONCLOA,
): Promise<void> {
  fireEvent.changeText(
    screen.getByLabelText(ES.routeComparison.placeSearch[field].inputLabel),
    place.name,
  );
  await user.press(
    screen.getByRole('button', {
      name: ES.routeComparison.placeSearch[field].searchButton,
    }),
  );
  await user.press(
    await screen.findByRole('button', {
      name: `${place.name}. ${place.description}`,
    }),
  );
  await user.press(
    screen.getByRole('button', { name: ES.placeQuery.nextButton }),
  );
}

/** Elige destino y origen, dejando el flujo en el paso de confirmación. */
async function chooseJourney(
  screen: ReturnType<typeof render> extends Promise<infer R> ? R : never,
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await choosePlace(screen, user, 'destination', PRINCIPE_PIO);
  await choosePlace(screen, user, 'origin', MONCLOA);
}

describe('<RouteComparisonScreen />', () => {
  test('applies the saved questionnaire profile to the comparison', async () => {
    const storage = new MemoryPreferenceStorage();
    const compare = jest.fn().mockResolvedValue(response());
    const answers = {
      ...DEFAULT_ONBOARDING_ANSWERS,
      detour: 'twentyFive' as const,
      priorities: {
        ...DEFAULT_ONBOARDING_ANSWERS.priorities,
        complex_crossings: 'high' as const,
        distance: 'none' as const,
      },
      steps: 'avoid' as const,
    };
    const screen = await render(
      <RouteComparisonScreen
        compare={compare}
        onboardingAnswers={answers}
        preferenceStorage={storage}
        search={pilotSearch()}
      />,
    );
    const user = userEvent.setup();

    await chooseJourney(screen, user);
    screen.getByRole('header', {
      name: ES.routeComparison.setupAppBarTitle,
    });
    expect(
      screen.queryByText(ES.routeComparison.stepIndicator(1, 1)),
    ).toBeNull();
    expect(
      screen.queryByRole('radio', {
        name: ES.routeComparison.profiles.balanced_demo.label,
      }),
    ).toBeNull();
    await user.press(
      await screen.findByRole('button', {
        name: ES.routeComparison.compareButton,
      }),
    );

    expect(compare).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: expect.objectContaining({
          avoid_steps: false,
          declared_weights: expect.objectContaining({
            complex_crossings: 3,
            distance: 0,
          }),
          maximum_detour_ratio: 1.25,
          profile_id: 'onboarding_profile',
        }),
      }),
    );
  });

  test('edits the questionnaire without losing the chosen journey', async () => {
    const onUpdatePreferences = jest.fn();
    const screen = await render(
      <RouteComparisonScreen
        onboardingAnswers={DEFAULT_ONBOARDING_ANSWERS}
        onUpdatePreferences={onUpdatePreferences}
        preferenceStorage={new MemoryPreferenceStorage()}
        search={pilotSearch()}
      />,
    );
    const user = userEvent.setup();

    await chooseJourney(screen, user);
    await user.press(
      screen.getByRole('button', {
        name: ES.routeComparison.editPreferencesButton,
      }),
    );
    screen.getByRole('header', { name: ES.onboarding.intro.title });
    await user.press(
      screen.getByRole('button', { name: ES.onboarding.intro.skipButton }),
    );

    expect(onUpdatePreferences).toHaveBeenCalledWith(
      SKIPPED_ONBOARDING_ANSWERS,
    );
    screen.getByText(MONCLOA.name);
    screen.getByText(PRINCIPE_PIO.name);
  });

  test('shows the accessible initial profile selection', async () => {
    const screen = await render(
      <RouteComparisonScreen
        compare={jest.fn()}
        onboardingAnswers={SKIPPED_ONBOARDING_ANSWERS}
        search={pilotSearch()}
      />,
    );

    const user = userEvent.setup();

    screen.getByRole('header', { name: ES.placeQuery.destination.title });
    expect(
      screen.queryByRole('radio', {
        name: ES.routeComparison.profiles.balanced_demo.label,
      }),
    ).toBeNull();

    await chooseJourney(screen, user);
    screen.getByRole('header', { name: ES.routeComparison.steps.confirm.title });
    screen.getByRole('header', {
      name: ES.routeComparison.setupAppBarTitle,
    });
    screen.getByText(ES.routeComparison.stepIndicator(1, 3));

    await user.press(
      screen.getByRole('button', { name: ES.placeQuery.nextButton }),
    );

    screen.getByText(ES.routeComparison.stepIndicator(2, 3));
    screen.getByRole('radio', {
      name: ES.routeComparison.profiles.balanced_demo.label,
      selected: true,
    });

    await user.press(
      screen.getByRole('button', { name: ES.placeQuery.nextButton }),
    );

    screen.getByText(ES.routeComparison.stepIndicator(3, 3));
    screen.getByRole('button', { name: ES.routeComparison.compareButton });
  });

  test('presents metrics, reasons, warnings, and rejected routes', async () => {
    const compare = jest.fn().mockResolvedValue(response());
    const screen = await render(<RouteComparisonScreen compare={compare} search={pilotSearch()} />);
    const user = userEvent.setup();

    await compareRoutes(screen, user);

    await screen.findByRole('header', {
      name: ES.routeComparison.resultsAppBarTitle,
    });
    expect(
      StyleSheet.flatten(
        screen.getByRole('button', {
          name: ES.routeComparison.backToSearchButton,
        }).props.style,
      ).backgroundColor,
    ).toBe('transparent');
    expect(
      screen.queryByText(ES.routeComparison.resultSummary(2, 1)),
    ).toBeNull();
    expect(
      screen.queryByText(ES.routeComparison.resultIntroduction),
    ).toBeNull();
    expect(screen.queryByText(ES.appName)).toBeNull();
    screen.getByRole('header', { name: 'Alternativa equilibrada' });
    screen.getByLabelText(`${ES.routeComparison.adequacy}: 80 %`);
    screen.getByLabelText(`${ES.routeComparison.confidence}: 75 %`);
    screen.getByLabelText(`${ES.routeComparison.uncertainty}: 0 %`);
    screen.getByText(/Ventaja respecto a las demás alternativas: distancia/);
    screen.getByLabelText(ES.routeComparison.unfavorableCountChip(1));
    await user.press(
      screen.getAllByRole('button', {
        name: ES.routeComparison.detailsButton,
      })[0],
    );
    screen.getByRole('alert', {
      name: /Evidencia desfavorable sobre pendiente/,
    });
    screen.getByRole('header', { name: 'Alternativa más sencilla de seguir' });
    screen.getByText(ES.routeComparison.constraints.incompatible_crossings);
  });

  test('lets the user choose one exact ranked route for navigation', async () => {
    const compare = jest.fn().mockResolvedValue(response());
    const onChooseRoute = jest.fn();
    const screen = await render(
      <RouteComparisonScreen
        compare={compare}
        onChooseRoute={onChooseRoute}
        search={pilotSearch()}
      />,
    );
    const user = userEvent.setup();

    await compareRoutes(screen, user);
    const chooseButtons = await screen.findAllByRole('button', {
      name: ES.routeComparison.chooseRouteButton,
    });
    await user.press(chooseButtons[1]);

    expect(onChooseRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: { latitude: 40.4211, longitude: -3.7206 },
        profile: expect.objectContaining({ profile_id: 'balanced_demo' }),
        route: expect.objectContaining({
          route_id: 'fewer_crossings_route',
          rank: 2,
        }),
      }),
    );
  });

  test('requires opt-in, records the explicit choice, and passes effective weights', async () => {
    const storage = new MemoryPreferenceStorage();
    const compare = jest.fn().mockResolvedValue(response());
    const onChooseRoute = jest.fn();
    const screen = await render(
      <RouteComparisonScreen
        compare={compare}
        onChooseRoute={onChooseRoute}
        preferenceStorage={storage}
        search={pilotSearch()}
      />,
    );
    const user = userEvent.setup();
    await goToComparisonStep(screen, user);
    const learningSwitch = screen.getByRole('switch', {
      name: ES.adaptivePreferences.switchLabel,
    });

    expect(learningSwitch.props.accessibilityState.checked).toBe(false);
    await act(async () => {
      fireEvent(learningSwitch, 'valueChange', true);
    });
    screen.getByText(ES.adaptivePreferences.observationStatus(0, 3));

    await user.press(
      screen.getByRole('button', { name: ES.routeComparison.compareButton }),
    );
    expect(compare).toHaveBeenCalledWith(
      expect.objectContaining({
        effective_weights: expect.objectContaining({ distance: 1 / 9 }),
        profile: expect.objectContaining({
          declared_weights: expect.objectContaining({ distance: 1 }),
        }),
      }),
    );
    const chooseButtons = await screen.findAllByRole('button', {
      name: ES.routeComparison.chooseRouteButton,
    });
    await user.press(chooseButtons[0]);

    expect(onChooseRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        effective_weights: expect.objectContaining({ distance: 1 / 9 }),
        learning_feedback: ES.adaptivePreferences.observationRecorded(1, 3),
      }),
    );
    const serialized = [...storage.values.values()].join('');
    expect(serialized).not.toMatch(
      /latitude|longitude|geometry|instruction|address|audio|gps/i,
    );
  });

  test('exposes card paragraphs as independent Spanish reading stops', async () => {
    const compare = jest.fn().mockResolvedValue(response());
    const screen = await render(<RouteComparisonScreen compare={compare} search={pilotSearch()} />);
    const user = userEvent.setup();

    await compareRoutes(screen, user);

    await screen.findByRole('header', {
      name: ES.routeComparison.resultsAppBarTitle,
    });
    const reasonsHeader = screen.getAllByRole('header', {
      name: ES.routeComparison.reasonsTitle,
    })[0];
    const firstReason = screen.getByRole('text', {
      name: /Ventaja respecto a las demás alternativas: distancia/,
    });
    await user.press(
      screen.getAllByRole('button', {
        name: ES.routeComparison.detailsButton,
      })[0],
    );
    const warning = screen.getAllByRole('alert', {
      name: /Evidencia desfavorable sobre pendiente/,
    })[0];

    expect(reasonsHeader.props.accessibilityLanguage).toBe('es-ES');
    expect(firstReason.props.accessibilityLanguage).toBe('es-ES');
    expect(warning.props.accessibilityLanguage).toBe('es-ES');
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
    const screen = await render(<RouteComparisonScreen compare={compare} search={pilotSearch()} />);
    const user = userEvent.setup();

    await compareRoutes(screen, user);

    await screen.findByRole('text', { name: ES.routeComparison.realData });
    expect(
      screen.queryByRole('text', {
        name: /Información no confirmada sobre ausencia de escalones/,
      }),
    ).toBeNull();

    await user.press(
      screen.getByRole('button', { name: ES.routeComparison.detailsButton }),
    );

    screen.getByRole('text', {
      name: ES.routeComparison.realDataProvenance,
    });
    screen.getByRole('header', {
      name: ES.routeComparison.unknownEvidenceTitle,
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
    const screen = await render(<RouteComparisonScreen compare={compare} search={pilotSearch()} />);
    const user = userEvent.setup();

    await chooseJourney(screen, user);
    await user.press(
      screen.getByRole('button', { name: ES.placeQuery.nextButton }),
    );
    await user.press(
      screen.getByRole('radio', {
        name: ES.routeComparison.profiles.simpler_crossings_demo.label,
      }),
    );
    await user.press(
      screen.getByRole('button', { name: ES.placeQuery.nextButton }),
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
    await screen.findByRole('header', {
      name: ES.routeComparison.resultsAppBarTitle,
    });
    expect(
      screen.getAllByRole('header').find(
        (element) =>
          element.props.children === 'Alternativa con cruces más sencillos',
      ),
    ).toBeDefined();
    screen.getByText(ES.routeComparison.bestRouteLabel);
  });

  test('announces loading and disables duplicate submissions', async () => {
    let resolveComparison: ((value: RouteCompareResponse) => void) | undefined;
    const compare = jest.fn(
      () =>
        new Promise<RouteCompareResponse>((resolve) => {
          resolveComparison = resolve;
        }),
    );
    const screen = await render(<RouteComparisonScreen compare={compare} search={pilotSearch()} />);
    const user = userEvent.setup();

    await compareRoutes(screen, user);

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
    const screen = await render(<RouteComparisonScreen compare={compare} search={pilotSearch()} />);
    const user = userEvent.setup();

    await compareRoutes(screen, user);

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
    const screen = await render(<RouteComparisonScreen compare={compare} search={pilotSearch()} />);
    const user = userEvent.setup();

    await compareRoutes(screen, user);

    await screen.findByRole('header', {
      name: ES.routeComparison.resultsAppBarTitle,
    });
    screen.getByText(ES.routeComparison.rejectedCardLabel);
    screen.getByText(ES.routeComparison.constraints.incompatible_crossings);
    expect(
      screen.getAllByRole('header', {
        name: ES.routeComparison.resultsAppBarTitle,
      }),
    ).toHaveLength(1);
  });

  test('searches a place and sends its selected coordinates', async () => {
    const arguelles = {
      place_id: 'arguelles',
      name: 'Argüelles',
      description: 'Entorno de la estación de Argüelles.',
      location: { latitude: 40.4304497, longitude: -3.7155854 },
      source: 'pilot_catalog' as const,
    };
    const search = jest
      .fn()
      .mockResolvedValue({ places: [arguelles, PRINCIPE_PIO] });
    const compare = jest.fn().mockResolvedValue(response());
    const screen = await render(
      <RouteComparisonScreen compare={compare} search={search} />,
    );
    const user = userEvent.setup();

    await choosePlace(screen, user, 'destination', PRINCIPE_PIO);
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
    for (let advance = 0; advance < 3; advance += 1) {
      await user.press(
        screen.getByRole('button', { name: ES.placeQuery.nextButton }),
      );
    }
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
    const search = jest
      .fn()
      .mockResolvedValue({ places: [address, PRINCIPE_PIO] });
    const compare = jest.fn().mockResolvedValue(response());
    const screen = await render(
      <RouteComparisonScreen compare={compare} search={search} />,
    );
    const user = userEvent.setup();

    await choosePlace(screen, user, 'destination', PRINCIPE_PIO);
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
    for (let advance = 0; advance < 3; advance += 1) {
      await user.press(
        screen.getByRole('button', { name: ES.placeQuery.nextButton }),
      );
    }
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

    await user.press(
      screen.getByRole('button', { name: ES.placeQuery.nextButton }),
    );
    await user.press(
      screen.getByRole('button', { name: ES.placeQuery.nextButton }),
    );

    screen.getByRole('alert', { name: ES.routeComparison.samePlaceError });
    screen.getByRole('button', {
      disabled: true,
      name: ES.routeComparison.continueButton,
    });
    expect(compare).not.toHaveBeenCalled();
  });
});
