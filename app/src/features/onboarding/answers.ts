import type { MobilityProfile, PreferenceWeights } from '@/api/types';
import type {
  SpeechPreferences,
  SpeechRateId,
} from '@/features/speech/speechPreferences';

/** Cómo tratar una ruta con escalones confirmados. */
export type StepsAnswer = 'avoid' | 'exclude' | 'inform';

/** Recorrido adicional aceptable frente a la alternativa más corta. */
export type DetourAnswer = 'double' | 'fifty' | 'ten' | 'twentyFive';

/** Importancia declarada de un factor de comparación. */
export type PriorityAnswer = 'high' | 'low' | 'medium' | 'none';

/** Uso de la voz propia de la aplicación. */
export type SpeechAnswer = 'automatic' | 'never' | 'onDemand';

/** Ajuste visual solicitado sobre el del sistema. */
export type PresentationAnswer = 'both' | 'highContrast' | 'largeText' | 'system';

/** Procedencia de las preferencias usadas para comparar rutas. */
export type ProfileMode = 'generic' | 'personalized';

/** Dimensiones que el cuestionario expone como prioridad graduable. */
export const PRIORITY_DIMENSIONS = [
  'distance',
  'complex_crossings',
  'crossing_support',
  'sidewalk_evidence',
  'surface',
  'orientation_complexity',
  'slope',
  'uncertainty',
] as const;

export type PriorityDimension = (typeof PRIORITY_DIMENSIONS)[number];

export interface OnboardingAnswers {
  adaptiveLearning: boolean;
  detour: DetourAnswer;
  presentation: PresentationAnswer;
  profileMode: ProfileMode;
  priorities: Record<PriorityDimension, PriorityAnswer>;
  speech: SpeechAnswer;
  speechRate: SpeechRateId;
  steps: StepsAnswer;
}

/**
 * Respuestas iniciales.
 *
 * Coinciden con las opciones marcadas de antemano en el cuestionario: un perfil
 * equilibrado, el desvío recomendado y el aprendizaje desactivado.
 */
export const DEFAULT_ONBOARDING_ANSWERS: OnboardingAnswers = {
  adaptiveLearning: false,
  detour: 'fifty',
  presentation: 'system',
  profileMode: 'personalized',
  priorities: {
    complex_crossings: 'medium',
    crossing_support: 'medium',
    distance: 'medium',
    orientation_complexity: 'medium',
    sidewalk_evidence: 'medium',
    slope: 'medium',
    surface: 'medium',
    uncertainty: 'medium',
  },
  speech: 'onDemand',
  speechRate: 'normal',
  steps: 'exclude',
};

/** Ajustes seguros usados cuando la persona omite el cuestionario. */
export const SKIPPED_ONBOARDING_ANSWERS: OnboardingAnswers = {
  ...DEFAULT_ONBOARDING_ANSWERS,
  profileMode: 'generic',
};

/** Peso declarado que corresponde a cada nivel de prioridad. */
const PRIORITY_WEIGHTS: Record<PriorityAnswer, number> = {
  high: 3,
  low: 1,
  medium: 2,
  none: 0,
};

/** Proporción máxima de desvío admitida para cada respuesta. */
const DETOUR_RATIOS: Record<DetourAnswer, number> = {
  double: 2,
  fifty: 1.5,
  ten: 1.1,
  twentyFive: 1.25,
};

/**
 * Traduce las respuestas al perfil que se envía al servidor.
 *
 * Las restricciones que el cuestionario no pregunta se mantienen siempre
 * activas: el acceso peatonal confirmado y la compatibilidad de los cruces son
 * barreras críticas del sistema, no preferencias configurables.
 */
export function buildProfileFromAnswers(
  answers: OnboardingAnswers,
): MobilityProfile {
  let declaredWeights: PreferenceWeights = {
    complex_crossings: PRIORITY_WEIGHTS[answers.priorities.complex_crossings],
    crossing_support: PRIORITY_WEIGHTS[answers.priorities.crossing_support],
    distance: PRIORITY_WEIGHTS[answers.priorities.distance],
    orientation_complexity:
      PRIORITY_WEIGHTS[answers.priorities.orientation_complexity],
    sidewalk_evidence: PRIORITY_WEIGHTS[answers.priorities.sidewalk_evidence],
    slope: PRIORITY_WEIGHTS[answers.priorities.slope],
    steps: answers.steps === 'inform' ? 0 : PRIORITY_WEIGHTS.high,
    surface: PRIORITY_WEIGHTS[answers.priorities.surface],
    uncertainty: PRIORITY_WEIGHTS[answers.priorities.uncertainty],
  };

  const totalWeight = Object.values(declaredWeights).reduce(
    (total, weight) => total + weight,
    0,
  );
  if (totalWeight === 0) {
    declaredWeights = {
      complex_crossings: 1,
      crossing_support: 1,
      distance: 1,
      orientation_complexity: 1,
      sidewalk_evidence: 1,
      slope: 1,
      steps: 1,
      surface: 1,
      uncertainty: 1,
    };
  }

  return {
    avoid_incompatible_crossings: true,
    avoid_steps: answers.steps === 'exclude',
    declared_weights: declaredWeights,
    maximum_detour_ratio: DETOUR_RATIOS[answers.detour],
    maximum_slope_percent: null,
    profile_id: 'onboarding_profile',
    require_pedestrian_access: true,
  };
}

/**
 * Construye la identidad local de una configuración relevante para aprender.
 *
 * No incluye presentación, voz ni el consentimiento: cambiar esos ajustes no
 * altera qué rutas estaban disponibles. Sí incluye pesos y restricciones, de
 * modo que una elección observada bajo unas reglas no contamine otra
 * configuración materialmente distinta.
 */
export function buildAdaptiveLearningProfileId(
  answers: OnboardingAnswers,
): string {
  const profile = buildProfileFromAnswers(answers);
  const weightSignature = Object.entries(profile.declared_weights)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([dimension, weight]) => `${dimension}=${weight}`)
    .join(',');
  return [
    'onboarding-v2',
    `steps=${profile.avoid_steps ? 'exclude' : 'gradual'}`,
    `detour=${profile.maximum_detour_ratio}`,
    `weights=${weightSignature}`,
  ].join('|');
}

/** Traduce las respuestas de voz a los controles de navegación. */
export function buildSpeechPreferencesFromAnswers(
  answers: OnboardingAnswers,
): SpeechPreferences {
  return {
    automaticPlayback: answers.speech === 'automatic',
    enabled: answers.speech !== 'never',
    rateId: answers.speechRate,
  };
}
