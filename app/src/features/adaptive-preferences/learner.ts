import type {
  PreferenceWeights,
  RouteCompareResponse,
  ScoringDimension,
} from '@/api/types';

export const PREFERENCE_DIMENSIONS: readonly ScoringDimension[] = [
  'distance',
  'complex_crossings',
  'crossing_support',
  'sidewalk_evidence',
  'steps',
  'surface',
  'orientation_complexity',
  'slope',
  'uncertainty',
] as const;

export interface LearningConfig {
  learningRate: number;
  inverseTemperature: number;
  regularizationStrength: number;
  observationChoices: number;
  influenceStep: number;
  maximumInfluence: number;
  maximumLearnedUpdateL1: number;
}

export interface ComparedRouteChoice {
  routeId: string;
  costs: PreferenceWeights;
}

export interface PairwiseChoice {
  chosen: ComparedRouteChoice;
  unchosen: ComparedRouteChoice[];
}

export interface PreferenceLearningState {
  declaredWeights: PreferenceWeights;
  learnedWeights: PreferenceWeights;
  effectiveWeights: PreferenceWeights;
  choiceCount: number;
  enabled: boolean;
  config: LearningConfig;
}

export type LearningUpdateStatus =
  | 'disabled'
  | 'observation'
  | 'influential';

export interface WeightChange {
  dimension: ScoringDimension;
  learnedBefore: number;
  learnedAfter: number;
  effectiveBefore: number;
  effectiveAfter: number;
}

export interface PreferenceUpdate {
  status: LearningUpdateStatus;
  previousState: PreferenceLearningState;
  updatedState: PreferenceLearningState;
  pairsUsed: number;
  meanChoiceProbabilityBefore: number;
  meanChoiceProbabilityAfter: number;
  meanPairwiseLogisticLossBefore: number;
  meanPairwiseLogisticLossAfter: number;
  learnedChangeL1: number;
  effectiveChangeL1: number;
  changes: WeightChange[];
}

export const DEFAULT_LEARNING_CONFIG: LearningConfig = {
  learningRate: 0.06,
  inverseTemperature: 3,
  regularizationStrength: 0.05,
  observationChoices: 3,
  influenceStep: 0.1,
  maximumInfluence: 0.5,
  maximumLearnedUpdateL1: 0.12,
};

function asVector(weights: PreferenceWeights): number[] {
  return PREFERENCE_DIMENSIONS.map((dimension) => weights[dimension]);
}

function fromVector(values: readonly number[]): PreferenceWeights {
  return Object.fromEntries(
    PREFERENCE_DIMENSIONS.map((dimension, index) => [dimension, values[index]]),
  ) as unknown as PreferenceWeights;
}

function assertFiniteNonNegative(values: readonly number[]): void {
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('Los pesos deben ser números finitos no negativos.');
  }
}

export function normalizeWeights(weights: PreferenceWeights): PreferenceWeights {
  const values = asVector(weights);
  assertFiniteNonNegative(values);
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    throw new Error('Al menos un peso debe ser positivo.');
  }
  return fromVector(values.map((value) => value / total));
}

function projectToSimplex(values: readonly number[]): number[] {
  const ordered = [...values].sort((left, right) => right - left);
  let cumulative = 0;
  let thresholdIndex = 0;
  let threshold = 0;
  ordered.forEach((value, index) => {
    cumulative += value;
    const candidate = (cumulative - 1) / (index + 1);
    if (value - candidate > 0) {
      thresholdIndex = index + 1;
      threshold = candidate;
    }
  });
  if (thresholdIndex === 0) {
    return values.map(() => 1 / values.length);
  }
  const projected = values.map((value) => Math.max(value - threshold, 0));
  const total = projected.reduce((sum, value) => sum + value, 0);
  return projected.map((value) => value / total);
}

function sigmoid(value: number): number {
  if (value >= 0) {
    const negativeExponent = Math.exp(-value);
    return 1 / (1 + negativeExponent);
  }
  const positiveExponent = Math.exp(value);
  return positiveExponent / (1 + positiveExponent);
}

function logisticLoss(margin: number): number {
  if (margin >= 0) {
    return Math.log1p(Math.exp(-margin));
  }
  return -margin + Math.log1p(Math.exp(margin));
}

export function effectiveInfluence(
  config: LearningConfig,
  choiceCount: number,
  enabled = true,
): number {
  if (!enabled || choiceCount <= config.observationChoices) {
    return 0;
  }
  return Math.min(
    config.maximumInfluence,
    (choiceCount - config.observationChoices) * config.influenceStep,
  );
}

