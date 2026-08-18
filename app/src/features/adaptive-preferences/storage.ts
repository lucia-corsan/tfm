import type { PreferenceWeights, ScoringDimension } from '@/api/types';
import {
  PREFERENCE_DIMENSIONS,
  initializeLearning,
  normalizeWeights,
  setLearningEnabled,
  type LearningConfig,
  type PairwiseChoice,
  type PreferenceLearningState,
  type PreferenceUpdate,
} from '@/features/adaptive-preferences/learner';

const STORAGE_VERSION = 1;
const MAXIMUM_STORED_CHOICES = 200;
const PROFILE_KEY_PREFIX = 'adaptive-preferences:v1:profile:';

export interface PreferenceStorage {
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  setItem(key: string, value: string): Promise<void>;
}

interface PersistedProfileEnvelope {
  version: number;
  profileId: string;
  state: PreferenceLearningState;
  choices: StoredPreferenceChoice[];
}

export interface StoredPreferenceChoice {
  version: number;
  profileId: string;
  recordedDay: string;
  choice: PairwiseChoice;
  stateBefore: PreferenceLearningState;
  stateAfter: PreferenceLearningState;
}

export interface LoadedPreferenceState {
  state: PreferenceLearningState;
  recoveredFromInvalidData: boolean;
}

