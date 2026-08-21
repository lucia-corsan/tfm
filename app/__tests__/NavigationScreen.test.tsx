import { render, userEvent } from '@testing-library/react-native';

import type { ComparedRoute, NavigationSession } from '@/api/types';
import { RouteApiError } from '@/api/client';
import { NavigationScreen } from '@/screens/NavigationScreen';
import { ES } from '../i18n/es';

const mockPauseForReroute = jest.fn();
const mockResetDeviationEvidence = jest.fn();
const mockStartRerouteCooldown = jest.fn();
const mockSpeechSpeak = jest.fn();
const mockSpeechStop = jest.fn();
let mockTrackingStatus = 'on_route';
let mockScreenReaderStatus = 'disabled';
let latestSpeechRate = 0;

jest.mock('@/features/location/useForegroundRouteTracking', () => ({
  useForegroundRouteTracking: () => ({
    accuracyM: 5,
    distanceToRouteM: 0,
    latestReliablePosition: { latitude: 40.43, longitude: -3.71 },
    pauseForReroute: mockPauseForReroute,
    resetDeviationEvidence: mockResetDeviationEvidence,
    startRerouteCooldown: mockStartRerouteCooldown,
    status: mockTrackingStatus,
  }),
}));

jest.mock('@/features/speech/useScreenReaderStatus', () => ({
  useScreenReaderStatus: () => mockScreenReaderStatus,
}));

jest.mock('@/features/speech/useInstructionSpeech', () => ({
  useInstructionSpeech: ({ rate }: { rate: number }) => {
    latestSpeechRate = rate;
    return {
      error: false,
      isSpeaking: false,
      speak: mockSpeechSpeak,
      stop: mockSpeechStop,
    };
  },
}));

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

const route: ComparedRoute = {
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
      maneuver: 'turn_right',
      text:
        'Gira a la derecha hacia la calle de Ferraz. Después del giro, ' +
        'avanza 150 metros. A unos 48 metros, los datos sitúan un paso de ' +
        'peatones marcado. Constan estas características: señal acústica.',
      street_name: 'calle de Ferraz',
      distance_m: 150,
      duration_s: 120,
      geometry_index: 1,
      location: { latitude: 40.4211, longitude: -3.7206 },
      accessibility_events: [
        {
          sequence: 1,
          distance_from_instruction_start_m: 48,
          text: 'Paso de peatones marcado próximo.',
          source: 'osm',
          details: [
            {
              attribute: 'audible_signals',
              state: 'favorable',
              text: 'OSM declara señal acústica en el cruce.',
            },
            {
              attribute: 'kerb',
              state: 'unknown',
              text: 'OSM no permite confirmar la altura del bordillo.',
            },
          ],
        },
      ],
    },
    {
      sequence: 3,
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
    route_id: 'balanced_route',
    normalized_weights: weights,
    costs: weights,
    contributions: {
      distance: 1 / 9,
      complex_crossings: 1 / 9,
      crossing_support: 1 / 9,
      sidewalk_evidence: 1 / 9,
      steps: 1 / 9,
      surface: 1 / 9,
      orientation_complexity: 1 / 9,
      slope: 1 / 9,
      uncertainty: 1 / 9,
    },
    confidence: 0.75,
    uncertainty: 1 / 11,
    total_cost: 1,
    adequacy: 0,
  },
  reasons: [
    {
      kind: 'relative_advantage',
      dimension: 'distance',
      cost: 0.1,
      contribution: 0.01,
      comparison_cost: 0.2,
    },
  ],
  warnings: [
    {
      attribute: 'slope',
      state: 'unknown',
      coverage_ratio: 0,
      note: 'Pendiente no confirmada.',
    },
    {
      attribute: 'surface',
      state: 'unfavorable',
      coverage_ratio: 0.5,
      note: 'Superficie irregular.',
    },
  ],
};

const session: NavigationSession = {
  destination: { latitude: 40.4211, longitude: -3.7206 },
  effective_weights: { ...weights, distance: 0.2, complex_crossings: 1 / 45 },
  learning_feedback: 'Esta elección se ha guardado como observación.',
  profile: {
    profile_id: 'balanced_demo',
    avoid_steps: true,
    require_pedestrian_access: true,
    avoid_incompatible_crossings: true,
    maximum_slope_percent: null,
    maximum_detour_ratio: 1.5,
    declared_weights: weights,
  },
  route,
};

