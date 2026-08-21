import { StyleSheet, View } from 'react-native';

import { AccessibleText } from '@/components/AccessibleText';
import { ActionBand } from '@/components/ActionBand';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProfileOption } from '@/components/ProfileOption';
import { Screen } from '@/components/Screen';
import { StepProgress } from '@/components/StepProgress';
import { TopBar } from '@/components/TopBar';
import {
  ONBOARDING_QUESTION_COUNT,
  type Question,
} from '@/features/onboarding/questions';
import { colors, radii, spacing } from '@/theme';
import { ES } from '../../i18n/es';

interface OnboardingQuestionScreenProps {
  currentIndex: number;
  onBack: () => void;
  onNext: () => void;
  onSelect: (value: string) => void;
  question: Question;
  /** Se muestra en lugar de la pregunta de voz cuando hay lector activo. */
  screenReaderDetected: boolean;
  selectedValue: string;
}

/**
 * Una pregunta del cuestionario por pantalla.
 *
 * Todas comparten cabecera, progreso y banda de acción, de modo que solo cambia
 * el enunciado y sus opciones. El progreso se enuncia como texto en la barra
 * superior, no solo con la barra de segmentos.
 */
export function OnboardingQuestionScreen({
  currentIndex,
  onBack,
  onNext,
  onSelect,
  question,
  screenReaderDetected,
  selectedValue,
}: OnboardingQuestionScreenProps) {
  const isLearningQuestion = question.id === 'learning';
  const showsScreenReaderNotice =
    question.id === 'speech' && screenReaderDetected;

  return (
    <Screen
      band={
        isLearningQuestion ? undefined : (
          <ActionBand
            accessibilityHint={ES.onboarding.nextHint}
            label={ES.onboarding.nextButton}
            onPress={onNext}
          />
        )
      }
      header={
        <>
          <TopBar
            backHint={ES.onboarding.backHint}
            backLabel={ES.onboarding.backButton}
            onBack={onBack}
            title={ES.onboarding.progress(
              currentIndex + 1,
              ONBOARDING_QUESTION_COUNT,
            )}
          />
          <StepProgress
            current={currentIndex + 1}
            total={ONBOARDING_QUESTION_COUNT}
          />
        </>
      }
    >
      {showsScreenReaderNotice ? (
        <AccessibleText accessibilityRole="header" variant="display">
          {ES.onboarding.speech.screenReaderDetected}
        </AccessibleText>
      ) : (
        <>
          <AccessibleText accessibilityRole="header" variant="display">
            {question.title}
          </AccessibleText>
          {question.detail ? (
            <AccessibleText style={styles.detail}>
              {question.detail}
            </AccessibleText>
          ) : null}

          {isLearningQuestion ? (
            <AccessibleText style={styles.detail}>
              {ES.onboarding.learning.description}
            </AccessibleText>
          ) : (
            <View
              accessibilityLabel={ES.onboarding.optionGroupLabel}
              accessibilityRole="radiogroup"
              style={styles.options}
            >
              {question.options.map((option) => (
                <ProfileOption
                  hint={ES.onboarding.nextHint}
                  key={option.value}
                  label={option.label}
                  onPress={() => onSelect(option.value)}
                  selected={selectedValue === option.value}
                />
              ))}
            </View>
          )}

          {question.example ? (
            <AccessibleText style={styles.example} variant="meta">
              {question.example}
            </AccessibleText>
          ) : null}
        </>
      )}

      {isLearningQuestion && (
        <View style={styles.decision}>
          <View style={styles.defaultChoice}>
            <AccessibleText
              accessible={false}
              style={styles.defaultTag}
              variant="meta"
            >
              {ES.onboarding.learning.defaultTag}
            </AccessibleText>
            <PrimaryButton
              accessibilityHint={ES.onboarding.learning.declineHint}
              accessibilityLabel={`${ES.onboarding.learning.declineButton} ${ES.onboarding.learning.defaultTag}.`}
              label={ES.onboarding.learning.declineButton}
              onPress={() => {
                onSelect('decline');
                onNext();
              }}
            />
          </View>
          <PrimaryButton
            accessibilityHint={ES.onboarding.learning.acceptHint}
            label={ES.onboarding.learning.acceptButton}
            onPress={() => {
              onSelect('accept');
              onNext();
            }}
            variant="secondary"
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  decision: {
    gap: spacing.md,
  },
  defaultChoice: {
    backgroundColor: colors.brandSoft,
    borderRadius: radii.card,
    gap: spacing.sm,
    padding: spacing.md,
  },
  defaultTag: {
    color: colors.brandOnSoft,
    textAlign: 'center',
  },
  detail: {
    color: colors.inkMuted,
  },
  example: {
    color: colors.inkSubtle,
  },
  options: {
    gap: spacing.sm,
  },
});
