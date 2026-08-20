import { Alert, StyleSheet, Switch, View } from 'react-native';

import { AccessibleText } from '@/components/AccessibleText';
import { Callout } from '@/components/Callout';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, spacing } from '@/theme';
import { effectiveInfluence, type PreferenceLearningState } from '@/features/adaptive-preferences/learner';
import type { AdaptivePreferenceStatus } from '@/features/adaptive-preferences/useAdaptivePreferences';
import { ES } from '../../i18n/es';

interface AdaptivePreferencesPanelProps {
  learningState: PreferenceLearningState;
  onReset: () => Promise<void>;
  onSetEnabled: (enabled: boolean) => Promise<void>;
  recoveredFromInvalidData: boolean;
  status: AdaptivePreferenceStatus;
}

function statusText(
  status: AdaptivePreferenceStatus,
  state: PreferenceLearningState,
): string {
  if (status === 'loading') {
    return ES.adaptivePreferences.loading;
  }
  if (status === 'error') {
    return ES.adaptivePreferences.storageError;
  }
  if (!state.enabled) {
    return ES.adaptivePreferences.disabledStatus;
  }
  if (state.choiceCount <= state.config.observationChoices) {
    return ES.adaptivePreferences.observationStatus(
      state.choiceCount,
      state.config.observationChoices,
    );
  }
  return ES.adaptivePreferences.activeStatus(
    state.choiceCount,
    Math.round(
      effectiveInfluence(state.config, state.choiceCount, state.enabled) * 100,
    ),
  );
}

export function AdaptivePreferencesPanel({
  learningState,
  onReset,
  onSetEnabled,
  recoveredFromInvalidData,
  status,
}: AdaptivePreferencesPanelProps) {
  const confirmReset = () => {
    Alert.alert(
      ES.adaptivePreferences.resetDialogTitle,
      ES.adaptivePreferences.resetDialogDescription,
      [
        {
          style: 'cancel',
          text: ES.adaptivePreferences.cancelResetButton,
        },
        {
          onPress: () => void onReset(),
          style: 'destructive',
          text: ES.adaptivePreferences.confirmResetButton,
        },
      ],
    );
  };

  return (
    <Card>
      <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <AccessibleText variant="emphasis">
            {ES.adaptivePreferences.switchLabel}
          </AccessibleText>
        </View>
        <Switch
          accessibilityHint={ES.adaptivePreferences.switchHint}
          accessibilityLabel={ES.adaptivePreferences.switchLabel}
          accessibilityLanguage="es-ES"
          accessibilityRole="switch"
          accessibilityState={{
            checked: learningState.enabled,
            disabled: status !== 'ready',
          }}
          disabled={status !== 'ready'}
          onValueChange={(enabled) => void onSetEnabled(enabled)}
          thumbColor={colors.surface}
          trackColor={{ false: colors.inkMuted, true: colors.brandInk }}
          value={learningState.enabled}
        />
      </View>
      <AccessibleText
        accessibilityLiveRegion="polite"
        style={styles.status}
      >
        {statusText(status, learningState)}
      </AccessibleText>
      {recoveredFromInvalidData && (
        <Callout
          role="alert"
          text={ES.adaptivePreferences.recoveredState}
          tone="caution"
        />
      )}
      <AccessibleText style={styles.privacy} variant="meta">
        {ES.adaptivePreferences.privacy}
      </AccessibleText>
      {learningState.choiceCount > 0 && (
        <PrimaryButton
          accessibilityHint={ES.adaptivePreferences.resetHint}
          icon="trash"
          label={ES.adaptivePreferences.resetButton}
          onPress={confirmReset}
          variant="secondary"
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  description: {
    color: colors.inkMuted,
  },
  privacy: {
    color: colors.inkSubtle,
  },
  status: {
    backgroundColor: colors.brandSoft,
    borderRadius: 12,
    color: colors.brandOnSoft,
    overflow: 'hidden',
    padding: spacing.md,
  },
  switchCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'space-between',
    minHeight: 56,
  },
});
