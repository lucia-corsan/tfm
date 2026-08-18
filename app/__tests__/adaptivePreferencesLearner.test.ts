import type { PreferenceWeights, RouteCompareResponse } from '@/api/types';
import {
  buildPairwiseChoice,
  initializeLearning,
  PREFERENCE_DIMENSIONS,
  resetLearning,
  setLearningEnabled,
  updatePreferences,
  type PairwiseChoice,
} from '@/features/adaptive-preferences/learner';

interface GoldenCase {
  repetitions: number;
  declared_weights: PreferenceWeights;
  choice: {
    chosen: { route_id: string; costs: PreferenceWeights };
    unchosen: { route_id: string; costs: PreferenceWeights }[];
  };
  expected: {
    choice_count: number;
    status: string;
    learned_weights: PreferenceWeights;
    effective_weights: PreferenceWeights;
    mean_choice_probability_before: number;
    mean_choice_probability_after: number;
    learned_change_l1: number;
    effective_change_l1: number;
  };
}

const golden = require('../../shared/adaptive-preference-golden-case.json') as GoldenCase;

function choiceFromGoldenCase(): PairwiseChoice {
  return {
    chosen: {
      routeId: golden.choice.chosen.route_id,
      costs: golden.choice.chosen.costs,
    },
    unchosen: golden.choice.unchosen.map((route) => ({
      routeId: route.route_id,
      costs: route.costs,
    })),
  };
}

function expectWeightsClose(
  actual: PreferenceWeights,
  expected: PreferenceWeights,
): void {
  PREFERENCE_DIMENSIONS.forEach((dimension) => {
    expect(actual[dimension]).toBeCloseTo(expected[dimension], 12);
  });
}

describe('aprendizaje adaptativo local', () => {
  test('coincide con el caso dorado calculado por la implementación Python', () => {
    let state = initializeLearning(golden.declared_weights, undefined, true);
    const choice = choiceFromGoldenCase();
    let update = updatePreferences(state, choice);

    for (let index = 1; index < golden.repetitions; index += 1) {
      state = update.updatedState;
      update = updatePreferences(state, choice);
    }

    expect(update.status).toBe(golden.expected.status);
    expect(update.updatedState.choiceCount).toBe(golden.expected.choice_count);
    expectWeightsClose(
      update.updatedState.learnedWeights,
      golden.expected.learned_weights,
    );
    expectWeightsClose(
      update.updatedState.effectiveWeights,
      golden.expected.effective_weights,
    );
    expect(update.meanChoiceProbabilityBefore).toBeCloseTo(
      golden.expected.mean_choice_probability_before,
      12,
    );
    expect(update.meanChoiceProbabilityAfter).toBeCloseTo(
      golden.expected.mean_choice_probability_after,
      12,
    );
    expect(update.learnedChangeL1).toBeCloseTo(
      golden.expected.learned_change_l1,
      12,
    );
    expect(update.effectiveChangeL1).toBeCloseTo(
      golden.expected.effective_change_l1,
      12,
    );
  });

  test('observa tres elecciones antes de influir en una comparación', () => {
    let state = initializeLearning(golden.declared_weights, undefined, true);
    const choice = choiceFromGoldenCase();

    for (let expectedCount = 1; expectedCount <= 3; expectedCount += 1) {
      const update = updatePreferences(state, choice);
      state = update.updatedState;
      expect(update.status).toBe('observation');
      expect(state.choiceCount).toBe(expectedCount);
      expectWeightsClose(state.effectiveWeights, state.declaredWeights);
    }

    const fourth = updatePreferences(state, choice);
    expect(fourth.status).toBe('influential');
    expect(fourth.effectiveChangeL1).toBeGreaterThan(0);
  });

  test('mantiene pesos válidos tras muchas elecciones', () => {
    let state = initializeLearning(golden.declared_weights, undefined, true);
    const choice = choiceFromGoldenCase();

    for (let index = 0; index < 500; index += 1) {
      state = updatePreferences(state, choice).updatedState;
      [state.learnedWeights, state.effectiveWeights].forEach((weights) => {
        const values = PREFERENCE_DIMENSIONS.map(
          (dimension) => weights[dimension],
        );
        expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
        expect(values.reduce((total, value) => total + value, 0)).toBeCloseTo(
          1,
          12,
        );
      });
    }
  });

  test('desactivar pausa la influencia y reiniciar borra lo aprendido', () => {
    let state = initializeLearning(golden.declared_weights, undefined, true);
    for (let index = 0; index < 6; index += 1) {
      state = updatePreferences(state, choiceFromGoldenCase()).updatedState;
    }

    const disabled = setLearningEnabled(state, false);
    const ignored = updatePreferences(disabled, choiceFromGoldenCase());
    const reenabled = setLearningEnabled(disabled, true);
    const reset = resetLearning(reenabled);

    expectWeightsClose(disabled.effectiveWeights, disabled.declaredWeights);
    expect(ignored.status).toBe('disabled');
    expectWeightsClose(reenabled.effectiveWeights, state.effectiveWeights);
    expect(reset.choiceCount).toBe(0);
    expectWeightsClose(reset.learnedWeights, reset.declaredWeights);
  });

  test('solo construye observaciones con las rutas aceptadas mostradas', () => {
    const costs = golden.choice.chosen.costs;
    const comparison = {
      routes: [
        { route_id: 'accepted_a', score: { costs } },
        { route_id: 'accepted_b', score: { costs } },
      ],
      rejected_routes: [{ route_id: 'rejected' }],
    } as unknown as RouteCompareResponse;

    const choice = buildPairwiseChoice(comparison, 'accepted_a');

    expect(choice.chosen.routeId).toBe('accepted_a');
    expect(choice.unchosen.map((route) => route.routeId)).toEqual([
      'accepted_b',
    ]);
    expect(() => buildPairwiseChoice(comparison, 'rejected')).toThrow(
      /comparación aceptada/,
    );
  });

  test('una única ruta aceptada no genera una señal de aprendizaje', () => {
    const comparison = {
      routes: [
        {
          route_id: 'only_route',
          score: { costs: golden.choice.chosen.costs },
        },
      ],
      rejected_routes: [],
    } as unknown as RouteCompareResponse;

    expect(() => buildPairwiseChoice(comparison, 'only_route')).toThrow(
      /al menos dos rutas/,
    );
  });
});
