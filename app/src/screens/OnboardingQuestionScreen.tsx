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
import { radii, spacing, usePresentation } from '@/theme';
import { ES } from '../../i18n/es';

interface OnboardingQuestionScreenProps {
  currentIndex: number;
  onBack: () => void;
  onNext: () => void;
  onOpenSettings?: () => void;
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
  onOpenSettings,
  onSelect,
  question,
  screenReaderDetected,
  selectedValue,
}: OnboardingQuestionScreenProps) {
  const presentation = usePresentation();
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
            {...(onOpenSettings
              ? {
                  actionHint: ES.settings.openHint,
                  actionLabel: ES.settings.openButton,
                  onAction: onOpenSettings,
                }
              : {})}
            backHint={ES.onboarding.backHint}
            backLabel={ES.onboarding.backButton}
            onBack={onBack}
            title={ES.onboarding.appBarTitle}
          />
          <StepProgress
            current={currentIndex + 1}
            label={ES.onboarding.progress(
              currentIndex + 1,
              ONBOARDING_QUESTION_COUNT,
            )}
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
            <AccessibleText style={{ color: presentation.colors.inkMuted }}>
              {question.detail}
            </AccessibleText>
          ) : null}

          {isLearningQuestion ? (
            <AccessibleText style={{ color: presentation.colors.inkMuted }}>
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
            <AccessibleText
              style={{ color: presentation.colors.inkSubtle }}
              variant="meta"
            >
              {question.example}
            </AccessibleText>
          ) : null}
        </>
      )}

      {isLearningQuestion && (
        <View style={styles.decision}>
          <View
            style={[
              styles.defaultChoice,
              { backgroundColor: presentation.colors.brandSoft },
            ]}
          >
            <AccessibleText
              accessible={false}
              style={[
                styles.defaultTag,
                { color: presentation.colors.brandOnSoft },
              ]}
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
    borderRadius: radii.card,
    gap: spacing.sm,
    padding: spacing.md,
  },
  defaultTag: { textAlign: 'center' },
  options: {
    gap: spacing.sm,
  },
});
