import { useState } from 'react';

import {
  DEFAULT_ONBOARDING_ANSWERS,
  SKIPPED_ONBOARDING_ANSWERS,
  type OnboardingAnswers,
} from '@/features/onboarding/answers';
import { useOnboarding } from '@/features/onboarding/useOnboarding';
import { readAnswer } from '@/features/onboarding/questions';
import { useScreenReaderStatus } from '@/features/speech/useScreenReaderStatus';
import { OnboardingIntroScreen } from '@/screens/OnboardingIntroScreen';
import { OnboardingQuestionScreen } from '@/screens/OnboardingQuestionScreen';
import { PresentationProvider } from '@/theme';

interface OnboardingScreenProps {
  /** Permite revisar un perfil existente sin perder las respuestas anteriores. */
  initialAnswers?: OnboardingAnswers;
  /** Mantiene un borrador para aplicar presentación y Ajustes al instante. */
  onAnswersChange?: (answers: OnboardingAnswers) => void;
  /** Recibe un perfil personalizado o el modo general si se omite. */
  onFinish: (answers: OnboardingAnswers) => void;
  onOpenSettings?: () => void;
}

/** Configuración inicial: presentación y catorce preguntas encadenadas. */
export function OnboardingScreen({
  initialAnswers,
  onAnswersChange,
  onFinish,
  onOpenSettings,
}: OnboardingScreenProps) {
  const [started, setStarted] = useState(false);
  const screenReaderStatus = useScreenReaderStatus();
  const controller = useOnboarding({
    ...(onAnswersChange
      ? { answers: initialAnswers ?? DEFAULT_ONBOARDING_ANSWERS }
      : {}),
    ...(initialAnswers ? { initialAnswers } : {}),
    ...(onAnswersChange ? { onAnswersChange } : {}),
    onFinish,
    screenReaderEnabled: screenReaderStatus === 'enabled',
  });

  if (!started) {
    return (
      <PresentationProvider mode={controller.answers.presentation}>
        <OnboardingIntroScreen
          {...(onOpenSettings ? { onOpenSettings } : {})}
          onSkip={() =>
            onFinish({
              ...SKIPPED_ONBOARDING_ANSWERS,
              presentation: controller.answers.presentation,
              speech: controller.answers.speech,
              speechRate: controller.answers.speechRate,
            })
          }
          onStart={() => setStarted(true)}
        />
      </PresentationProvider>
    );
  }

  if (controller.question === null) {
    return null;
  }

  return (
    <PresentationProvider mode={controller.answers.presentation}>
      <OnboardingQuestionScreen
        currentIndex={controller.currentIndex}
        onBack={
          controller.currentIndex === 0
            ? () => setStarted(false)
            : controller.goBack
        }
        onNext={controller.goNext}
        {...(onOpenSettings ? { onOpenSettings } : {})}
        onSelect={controller.selectOption}
        question={controller.question}
        screenReaderDetected={screenReaderStatus === 'enabled'}
        selectedValue={readAnswer(controller.answers, controller.question)}
      />
    </PresentationProvider>
  );
}
