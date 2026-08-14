import { render, userEvent } from '@testing-library/react-native';

import type { ComparedRoute } from '@/api/types';
import { NavigationScreen } from '@/screens/NavigationScreen';
import { ES } from '../i18n/es';

jest.mock('@/features/location/useForegroundRouteTracking', () => ({
  useForegroundRouteTracking: () => ({
    accuracyM: 5,
    distanceToRouteM: 0,
    status: 'on_route',
  }),
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

describe('<NavigationScreen />', () => {
  test('starts at the first instruction with accessible manual controls', async () => {
    const screen = await render(
      <NavigationScreen onFinish={jest.fn()} route={route} />,
    );

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
    screen.getByRole('text', { name: ES.navigation.unknownSummary(1) });
    screen.getByRole('text', { name: ES.navigation.unfavorableSummary(1) });
    screen.getByRole('header', { name: ES.navigation.gpsTitle });
    screen.getByRole('button', { name: ES.navigation.activateGpsButton });
    screen.getByRole('text', { name: ES.navigation.gpsStatus.on_route });
  });

  test('moves forward and backward without exceeding the sequence', async () => {
    const screen = await render(
      <NavigationScreen onFinish={jest.fn()} route={route} />,
    );
    const user = userEvent.setup();

    await user.press(
      screen.getByRole('button', { name: ES.navigation.nextButton }),
    );
    screen.getByRole('text', { name: route.instructions[1].text });
    screen.getByRole('text', { name: ES.navigation.progress(2, 3) });
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
    screen.getByRole('button', {
      disabled: true,
      name: ES.navigation.nextButton,
    });
  });

  test('finishes navigation only after an explicit action', async () => {
    const onFinish = jest.fn();
    const screen = await render(
      <NavigationScreen onFinish={onFinish} route={route} />,
    );
    const user = userEvent.setup();

    expect(onFinish).not.toHaveBeenCalled();
    await user.press(
      screen.getByRole('button', { name: ES.navigation.finishButton }),
    );
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
