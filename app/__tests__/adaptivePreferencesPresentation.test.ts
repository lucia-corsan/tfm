import type { PreferenceWeights } from '@/api/types';
import {
  initializeLearning,
  updatePreferences,
  type PairwiseChoice,
} from '@/features/adaptive-preferences/learner';
import { describeAdaptiveChoice } from '@/features/adaptive-preferences/presentation';
import { ES } from '../i18n/es';

const declaredWeights: PreferenceWeights = {
  distance: 1,
  complex_crossings: 1,
  crossing_support: 1,
  sidewalk_evidence: 1,
  steps: 1,
  surface: 1,
  orientation_complexity: 1,
  slope: 1,
  uncertainty: 1,
};

const chosenCosts: PreferenceWeights = {
  distance: 0.1,
  complex_crossings: 0.8,
  crossing_support: 0.5,
  sidewalk_evidence: 0.5,
  steps: 0.5,
  surface: 0.5,
  orientation_complexity: 0.5,
  slope: 0.5,
  uncertainty: 0.5,
};

const choice: PairwiseChoice = {
  chosen: { routeId: 'chosen', costs: chosenCosts },
  unchosen: [
    {
      routeId: 'unchosen',
      costs: { ...chosenCosts, distance: 0.9, complex_crossings: 0.2 },
    },
  ],
};

describe('explicación móvil del aprendizaje', () => {
  test('explica el periodo de observación sin prometer un cambio', () => {
    const update = updatePreferences(
      initializeLearning(declaredWeights, undefined, true),
      choice,
    );

    expect(
      describeAdaptiveChoice({ kind: 'updated', update }),
    ).toBe(ES.adaptivePreferences.observationRecorded(1, 3));
  });

  test('describe cambios efectivos y recuerda que la seguridad no cambia', () => {
    let state = initializeLearning(declaredWeights, undefined, true);
    let update = updatePreferences(state, choice);
    for (let index = 1; index < 4; index += 1) {
      state = update.updatedState;
      update = updatePreferences(state, choice);
    }

    const description = describeAdaptiveChoice({ kind: 'updated', update });

    expect(update.status).toBe('influential');
    expect(description).toContain('más importancia a distancia');
    expect(description).toContain('menos importancia a complejidad de los cruces');
    expect(description).toContain('Las restricciones críticas y los avisos no cambian.');
  });
});
