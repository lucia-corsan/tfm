import {
  PRIORITY_DIMENSIONS,
  type OnboardingAnswers,
} from '@/features/onboarding/answers';
import type { PreferenceStorage } from '@/features/adaptive-preferences/storage';

const STORAGE_KEY = 'onboarding:v1:answers';

interface PersistedAnswers {
  answers: OnboardingAnswers;
  version: number;
}

function hasValue<T extends string>(
  allowed: readonly T[],
  value: unknown,
): value is T {
  return typeof value === 'string' && allowed.includes(value as T);
}

function isOnboardingAnswers(value: unknown): value is OnboardingAnswers {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const answers = value as Partial<OnboardingAnswers>;
  if (
    typeof answers.adaptiveLearning !== 'boolean' ||
    !hasValue(['double', 'fifty', 'ten', 'twentyFive'], answers.detour) ||
    !hasValue(
      ['both', 'highContrast', 'largeText', 'system'],
      answers.presentation,
    ) ||
    !hasValue(['automatic', 'never', 'onDemand'], answers.speech) ||
    !hasValue(['fast', 'normal', 'slow', 'very_fast'], answers.speechRate) ||
    !hasValue(['avoid', 'exclude', 'inform'], answers.steps) ||
    typeof answers.priorities !== 'object' ||
    answers.priorities === null
  ) {
    return false;
  }
  return PRIORITY_DIMENSIONS.every((dimension) =>
    hasValue(
      ['high', 'low', 'medium', 'none'],
      answers.priorities?.[dimension],
    ),
  );
}

/**
 * Lee las respuestas guardadas en el dispositivo.
 *
 * Ante un contenido incompatible o dañado devuelve las respuestas iniciales, sin
 * propagar el error: la configuración puede rehacerse, pero la aplicación no
 * debe quedar bloqueada por ella.
 */
export async function loadOnboardingAnswers(
  storage: PreferenceStorage,
): Promise<OnboardingAnswers | null> {
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    const parsed = JSON.parse(raw) as PersistedAnswers;
    if (parsed.version !== 1 || !isOnboardingAnswers(parsed.answers)) {
      return null;
    }
    return parsed.answers;
  } catch {
    return null;
  }
}

/** Guarda las respuestas solo en este dispositivo. */
export async function saveOnboardingAnswers(
  storage: PreferenceStorage,
  answers: OnboardingAnswers,
): Promise<void> {
  const envelope: PersistedAnswers = { answers, version: 1 };
  try {
    await storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // La configuración sigue vigente en memoria durante esta sesión.
  }
}

/** Borra las respuestas guardadas. */
export async function clearOnboardingAnswers(
  storage: PreferenceStorage,
): Promise<void> {
  try {
    await storage.removeItem(STORAGE_KEY);
  } catch {
    // Nada que recuperar: la configuración vuelve a pedirse igualmente.
  }
}
