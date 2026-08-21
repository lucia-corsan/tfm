import { useCallback, useMemo, useState } from 'react';

import {
  DEFAULT_ONBOARDING_ANSWERS,
  type OnboardingAnswers,
} from '@/features/onboarding/answers';
import {
  isQuestionSkipped,
  ONBOARDING_QUESTIONS,
  type Question,
  writeAnswer,
} from '@/features/onboarding/questions';

interface OnboardingController {
  answers: OnboardingAnswers;
  /** Índice de la pregunta actual dentro del cuestionario completo. */
  currentIndex: number;
  goBack: () => void;
  goNext: () => void;
  /** Pregunta que se muestra, o `null` si el cuestionario ha terminado. */
  question: Question | null;
  selectOption: (value: string) => void;
}

interface OnboardingOptions {
  initialAnswers?: OnboardingAnswers;
  onFinish: (answers: OnboardingAnswers) => void;
  screenReaderEnabled: boolean;
}

/**
 * Recorrido del cuestionario.
 *
 * Las preguntas omitidas se saltan en ambos sentidos, de modo que el botón de
 * retroceso nunca deja a la persona en una pregunta que no procede.
 */
export function useOnboarding({
  initialAnswers = DEFAULT_ONBOARDING_ANSWERS,
  onFinish,
  screenReaderEnabled,
}: OnboardingOptions): OnboardingController {
  const [answers, setAnswers] = useState(initialAnswers);
  const [index, setIndex] = useState(0);

  const question = useMemo(
    () => ONBOARDING_QUESTIONS[index] ?? null,
    [index],
  );

  const findNextIndex = useCallback(
    (from: number, direction: -1 | 1, current: OnboardingAnswers): number => {
      let candidate = from + direction;
      while (
        candidate >= 0 &&
        candidate < ONBOARDING_QUESTIONS.length &&
        isQuestionSkipped(
          ONBOARDING_QUESTIONS[candidate],
          current,
          screenReaderEnabled,
        )
      ) {
        candidate += direction;
      }
      return candidate;
    },
    [screenReaderEnabled],
  );

  const selectOption = useCallback(
    (value: string) => {
      if (question === null) {
        return;
      }
      setAnswers((previous) => writeAnswer(previous, question, value));
    },
    [question],
  );

  const goNext = useCallback(() => {
    const candidate = findNextIndex(index, 1, answers);
    if (candidate >= ONBOARDING_QUESTIONS.length) {
      onFinish(answers);
      return;
    }
    setIndex(candidate);
  }, [answers, findNextIndex, index, onFinish]);

  const goBack = useCallback(() => {
    const candidate = findNextIndex(index, -1, answers);
    if (candidate >= 0) {
      setIndex(candidate);
    }
  }, [answers, findNextIndex, index]);

  return {
    answers,
    currentIndex: index,
    goBack,
    goNext,
    question,
    selectOption,
  };
}
