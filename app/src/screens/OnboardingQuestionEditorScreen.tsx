import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AccessibleText } from '@/components/AccessibleText';
import { ActionBand } from '@/components/ActionBand';
import { ProfileOption } from '@/components/ProfileOption';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import type { OnboardingAnswers } from '@/features/onboarding/answers';
import {
  ONBOARDING_QUESTIONS,
  readAnswer,
  type QuestionId,
  writeAnswer,
} from '@/features/onboarding/questions';
import { spacing, PresentationProvider, usePresentation } from '@/theme';
import { ES } from '../../i18n/es';

interface OnboardingQuestionEditorScreenProps {
  answers: OnboardingAnswers;
  onBack: () => void;
  onSave: (answers: OnboardingAnswers) => void;
  questionId: QuestionId;
}

/** Edita una única respuesta del perfil y solo la persiste al confirmar. */
export function OnboardingQuestionEditorScreen(
  props: OnboardingQuestionEditorScreenProps,
) {
  const [draft, setDraft] = useState(props.answers);
  return (
    <PresentationProvider mode={draft.presentation}>
      <QuestionEditor {...props} draft={draft} onDraftChange={setDraft} />
    </PresentationProvider>
  );
}

interface QuestionEditorProps extends OnboardingQuestionEditorScreenProps {
  draft: OnboardingAnswers;
  onDraftChange: (answers: OnboardingAnswers) => void;
}

function QuestionEditor({
  draft,
  onBack,
  onDraftChange,
  onSave,
  questionId,
}: QuestionEditorProps) {
  const presentation = usePresentation();
  const question = useMemo(
    () => ONBOARDING_QUESTIONS.find((item) => item.id === questionId),
    [questionId],
  );

  if (!question) {
    return null;
  }

  const options =
    question.id === 'learning'
      ? [
          {
            label: ES.onboarding.learning.declineButton,
            value: 'decline',
          },
          {
            label: ES.onboarding.learning.acceptButton,
            value: 'accept',
          },
        ]
      : question.options;
  const selectedValue = readAnswer(draft, question);

  return (
    <Screen
      band={
        <ActionBand
          accessibilityHint={ES.settings.editor.saveHint}
          label={ES.settings.editor.saveButton}
          onPress={() => onSave(draft)}
        />
      }
      header={
        <TopBar
          backHint={ES.settings.editor.backHint}
          backLabel={ES.settings.editor.backButton}
          onBack={onBack}
          title={ES.settings.editor.title}
        />
      }
    >
      <AccessibleText accessibilityRole="header" variant="display">
        {question.title}
      </AccessibleText>
      {question.detail ? (
        <AccessibleText style={{ color: presentation.colors.inkMuted }}>
          {question.detail}
        </AccessibleText>
      ) : null}
      {question.id === 'learning' ? (
        <AccessibleText style={{ color: presentation.colors.inkMuted }}>
          {ES.onboarding.learning.description}
        </AccessibleText>
      ) : null}
      <View
        accessibilityLabel={ES.onboarding.optionGroupLabel}
        accessibilityRole="radiogroup"
        style={styles.options}
      >
        {options.map((option) => (
          <ProfileOption
            hint={ES.settings.editor.optionHint}
            key={option.value}
            label={option.label}
            onPress={() =>
              onDraftChange(writeAnswer(draft, question, option.value))
            }
            selected={selectedValue === option.value}
          />
        ))}
      </View>
      {question.example ? (
        <AccessibleText
          style={{ color: presentation.colors.inkSubtle }}
          variant="meta"
        >
          {question.example}
        </AccessibleText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: spacing.sm,
  },
});