function mixEffectiveWeights(
  declared: PreferenceWeights,
  learned: PreferenceWeights,
  influence: number,
): PreferenceWeights {
  if (influence <= 0) {
    return { ...declared };
  }
  return normalizeWeights(
    fromVector(
      asVector(declared).map(
        (declaredValue, index) =>
          (1 - influence) * declaredValue +
          influence * asVector(learned)[index],
      ),
    ),
  );
}

function validateConfig(config: LearningConfig): LearningConfig {
  const values = Object.values(config);
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error('La configuración de aprendizaje no es válida.');
  }
  if (
    config.learningRate <= 0 ||
    config.inverseTemperature <= 0 ||
    config.regularizationStrength < 0 ||
    !Number.isInteger(config.observationChoices) ||
    config.observationChoices < 0 ||
    config.influenceStep <= 0 ||
    config.maximumInfluence <= 0 ||
    config.maximumInfluence > 0.5 ||
    config.maximumLearnedUpdateL1 <= 0
  ) {
    throw new Error('La configuración de aprendizaje queda fuera de sus límites.');
  }
  return { ...config };
}

export function initializeLearning(
  declaredWeights: PreferenceWeights,
  config: LearningConfig = DEFAULT_LEARNING_CONFIG,
  enabled = false,
): PreferenceLearningState {
  const declared = normalizeWeights(declaredWeights);
  return {
    declaredWeights: { ...declared },
    learnedWeights: { ...declared },
    effectiveWeights: { ...declared },
    choiceCount: 0,
    enabled,
    config: validateConfig(config),
  };
}

export function buildPairwiseChoice(
  comparison: RouteCompareResponse,
  chosenRouteId: string,
): PairwiseChoice {
  if (comparison.routes.length < 2) {
    throw new Error('El aprendizaje requiere al menos dos rutas aceptadas.');
  }
  const chosen = comparison.routes.find(
    (route) => route.route_id === chosenRouteId,
  );
  if (!chosen) {
    throw new Error('La ruta elegida debe pertenecer a la comparación aceptada.');
  }
  return {
    chosen: { routeId: chosen.route_id, costs: { ...chosen.score.costs } },
    unchosen: comparison.routes
      .filter((route) => route.route_id !== chosenRouteId)
      .map((route) => ({
        routeId: route.route_id,
        costs: { ...route.score.costs },
      })),
  };
}

function validateChoice(choice: PairwiseChoice): void {
  if (choice.unchosen.length < 1 || choice.unchosen.length > 2) {
    throw new Error('La elección debe contener una o dos alternativas no elegidas.');
  }
  const routeIds = [
    choice.chosen.routeId,
    ...choice.unchosen.map((route) => route.routeId),
  ];
  if (
    routeIds.some((routeId) => routeId.length === 0) ||
    new Set(routeIds).size !== routeIds.length
  ) {
    throw new Error('Las rutas de una elección deben ser distintas.');
  }
  [choice.chosen, ...choice.unchosen].forEach((route) =>
    assertFiniteNonNegative(asVector(route.costs)),
  );
}

function choiceStatistics(
  weights: PreferenceWeights,
  choice: PairwiseChoice,
  inverseTemperature: number,
): [number, number] {
  const weightVector = asVector(weights);
  const chosen = asVector(choice.chosen.costs);
  const statistics = choice.unchosen.map((alternative) => {
    const delta = asVector(alternative.costs).map(
      (unchosen, index) => unchosen - chosen[index],
    );
    const margin =
      inverseTemperature *
      weightVector.reduce(
        (total, weight, index) => total + weight * delta[index],
        0,
      );
    return [sigmoid(margin), logisticLoss(margin)] as const;
  });
  return [
    statistics.reduce((sum, item) => sum + item[0], 0) / statistics.length,
    statistics.reduce((sum, item) => sum + item[1], 0) / statistics.length,
  ];
}

function l1Distance(
  before: PreferenceWeights,
  after: PreferenceWeights,
): number {
  return PREFERENCE_DIMENSIONS.reduce(
    (total, dimension) => total + Math.abs(after[dimension] - before[dimension]),
    0,
  );
}

function buildChanges(
  previous: PreferenceLearningState,
  updated: PreferenceLearningState,
): WeightChange[] {
  return PREFERENCE_DIMENSIONS.map((dimension) => ({
    dimension,
    learnedBefore: previous.learnedWeights[dimension],
    learnedAfter: updated.learnedWeights[dimension],
    effectiveBefore: previous.effectiveWeights[dimension],
    effectiveAfter: updated.effectiveWeights[dimension],
  }));
}

