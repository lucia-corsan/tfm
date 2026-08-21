import type {
  DetourAnswer,
  OnboardingAnswers,
  PresentationAnswer,
  PriorityAnswer,
  PriorityDimension,
  SpeechAnswer,
  StepsAnswer,
} from '@/features/onboarding/answers';
import { PRIORITY_DIMENSIONS } from '@/features/onboarding/answers';
import type { SpeechRateId } from '@/features/speech/speechPreferences';
import { ES } from '../../../i18n/es';

export interface QuestionOption {
  /** Texto visible y etiqueta accesible de la opción. */
  label: string;
  value: string;
}

export type QuestionId =
  | 'detour'
  | 'learning'
  | 'presentation'
  | 'speech'
  | 'speechRate'
  | 'steps'
  | `priority:${PriorityDimension}`;

export interface Question {
  /** Aclaración que se lee junto al enunciado. */
  detail?: string;
  /** Ejemplo que se lee después de las opciones. */
  example?: string;
  id: QuestionId;
  options: QuestionOption[];
  title: string;
}

const priorityOptions: QuestionOption[] = (
  ['none', 'low', 'medium', 'high'] satisfies PriorityAnswer[]
).map((value) => ({
  label: ES.onboarding.priorityOptions[value],
  value,
}));

/**
 * Cuestionario completo, en el orden en que se recorre.
 *
 * Las dos primeras preguntas fijan límites que pueden descartar una ruta antes
 * de puntuarla; las ocho siguientes gradúan prioridades; las cuatro últimas
 * ajustan la lectura, la presentación y el consentimiento del aprendizaje.
 */
export const ONBOARDING_QUESTIONS: Question[] = [
  {
    id: 'steps',
    options: (['exclude', 'avoid', 'inform'] satisfies StepsAnswer[]).map(
      (value) => ({ label: ES.onboarding.steps.options[value], value }),
    ),
    title: ES.onboarding.steps.title,
  },
  {
    example: ES.onboarding.detour.example,
    id: 'detour',
    options: (
      ['ten', 'twentyFive', 'fifty', 'double'] satisfies DetourAnswer[]
    ).map((value) => ({ label: ES.onboarding.detour.options[value], value })),
    title: ES.onboarding.detour.title,
  },
  ...PRIORITY_DIMENSIONS.map((dimension): Question => ({
    ...(dimension === 'crossing_support'
      ? { detail: ES.onboarding.priorities.crossingSupportDetail }
      : {}),
    id: `priority:${dimension}`,
    options: priorityOptions,
    title: ES.onboarding.priorities[dimension],
  })),
  {
    id: 'speech',
    options: (
      ['automatic', 'onDemand', 'never'] satisfies SpeechAnswer[]
    ).map((value) => ({ label: ES.onboarding.speech.options[value], value })),
    title: ES.onboarding.speech.title,
  },
  {
    id: 'speechRate',
    options: (
      ['slow', 'normal', 'fast', 'very_fast'] satisfies SpeechRateId[]
    ).map((value) => ({
      label: ES.onboarding.speechRate.options[value],
      value,
    })),
    title: ES.onboarding.speechRate.title,
  },
  {
    id: 'presentation',
    options: (
      [
        'system',
        'largeText',
        'highContrast',
        'both',
      ] satisfies PresentationAnswer[]
    ).map((value) => ({
      label: ES.onboarding.presentation.options[value],
      value,
    })),
    title: ES.onboarding.presentation.title,
  },
  {
    id: 'learning',
    options: [],
    title: ES.onboarding.learning.title,
  },
];

/** Número de preguntas que se anuncia en el progreso. */
export const ONBOARDING_QUESTION_COUNT = ONBOARDING_QUESTIONS.length;

/** Lee la respuesta actual de una pregunta. */
export function readAnswer(
  answers: OnboardingAnswers,
  question: Question,
): string {
  if (question.id.startsWith('priority:')) {
    const dimension = question.id.slice('priority:'.length) as PriorityDimension;
    return answers.priorities[dimension];
  }
  switch (question.id) {
    case 'detour':
      return answers.detour;
    case 'learning':
      return answers.adaptiveLearning ? 'accept' : 'decline';
    case 'presentation':
      return answers.presentation;
    case 'speech':
      return answers.speech;
    case 'speechRate':
      return answers.speechRate;
    default:
      return answers.steps;
  }
}

/** Devuelve las respuestas con una pregunta actualizada. */
export function writeAnswer(
  answers: OnboardingAnswers,
  question: Question,
  value: string,
): OnboardingAnswers {
  if (question.id.startsWith('priority:')) {
    const dimension = question.id.slice('priority:'.length) as PriorityDimension;
    return {
      ...answers,
      priorities: {
        ...answers.priorities,
        [dimension]: value as PriorityAnswer,
      },
    };
  }
  switch (question.id) {
    case 'detour':
      return { ...answers, detour: value as DetourAnswer };
    case 'learning':
      return { ...answers, adaptiveLearning: value === 'accept' };
    case 'presentation':
      return { ...answers, presentation: value as PresentationAnswer };
    case 'speech':
      return { ...answers, speech: value as SpeechAnswer };
    case 'speechRate':
      return { ...answers, speechRate: value as SpeechRateId };
    default:
      return { ...answers, steps: value as StepsAnswer };
  }
}

/**
 * Indica si una pregunta debe omitirse.
 *
 * La velocidad de la voz propia no se pregunta cuando hay un lector de pantalla
 * activo, porque se configura en los ajustes de Android, ni cuando se ha pedido
 * leer las instrucciones solo en pantalla.
 */
export function isQuestionSkipped(
  question: Question,
  answers: OnboardingAnswers,
  screenReaderEnabled: boolean,
): boolean {
  if (question.id !== 'speechRate') {
    return false;
  }
  return screenReaderEnabled || answers.speech === 'never';
}