function profileKey(profileId: string): string {
  return `${PROFILE_KEY_PREFIX}${encodeURIComponent(profileId)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('El estado persistido no es un objeto válido.');
  }
  return value as Record<string, unknown>;
}

function parseWeights(value: unknown): PreferenceWeights {
  const record = asRecord(value);
  const weights = Object.fromEntries(
    PREFERENCE_DIMENSIONS.map((dimension) => {
      const weight = record[dimension];
      if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0) {
        throw new Error('El estado persistido contiene pesos no válidos.');
      }
      return [dimension, weight];
    }),
  ) as unknown as PreferenceWeights;
  const total = PREFERENCE_DIMENSIONS.reduce(
    (sum, dimension) => sum + weights[dimension],
    0,
  );
  if (Math.abs(total - 1) > 1e-8) {
    throw new Error('Los pesos persistidos no suman uno.');
  }
  return weights;
}

function parseConfig(value: unknown): LearningConfig {
  const record = asRecord(value);
  const config: LearningConfig = {
    learningRate: Number(record.learningRate),
    inverseTemperature: Number(record.inverseTemperature),
    regularizationStrength: Number(record.regularizationStrength),
    observationChoices: Number(record.observationChoices),
    influenceStep: Number(record.influenceStep),
    maximumInfluence: Number(record.maximumInfluence),
    maximumLearnedUpdateL1: Number(record.maximumLearnedUpdateL1),
  };
  initializeLearning(
    Object.fromEntries(
      PREFERENCE_DIMENSIONS.map((dimension) => [dimension, 1]),
    ) as unknown as PreferenceWeights,
    config,
  );
  return config;
}

function equalWeights(
  left: PreferenceWeights,
  right: PreferenceWeights,
): boolean {
  return PREFERENCE_DIMENSIONS.every(
    (dimension) => Math.abs(left[dimension] - right[dimension]) <= 1e-8,
  );
}

function parseState(
  value: unknown,
  expectedDeclaredWeights: PreferenceWeights,
): PreferenceLearningState {
  const record = asRecord(value);
  const expectedDeclared = normalizeWeights(expectedDeclaredWeights);
  const persistedDeclared = parseWeights(record.declaredWeights);
  if (!equalWeights(expectedDeclared, persistedDeclared)) {
    throw new Error('El perfil declarado ha cambiado desde el estado persistido.');
  }
  const learnedWeights = parseWeights(record.learnedWeights);
  const choiceCount = record.choiceCount;
  const enabled = record.enabled;
  if (
    typeof choiceCount !== 'number' ||
    !Number.isInteger(choiceCount) ||
    choiceCount < 0 ||
    typeof enabled !== 'boolean'
  ) {
    throw new Error('El contador o el consentimiento persistidos no son válidos.');
  }
  const config = parseConfig(record.config);
  const baseState: PreferenceLearningState = {
    ...initializeLearning(expectedDeclared, config, false),
    learnedWeights,
    choiceCount,
  };
  return setLearningEnabled(baseState, enabled);
}

export async function loadPreferenceState(
  storage: PreferenceStorage,
  profileId: string,
  declaredWeights: PreferenceWeights,
): Promise<LoadedPreferenceState> {
  const initial = initializeLearning(declaredWeights);
  const serialized = await storage.getItem(profileKey(profileId));
  if (serialized === null) {
    return { state: initial, recoveredFromInvalidData: false };
  }
  try {
    const envelope = asRecord(JSON.parse(serialized));
    if (
      envelope.version !== STORAGE_VERSION ||
      envelope.profileId !== profileId
    ) {
      throw new Error('La versión o el perfil persistido no coinciden.');
    }
    return {
      state: parseState(envelope.state, declaredWeights),
      recoveredFromInvalidData: false,
    };
  } catch {
    await storage.removeItem(profileKey(profileId));
    return { state: initial, recoveredFromInvalidData: true };
  }
}

export async function savePreferenceState(
  storage: PreferenceStorage,
  profileId: string,
  state: PreferenceLearningState,
): Promise<void> {
  let choices: StoredPreferenceChoice[] = [];
  try {
    const current = await storage.getItem(profileKey(profileId));
    if (current !== null) {
      choices = parseChoiceHistory(asRecord(JSON.parse(current)).choices);
    }
  } catch {
    choices = [];
  }
  const envelope: PersistedProfileEnvelope = {
    version: STORAGE_VERSION,
    profileId,
    state,
    choices,
  };
  await storage.setItem(profileKey(profileId), JSON.stringify(envelope));
}

function parseChoiceHistory(value: unknown): StoredPreferenceChoice[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error('El historial persistido no es una lista.');
  }
  return value as StoredPreferenceChoice[];
}

export async function appendPreferenceChoice(
  storage: PreferenceStorage,
  profileId: string,
  choice: PairwiseChoice,
  update: PreferenceUpdate,
  now: Date = new Date(),
): Promise<void> {
  if (update.status === 'disabled') {
    return;
  }
  const key = profileKey(profileId);
  let history: StoredPreferenceChoice[];
  try {
    const serialized = await storage.getItem(key);
    history =
      serialized === null
        ? []
        : parseChoiceHistory(asRecord(JSON.parse(serialized)).choices);
  } catch {
    history = [];
  }
  const record: StoredPreferenceChoice = {
    version: STORAGE_VERSION,
    profileId,
    recordedDay: now.toISOString().slice(0, 10),
    choice,
    stateBefore: update.previousState,
    stateAfter: update.updatedState,
  };
  const retained = [...history, record].slice(-MAXIMUM_STORED_CHOICES);
  const envelope: PersistedProfileEnvelope = {
    version: STORAGE_VERSION,
    profileId,
    state: update.updatedState,
    choices: retained,
  };
  await storage.setItem(key, JSON.stringify(envelope));
}

export async function loadPreferenceChoices(
  storage: PreferenceStorage,
  profileId: string,
): Promise<StoredPreferenceChoice[]> {
  try {
    const serialized = await storage.getItem(profileKey(profileId));
    if (serialized === null) {
      return [];
    }
    return parseChoiceHistory(asRecord(JSON.parse(serialized)).choices);
  } catch {
    await storage.removeItem(profileKey(profileId));
    return [];
  }
}

export async function clearPreferenceLearning(
  storage: PreferenceStorage,
  profileId: string,
): Promise<void> {
  await storage.removeItem(profileKey(profileId));
}

export function mostChangedEffectiveDimensions(
  update: PreferenceUpdate,
  limit = 2,
): { dimension: ScoringDimension; difference: number }[] {
  return update.changes
    .map((change) => ({
      dimension: change.dimension,
      difference: change.effectiveAfter - change.effectiveBefore,
    }))
    .filter((change) => Math.abs(change.difference) > 1e-10)
    .sort(
      (left, right) =>
        Math.abs(right.difference) - Math.abs(left.difference),
    )
    .slice(0, limit);
}