/** Despliega el detalle del tramo dentro de la tarjeta de instrucción. */
async function openStepDetails(
  screen: ReturnType<typeof render> extends Promise<infer R> ? R : never,
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.press(
    screen.getByRole('button', { name: ES.routeComparison.detailsButton }),
  );
}

describe('<NavigationScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackingStatus = 'on_route';
    mockScreenReaderStatus = 'disabled';
    latestSpeechRate = 0;
  });

  test('starts at the first instruction with accessible manual controls', async () => {
    const screen = await render(
      <NavigationScreen onFinish={jest.fn()} session={session} />,
    );
    const user = userEvent.setup();

    screen.getByRole('header', { name: ES.navigation.title });
    screen.getByRole('text', { name: route.instructions[0].text });
    screen.getByRole('button', {
      disabled: true,
      name: ES.navigation.previousButton,
    });
    screen.getByRole('button', {
      disabled: false,
      name: ES.navigation.nextButton,
    });

    await openStepDetails(screen, user);
    screen.getByRole('text', { name: ES.navigation.unknownSummary(1) });
    screen.getByRole('text', { name: ES.navigation.unfavorableSummary(1) });
    screen.getByRole('header', { name: ES.navigation.gpsTitle });
    screen.getByRole('button', { name: ES.navigation.activateGpsButton });
    screen.getByRole('text', { name: ES.navigation.gpsStatus.on_route });
    screen.getByRole('button', { name: ES.navigation.speech.listenButton });
    expect(
      screen.getByRole('text', { name: route.instructions[0].text }).props
        .accessibilityLiveRegion,
    ).toBe('none');
    expect(
      screen.queryByRole('header', { name: ES.navigation.speech.title }),
    ).toBeNull();
  });

  test('opens settings without finishing the active navigation', async () => {
    const onFinish = jest.fn();
    const onOpenSettings = jest.fn();
    const screen = await render(
      <NavigationScreen
        onFinish={onFinish}
        onOpenSettings={onOpenSettings}
        session={session}
      />,
    );
    const user = userEvent.setup();

    await user.press(
      screen.getByRole('button', { name: ES.settings.openButton }),
    );
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
  });

  test('uses the speech rate received from the saved profile', async () => {
    const screen = await render(
      <NavigationScreen
        initialSpeechPreferences={{
          automaticPlayback: false,
          enabled: true,
          rateId: 'fast',
        }}
        onFinish={jest.fn()}
        session={session}
      />,
    );
    const user = userEvent.setup();
    await user.press(
      screen.getByRole('button', { name: ES.navigation.speech.listenButton }),
    );
    expect(latestSpeechRate).toBe(1.25);
  });

  test('uses one live TalkBack instruction and hides second-voice controls', async () => {
    mockScreenReaderStatus = 'enabled';
    const screen = await render(
      <NavigationScreen onFinish={jest.fn()} session={session} />,
    );

    expect(
      screen.queryByRole('header', { name: ES.navigation.speech.title }),
    ).toBeNull();
    expect(screen.queryByText(ES.navigation.speech.status.enabled)).toBeNull();
    expect(
      screen.getByRole('text', { name: route.instructions[0].text }).props
        .accessibilityLiveRegion,
    ).toBe('polite');
    expect(
      screen.queryByRole('button', {
        name: ES.navigation.speech.listenButton,
      }),
    ).toBeNull();
    expect(
      screen.queryByRole('switch', {
        name: ES.navigation.speech.automaticTitle,
      }),
    ).toBeNull();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  test('moves forward and backward without exceeding the sequence', async () => {
    const screen = await render(
      <NavigationScreen onFinish={jest.fn()} session={session} />,
    );
    const user = userEvent.setup();

    await user.press(
      screen.getByRole('button', { name: ES.navigation.nextButton }),
    );
    screen.getByRole('text', { name: route.instructions[1].text });
    screen.getByRole('text', { name: ES.navigation.progress(2, 3) });
    await openStepDetails(screen, user);
    screen.getByRole('header', {
      name: ES.navigation.instructionAccessibilityTitle,
    });
    screen.getByRole('text', {
      name: 'Paso de peatones marcado próximo.',
    });
    screen.getByRole('text', {
      name: 'OSM declara señal acústica en el cruce.',
    });
    screen.getByRole('text', {
      name: 'OSM no permite confirmar la altura del bordillo.',
    });
    await user.press(
      screen.getByRole('button', { name: ES.navigation.previousButton }),
    );
    screen.getByRole('text', { name: route.instructions[0].text });

    await user.press(
      screen.getByRole('button', { name: ES.navigation.nextButton }),
    );
    await user.press(
      screen.getByRole('button', { name: ES.navigation.nextButton }),
    );
    screen.getByRole('text', { name: route.instructions[2].text });
    expect(
      screen.queryByRole('button', { name: ES.navigation.nextButton }),
    ).toBeNull();
    screen.getByRole('button', { name: ES.navigation.finishButton });
  });

  test('finishes navigation only after an explicit action', async () => {
    const onFinish = jest.fn();
    const screen = await render(
      <NavigationScreen onFinish={onFinish} session={session} />,
    );
    const user = userEvent.setup();

    expect(onFinish).not.toHaveBeenCalled();
    for (let step = 0; step < route.instructions.length - 1; step += 1) {
      await user.press(
        screen.getByRole('button', { name: ES.navigation.nextButton }),
      );
    }
    await user.press(
      screen.getByRole('button', { name: ES.navigation.finishButton }),
    );
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  test('asks for an explicit accessible decision before rerouting', async () => {
    mockTrackingStatus = 'confirmation_required';
    const reroute = jest.fn();
    const screen = await render(
      <NavigationScreen
        onFinish={jest.fn()}
        reroute={reroute}
        session={session}
      />,
    );
    const user = userEvent.setup();

    screen.getByRole('header', { name: ES.navigation.rerouteDialogTitle });
    screen.getByText(ES.navigation.rerouteDialogDescription);
    await user.press(
      screen.getByRole('button', { name: ES.navigation.keepRouteButton }),
    );

    expect(reroute).not.toHaveBeenCalled();
    expect(mockResetDeviationEvidence).toHaveBeenCalledTimes(1);
  });

  test('replaces the route only after a successful confirmed recalculation', async () => {
    mockTrackingStatus = 'confirmation_required';
    const replacementRoute: ComparedRoute = {
      ...route,
      name: 'Nueva alternativa recomendada',
      route_id: 'rerouted_route',
      instructions: route.instructions.map((instruction, index) => ({
        ...instruction,
        text:
          index === 0
            ? 'Comienza la nueva ruta desde tu posición actual.'
            : instruction.text,
      })),
      score: { ...route.score, route_id: 'rerouted_route' },
    };
    const reroute = jest.fn().mockResolvedValue({
      scenario_id: 'pilot',
      scenario_name: 'Recálculo piloto',
      origin: { latitude: 40.43, longitude: -3.71 },
      destination: session.destination,
      profile_id: session.profile.profile_id,
      routes: [replacementRoute],
      rejected_routes: [],
    });
    const screen = await render(
      <NavigationScreen
        onFinish={jest.fn()}
        reroute={reroute}
        session={session}
      />,
    );
    const user = userEvent.setup();

    await user.press(
      screen.getByRole('button', { name: ES.navigation.confirmRerouteButton }),
    );

    await screen.findByText(ES.navigation.reroutingSuccess);
    expect(reroute).toHaveBeenCalledWith({
      current_position: { latitude: 40.43, longitude: -3.71 },
      destination: session.destination,
      effective_weights: session.effective_weights,
      profile: session.profile,
    });
    screen.getByText('Comienza la nueva ruta desde tu posición actual.');
    expect(mockPauseForReroute).toHaveBeenCalledTimes(1);
    expect(mockStartRerouteCooldown).toHaveBeenCalledTimes(1);
  });

  test('keeps the current route and offers retry after a provider failure', async () => {
    mockTrackingStatus = 'confirmation_required';
    const reroute = jest
      .fn()
      .mockRejectedValue(new RouteApiError('routing_provider_unavailable', 503));
    const screen = await render(
      <NavigationScreen
        onFinish={jest.fn()}
        reroute={reroute}
        session={session}
      />,
    );
    const user = userEvent.setup();

    await user.press(
      screen.getByRole('button', { name: ES.navigation.confirmRerouteButton }),
    );

    await screen.findByRole('alert', {
      name: `${ES.navigation.reroutingErrorTitle}. ${ES.navigation.reroutingErrors.routing_provider_unavailable}`,
    });
    screen.getByText(route.instructions[0].text);
    screen.getByRole('button', { name: ES.navigation.retryRerouteButton });
    expect(mockStartRerouteCooldown).not.toHaveBeenCalled();
    expect(mockResetDeviationEvidence).toHaveBeenCalledTimes(1);
  });
});
