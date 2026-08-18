import type { PreferenceWeights } from '@/api/types';
import {
  initializeLearning,
  updatePreferences,
  type PairwiseChoice,
} from '@/features/adaptive-preferences/learner';
import {
  appendPreferenceChoice,
  clearPreferenceLearning,
  loadPreferenceChoices,
  loadPreferenceState,
  savePreferenceState,
  type PreferenceStorage,
} from '@/features/adaptive-preferences/storage';

const declared: PreferenceWeights = {
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
  complex_crossings: 0.5,
  crossing_support: 0.5,
  sidewalk_evidence: 0.5,
  steps: 0.5,
  surface: 0.5,
  orientation_complexity: 0.5,
  slope: 0.5,
  uncertainty: 0.2,
};

const unchosenCosts: PreferenceWeights = {
  ...chosenCosts,
  distance: 0.8,
  uncertainty: 0.7,
};

const choice: PairwiseChoice = {
  chosen: { routeId: 'accepted_a', costs: chosenCosts },
  unchosen: [{ routeId: 'accepted_b', costs: unchosenCosts }],
};

class MemoryStorage implements PreferenceStorage {
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

describe('persistencia local del aprendizaje adaptativo', () => {
  test('recupera estado, consentimiento y pesos después de recrear el controlador', async () => {
    const storage = new MemoryStorage();
    let state = initializeLearning(declared, undefined, true);
    for (let index = 0; index < 5; index += 1) {
      state = updatePreferences(state, choice).updatedState;
    }

    await savePreferenceState(storage, 'balanced_demo', state);
    const loaded = await loadPreferenceState(
      storage,
      'balanced_demo',
      declared,
    );

    expect(loaded.recoveredFromInvalidData).toBe(false);
    expect(loaded.state.choiceCount).toBe(state.choiceCount);
    expect(loaded.state.enabled).toBe(state.enabled);
    expect(loaded.state.config).toEqual(state.config);
    for (const dimension of Object.keys(declared) as (keyof PreferenceWeights)[]) {
      expect(loaded.state.declaredWeights[dimension]).toBeCloseTo(
        state.declaredWeights[dimension],
        12,
      );
      expect(loaded.state.learnedWeights[dimension]).toBeCloseTo(
        state.learnedWeights[dimension],
        12,
      );
      expect(loaded.state.effectiveWeights[dimension]).toBeCloseTo(
        state.effectiveWeights[dimension],
        12,
      );
    }
  });

  test('descarta de forma segura un estado corrupto', async () => {
    const storage = new MemoryStorage();
    await storage.setItem(
      'adaptive-preferences:v1:profile:balanced_demo',
      '{estado inválido',
    );

    const loaded = await loadPreferenceState(
      storage,
      'balanced_demo',
      declared,
    );

    expect(loaded.recoveredFromInvalidData).toBe(true);
    expect(loaded.state.enabled).toBe(false);
    expect(loaded.state.choiceCount).toBe(0);
  });

  test('guarda elecciones sin coordenadas, direcciones, geometrías ni audio', async () => {
    const storage = new MemoryStorage();
    const state = initializeLearning(declared, undefined, true);
    const update = updatePreferences(state, choice);

    await appendPreferenceChoice(
      storage,
      'balanced_demo',
      choice,
      update,
      new Date('2026-08-18T19:42:11.000Z'),
    );
    const history = await loadPreferenceChoices(storage, 'balanced_demo');
    const serialized = JSON.stringify(history);

    expect(history).toHaveLength(1);
    expect(history[0].recordedDay).toBe('2026-08-18');
    expect(serialized).not.toMatch(
      /latitude|longitude|geometry|instruction|address|audio|gps|scenario/i,
    );
  });

  test('no guarda una elección sin consentimiento', async () => {
    const storage = new MemoryStorage();
    const state = initializeLearning(declared);
    const update = updatePreferences(state, choice);

    await appendPreferenceChoice(
      storage,
      'balanced_demo',
      choice,
      update,
    );

    await expect(
      loadPreferenceChoices(storage, 'balanced_demo'),
    ).resolves.toEqual([]);
  });

  test('reiniciar elimina tanto el estado como el historial', async () => {
    const storage = new MemoryStorage();
    const state = initializeLearning(declared, undefined, true);
    const update = updatePreferences(state, choice);
    await savePreferenceState(storage, 'balanced_demo', update.updatedState);
    await appendPreferenceChoice(
      storage,
      'balanced_demo',
      choice,
      update,
    );

    await clearPreferenceLearning(storage, 'balanced_demo');

    const loaded = await loadPreferenceState(
      storage,
      'balanced_demo',
      declared,
    );
    expect(loaded.state.choiceCount).toBe(0);
    await expect(
      loadPreferenceChoices(storage, 'balanced_demo'),
    ).resolves.toEqual([]);
  });
});
