import { Alert, StyleSheet, Switch, View } from 'react-native';

import { AccessibleText } from '@/components/AccessibleText';
import { PrimaryButton } from '@/components/PrimaryButton';
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
    <View style={styles.card}>
      <AccessibleText accessibilityRole="header" style={styles.title}>
        {ES.adaptivePreferences.title}
      </AccessibleText>
      <AccessibleText style={styles.description}>
        {ES.adaptivePreferences.description}
      </AccessibleText>
      <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <AccessibleText style={styles.switchLabel}>
            {ES.adaptivePreferences.switchLabel}
          </AccessibleText>
          <AccessibleText style={styles.description}>
            {ES.adaptivePreferences.switchDescription}
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
          trackColor={{ false: '#AAA5B4', true: '#7A5BD1' }}
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
        <AccessibleText accessibilityRole="alert" style={styles.warning}>
          {ES.adaptivePreferences.recoveredState}
        </AccessibleText>
      )}
      <AccessibleText style={styles.privacy}>
        {ES.adaptivePreferences.privacy}
      </AccessibleText>
      {learningState.choiceCount > 0 && (
        <PrimaryButton
          accessibilityHint={ES.adaptivePreferences.resetHint}
          label={ES.adaptivePreferences.resetButton}
          onPress={confirmReset}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F3F0FC',
    borderColor: '#C6BCEB',
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  description: {
    color: '#454B5E',
    fontSize: 15,
    lineHeight: 22,
  },
  privacy: {
    color: '#555B6D',
    fontSize: 13,
    lineHeight: 19,
  },
  status: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    color: '#34216D',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    overflow: 'hidden',
    padding: 12,
  },
  switchCopy: {
    flex: 1,
    gap: 4,
  },
  switchLabel: {
    color: '#17213A',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
    minHeight: 52,
  },
  title: {
    color: '#17213A',
    fontSize: 19,
    fontWeight: '800',
  },
  warning: {
    backgroundColor: '#FFF4DC',
    borderRadius: 12,
    color: '#533B0C',
    fontSize: 14,
    lineHeight: 20,
    overflow: 'hidden',
    padding: 12,
  },
});
