import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AccessibleText } from '@/components/AccessibleText';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  SPEECH_RATE_OPTIONS,
  type SpeechPreferences,
  type SpeechRateId,
} from '@/features/speech/speechPreferences';
import type { ScreenReaderStatus } from '@/features/speech/useScreenReaderStatus';
import { ES } from '../../i18n/es';

interface SpeechControlsProps {
  error: boolean;
  isSpeaking: boolean;
  onChange: (preferences: SpeechPreferences) => void;
  onSpeak: () => void;
  onStop: () => void;
  preferences: SpeechPreferences;
  screenReaderStatus: ScreenReaderStatus;
}

export function SpeechControls({
  error,
  isSpeaking,
  onChange,
  onSpeak,
  onStop,
  preferences,
  screenReaderStatus,
}: SpeechControlsProps) {
  const selectRate = (rateId: SpeechRateId) => {
    onChange({ ...preferences, rateId });
  };

  if (screenReaderStatus !== 'disabled') {
    return (
      <View style={styles.card}>
        <AccessibleText accessibilityRole="header" style={styles.title}>
          {screenReaderStatus === 'enabled'
            ? ES.navigation.speech.talkBackTitle
            : ES.navigation.speech.title}
        </AccessibleText>
        <AccessibleText
          accessibilityLiveRegion={
            screenReaderStatus === 'enabled' ? 'polite' : 'none'
          }
          style={styles.description}
        >
          {ES.navigation.speech.status[screenReaderStatus]}
        </AccessibleText>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <AccessibleText accessibilityRole="header" style={styles.title}>
        {ES.navigation.speech.title}
      </AccessibleText>
      <AccessibleText style={styles.description}>
        {ES.navigation.speech.status[screenReaderStatus]}
      </AccessibleText>

      <AccessibleText accessibilityRole="header" style={styles.subtitle}>
        {ES.navigation.speech.rateTitle}
      </AccessibleText>
      <AccessibleText style={styles.description}>
        {ES.navigation.speech.rateDescription}
      </AccessibleText>
      <View
        accessibilityLabel={ES.navigation.speech.rateGroupLabel}
        accessibilityRole="radiogroup"
        style={styles.rateOptions}
      >
        {SPEECH_RATE_OPTIONS.map((option) => {
          const selected = preferences.rateId === option.id;
          return (
            <Pressable
              accessibilityHint={ES.navigation.speech.rateHint(option.id)}
              accessibilityLanguage="es-ES"
              accessibilityLabel={ES.navigation.speech.rateLabels[option.id]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={option.id}
              onPress={() => selectRate(option.id)}
              style={({ pressed }) => [
                styles.rateOption,
                selected && styles.rateOptionSelected,
                pressed && styles.rateOptionPressed,
              ]}
            >
              <AccessibleText
                accessible={false}
                style={[
                  styles.rateLabel,
                  selected && styles.rateLabelSelected,
                ]}
              >
                {ES.navigation.speech.rateLabels[option.id]}
              </AccessibleText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <AccessibleText style={styles.switchTitle}>
            {ES.navigation.speech.automaticTitle}
          </AccessibleText>
          <AccessibleText style={styles.description}>
            {ES.navigation.speech.automaticDescription}
          </AccessibleText>
        </View>
        <Switch
          accessibilityHint={ES.navigation.speech.automaticHint}
          accessibilityLabel={ES.navigation.speech.automaticTitle}
          accessibilityLanguage="es-ES"
          accessibilityRole="switch"
          accessibilityState={{
            checked: preferences.automaticPlayback,
          }}
          onValueChange={(automaticPlayback) =>
            onChange({ ...preferences, automaticPlayback })
          }
          value={preferences.automaticPlayback}
        />
      </View>

      <PrimaryButton
        accessibilityHint={
          isSpeaking
            ? ES.navigation.speech.stopHint
            : ES.navigation.speech.listenHint
        }
        label={
          isSpeaking
            ? ES.navigation.speech.stopButton
            : ES.navigation.speech.listenButton
        }
        onPress={isSpeaking ? onStop : onSpeak}
      />

      {error && (
        <AccessibleText
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={styles.error}
        >
          {ES.navigation.speech.error}
        </AccessibleText>
      )}
      <AccessibleText style={styles.persistenceNotice}>
        {ES.navigation.speech.persistenceNotice}
      </AccessibleText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F1ECFC',
    borderColor: '#B7A4E9',
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  description: {
    color: '#343B50',
    fontSize: 15,
    lineHeight: 22,
  },
  error: {
    backgroundColor: '#FFF1F1',
    borderRadius: 12,
    color: '#7A2020',
    fontSize: 15,
    lineHeight: 22,
    padding: 12,
  },
  persistenceNotice: {
    color: '#594E70',
    fontSize: 13,
    lineHeight: 19,
  },
  rateLabel: {
    color: '#3E277F',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  rateLabelSelected: {
    color: '#FFFFFF',
  },
  rateOption: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#7A5BD1',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: '47%',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rateOptionPressed: {
    opacity: 0.8,
  },
  rateOptionSelected: {
    backgroundColor: '#5B3FC4',
  },
  rateOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  subtitle: {
    color: '#17213A',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  switchCopy: {
    flex: 1,
    gap: 4,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
    minHeight: 56,
  },
  switchTitle: {
    color: '#17213A',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
  },
  title: {
    color: '#17213A',
    fontSize: 18,
    fontWeight: '700',
  },
});
