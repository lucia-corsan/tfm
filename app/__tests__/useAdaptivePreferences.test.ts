import { act, renderHook } from '@testing-library/react-native';

import type { PreferenceWeights, RouteCompareResponse } from '@/api/types';
import type { PreferenceStorage } from '@/features/adaptive-preferences/storage';
import { useAdaptivePreferences } from '@/features/adaptive-preferences/useAdaptivePreferences';

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

async function renderController(storage: PreferenceStorage) {
  const rendered = await renderHook(() =>
    useAdaptivePreferences('balanced_demo', declared, storage),
  );
  await act(async () => {
    await Promise.resolve();
  });
  return rendered;
}

function comparison(routeCount = 2): RouteCompareResponse {
  const route = (routeId: string, distance: number) =>
    ({
      route_id: routeId,
      score: { costs: { ...declared, distance } },
    }) as RouteCompareResponse['routes'][number];
  return {
    scenario_id: 'pilot',
    scenario_name: 'Piloto',
    origin: { latitude: 40.4, longitude: -3.7 },
    destination: { latitude: 40.5, longitude: -3.6 },
    profile_id: 'balanced_demo',
    routes: [route('a', 0.1), route('b', 0.8)].slice(0, routeCount),
    rejected_routes: [],
  };
}

describe('controlador de preferencias adaptativas', () => {
  test('no registra elecciones hasta que la persona lo activa', async () => {
    const storage = new MemoryStorage();
    const { result } = await renderController(storage);
    expect(result.current.status).toBe('ready');

    let choiceResult;
    await act(async () => {
      choiceResult = await result.current.recordChoice(comparison(), 'a');
    });

    expect(choiceResult).toEqual({ kind: 'disabled', update: null });
    expect(result.current.learningState.choiceCount).toBe(0);
    expect(storage.values.size).toBe(0);
  });

  test('persiste una elección y la recupera al montar otro controlador', async () => {
    const storage = new MemoryStorage();
    const first = await renderController(storage);
    expect(first.result.current.status).toBe('ready');
    await act(async () => {
      await first.result.current.setEnabled(true);
    });
    await act(async () => {
      await first.result.current.recordChoice(comparison(), 'a');
    });
    expect(first.result.current.learningState.choiceCount).toBe(1);
    await first.unmount();

    const second = await renderController(storage);
    expect(second.result.current.status).toBe('ready');

    expect(second.result.current.learningState.enabled).toBe(true);
    expect(second.result.current.learningState.choiceCount).toBe(1);
  });

  test('una única alternativa permite continuar sin inventar aprendizaje', async () => {
    const storage = new MemoryStorage();
    const { result } = await renderController(storage);
    expect(result.current.status).toBe('ready');
    await act(async () => {
      await result.current.setEnabled(true);
    });

    let choiceResult;
    await act(async () => {
      choiceResult = await result.current.recordChoice(comparison(1), 'a');
    });

    expect(choiceResult).toEqual({
      kind: 'insufficient_alternatives',
      update: null,
    });
    expect(result.current.learningState.choiceCount).toBe(0);
  });

  test('reiniciar conserva la activación y borra las observaciones', async () => {
    const storage = new MemoryStorage();
    const { result } = await renderController(storage);
    expect(result.current.status).toBe('ready');
    await act(async () => {
      await result.current.setEnabled(true);
    });
    await act(async () => {
      await result.current.recordChoice(comparison(), 'a');
    });
    await act(async () => {
      await result.current.reset();
    });

    expect(result.current.learningState.enabled).toBe(true);
    expect(result.current.learningState.choiceCount).toBe(0);
  });
});