export function updatePreferences(
  state: PreferenceLearningState,
  choice: PairwiseChoice,
): PreferenceUpdate {
  validateChoice(choice);
  const config = validateConfig(state.config);
  const [probabilityBefore, lossBefore] = choiceStatistics(
    state.learnedWeights,
    choice,
    config.inverseTemperature,
  );
  if (!state.enabled) {
    return {
      status: 'disabled',
      previousState: state,
      updatedState: state,
      pairsUsed: 0,
      meanChoiceProbabilityBefore: probabilityBefore,
      meanChoiceProbabilityAfter: probabilityBefore,
      meanPairwiseLogisticLossBefore: lossBefore,
      meanPairwiseLogisticLossAfter: lossBefore,
      learnedChangeL1: 0,
      effectiveChangeL1: 0,
      changes: buildChanges(state, state),
    };
  }

  const learnedBefore = asVector(state.learnedWeights);
  const declared = asVector(state.declaredWeights);
  const chosen = asVector(choice.chosen.costs);
  const gradient = learnedBefore.map(() => 0);

  choice.unchosen.forEach((alternative) => {
    const delta = asVector(alternative.costs).map(
      (unchosen, index) => unchosen - chosen[index],
    );
    const margin =
      config.inverseTemperature *
      learnedBefore.reduce(
        (total, weight, index) => total + weight * delta[index],
        0,
      );
    const probability = sigmoid(margin);
    delta.forEach((difference, index) => {
      gradient[index] +=
        (probability - 1) * config.inverseTemperature * difference;
    });
  });

  const pairCount = choice.unchosen.length;
  const regularizedGradient = gradient.map(
    (value, index) =>
      value / pairCount +
      config.regularizationStrength * (learnedBefore[index] - declared[index]),
  );
  const unprojected = learnedBefore.map(
    (value, index) => value - config.learningRate * regularizedGradient[index],
  );
  let projected = projectToSimplex(unprojected);
  const proposedChange = projected.reduce(
    (total, value, index) => total + Math.abs(value - learnedBefore[index]),
    0,
  );
  if (proposedChange > config.maximumLearnedUpdateL1) {
    const fraction = config.maximumLearnedUpdateL1 / proposedChange;
    projected = learnedBefore.map(
      (before, index) => before + fraction * (projected[index] - before),
    );
  }

  const learnedAfter = normalizeWeights(fromVector(projected));
  const choiceCount = state.choiceCount + 1;
  const effectiveAfter = mixEffectiveWeights(
    state.declaredWeights,
    learnedAfter,
    effectiveInfluence(config, choiceCount, true),
  );
  const updatedState: PreferenceLearningState = {
    declaredWeights: { ...state.declaredWeights },
    learnedWeights: learnedAfter,
    effectiveWeights: effectiveAfter,
    choiceCount,
    enabled: true,
    config,
  };
  const [probabilityAfter, lossAfter] = choiceStatistics(
    learnedAfter,
    choice,
    config.inverseTemperature,
  );

  return {
    status:
      choiceCount <= config.observationChoices ? 'observation' : 'influential',
    previousState: state,
    updatedState,
    pairsUsed: pairCount,
    meanChoiceProbabilityBefore: probabilityBefore,
    meanChoiceProbabilityAfter: probabilityAfter,
    meanPairwiseLogisticLossBefore: lossBefore,
    meanPairwiseLogisticLossAfter: lossAfter,
    learnedChangeL1: l1Distance(state.learnedWeights, learnedAfter),
    effectiveChangeL1: l1Distance(state.effectiveWeights, effectiveAfter),
    changes: buildChanges(state, updatedState),
  };
}

export function setLearningEnabled(
  state: PreferenceLearningState,
  enabled: boolean,
): PreferenceLearningState {
  return {
    ...state,
    enabled,
    effectiveWeights: mixEffectiveWeights(
      state.declaredWeights,
      state.learnedWeights,
      effectiveInfluence(state.config, state.choiceCount, enabled),
    ),
  };
}

export function resetLearning(
  state: PreferenceLearningState,
): PreferenceLearningState {
  return {
    ...state,
    learnedWeights: { ...state.declaredWeights },
    effectiveWeights: { ...state.declaredWeights },
    choiceCount: 0,
  };
}
