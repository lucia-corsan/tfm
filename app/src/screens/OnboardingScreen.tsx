import { useState } from 'react';

import type { OnboardingAnswers } from '@/features/onboarding/answers';
import { useOnboarding } from '@/features/onboarding/useOnboarding';
import { readAnswer } from '@/features/onboarding/questions';
import { useScreenReaderStatus } from '@/features/speech/useScreenReaderStatus';
import { OnboardingIntroScreen } from '@/screens/OnboardingIntroScreen';
import { OnboardingQuestionScreen } from '@/screens/OnboardingQuestionScreen';

interface OnboardingScreenProps {
  /** Permite revisar un perfil existente sin perder las respuestas anteriores. */
  initialAnswers?: OnboardingAnswers;
  /** Recibe las respuestas, ya sean contestadas u omitidas. */
  onFinish: (answers: OnboardingAnswers | null) => void;
}

/** Configuración inicial: presentación y catorce preguntas encadenadas. */
export function OnboardingScreen({
  initialAnswers,
  onFinish,
}: OnboardingScreenProps) {
  const [started, setStarted] = useState(false);
  const screenReaderStatus = useScreenReaderStatus();
  const controller = useOnboarding({
    ...(initialAnswers ? { initialAnswers } : {}),
    onFinish,
    screenReaderEnabled: screenReaderStatus === 'enabled',
  });

  if (!started) {
    return (
      <OnboardingIntroScreen
        onSkip={() => onFinish(null)}
        onStart={() => setStarted(true)}
      />
    );
  }

  if (controller.question === null) {
    return null;
  }

  return (
    <OnboardingQuestionScreen
      currentIndex={controller.currentIndex}
      onBack={
        controller.currentIndex === 0
          ? () => setStarted(false)
          : controller.goBack
      }
      onNext={controller.goNext}
      onSelect={controller.selectOption}
      question={controller.question}
      screenReaderDetected={screenReaderStatus === 'enabled'}
      selectedValue={readAnswer(controller.answers, controller.question)}
    />
  );
}
