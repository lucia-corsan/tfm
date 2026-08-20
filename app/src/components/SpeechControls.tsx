import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AccessibleText } from '@/components/AccessibleText';
import { Callout } from '@/components/Callout';
import { Card } from '@/components/Card';
import { Icon } from '@/components/icons';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  SPEECH_RATE_OPTIONS,
  type SpeechPreferences,
  type SpeechRateId,
} from '@/features/speech/speechPreferences';
import type { ScreenReaderStatus } from '@/features/speech/useScreenReaderStatus';
import { colors, focusRing, radii, spacing } from '@/theme';
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

/**
 * Ajustes de la voz propia de la aplicación.
 *
 * No se muestra nada mientras hay un lector de pantalla activo: en ese caso las
 * instrucciones ya se locutan mediante TalkBack y la sección solo añadiría
 * ruido en el recorrido de la pantalla. Si la comprobación no llega a
 * resolverse, los controles siguen disponibles.
 */
export function SpeechControls({
  error,
  isSpeaking,
  onChange,
  onSpeak,
  onStop,
  preferences,
  screenReaderStatus,
}: SpeechControlsProps) {
  const [focusedRateId, setFocusedRateId] = useState<SpeechRateId | null>(null);

  const selectRate = (rateId: SpeechRateId) => {
    onChange({ ...preferences, rateId });
  };

  if (screenReaderStatus === 'enabled') {
    return null;
  }

  return (
    <Card>
      <View style={styles.titleRow}>
        <Icon color={colors.brandInk} name="speakerHigh" size={24} />
        <AccessibleText accessibilityRole="header" variant="section">
          {ES.navigation.speech.title}
        </AccessibleText>
      </View>
      <AccessibleText style={styles.description} variant="body">
        {ES.navigation.speech.status[screenReaderStatus]}
      </AccessibleText>

      <View style={styles.group}>
        <AccessibleText accessibilityRole="header" variant="subheading">
          {ES.navigation.speech.rateTitle}
        </AccessibleText>
        <AccessibleText style={styles.description} variant="body">
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
                onBlur={() => setFocusedRateId(null)}
                onFocus={() => setFocusedRateId(option.id)}
                onPress={() => selectRate(option.id)}
                style={({ pressed }) => [
                  styles.rateOption,
                  selected && styles.rateOptionSelected,
                  pressed && styles.rateOptionPressed,
                  focusedRateId === option.id && focusRing,
                ]}
              >
                <AccessibleText
                  accessible={false}
                  style={selected ? styles.rateLabelSelected : styles.rateLabel}
                  variant="emphasis"
                >
                  {ES.navigation.speech.rateLabels[option.id]}
                </AccessibleText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <AccessibleText variant="emphasis">
            {ES.navigation.speech.automaticTitle}
          </AccessibleText>
          <AccessibleText style={styles.description} variant="body">
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
          thumbColor={colors.surface}
          trackColor={{ false: colors.inkMuted, true: colors.brandInk }}
          value={preferences.automaticPlayback}
        />
      </View>

      <PrimaryButton
        accessibilityHint={
          isSpeaking
            ? ES.navigation.speech.stopHint
            : ES.navigation.speech.listenHint
        }
        icon={isSpeaking ? 'stop' : 'play'}
        label={
          isSpeaking
            ? ES.navigation.speech.stopButton
            : ES.navigation.speech.listenButton
        }
        onPress={isSpeaking ? onStop : onSpeak}
        variant="secondary"
      />

      {error && (
        <Callout
          accessibilityLiveRegion="assertive"
          role="alert"
          text={ES.navigation.speech.error}
          tone="danger"
        />
      )}
      <AccessibleText style={styles.notice} variant="meta">
        {ES.navigation.speech.persistenceNotice}
      </AccessibleText>
    </Card>
  );
}

const styles = StyleSheet.create({
  description: {
    color: colors.inkMuted,
  },
  group: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.lg,
  },
  notice: {
    color: colors.inkSubtle,
  },
  rateLabel: {
    color: colors.brandOnSoft,
    textAlign: 'center',
  },
  rateLabelSelected: {
    color: colors.inkInverse,
    textAlign: 'center',
  },
  rateOption: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderColor: colors.brandInk,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 52,
    minWidth: '46%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rateOptionPressed: {
    backgroundColor: colors.brandSoft,
  },
  rateOptionSelected: {
    backgroundColor: colors.brandInk,
    borderColor: colors.brandInk,
  },
  rateOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  switchCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  switchRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'space-between',
    minHeight: 60,
    paddingTop: spacing.lg,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
});
