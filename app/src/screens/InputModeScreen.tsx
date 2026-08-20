import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccessibleText } from '@/components/AccessibleText';
import { Callout } from '@/components/Callout';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TopBar } from '@/components/TopBar';
import { colors, spacing } from '@/theme';
import { ES } from '../../i18n/es';

interface InputModeScreenProps {
  onChooseTyping: () => void;
}

/**
 * Elección entre hablar y teclear.
 *
 * Es la única pantalla con dos acciones al mismo nivel, así que ocupan juntas
 * la banda inferior en lugar de una sola. El dictado por voz todavía no está
 * implementado: la opción se conserva para no ocultar el camino previsto, pero
 * declara su estado en lugar de simular una función que no existe.
 */
export function InputModeScreen({ onChooseTyping }: InputModeScreenProps) {
  const [voiceRequested, setVoiceRequested] = useState(false);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <TopBar title={ES.appName} />
      <View style={styles.content}>
        <AccessibleText accessibilityRole="header" variant="display">
          {ES.inputMode.question}
        </AccessibleText>
        {voiceRequested && (
          <Callout
            accessibilityLiveRegion="assertive"
            role="alert"
            text={ES.inputMode.voiceUnavailable}
            tone="caution"
          />
        )}
      </View>
      <SafeAreaView edges={['bottom']} style={styles.band}>
        <View style={styles.actions}>
          <PrimaryButton
            accessibilityHint={ES.inputMode.typeHint}
            icon="keyboard"
            label={ES.inputMode.typeButton}
            onPress={onChooseTyping}
          />
          <PrimaryButton
            accessibilityHint={ES.inputMode.voiceHint}
            icon="microphone"
            label={ES.inputMode.voiceButton}
            onPress={() => setVoiceRequested(true)}
            variant="secondary"
          />
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
    marginHorizontal: 'auto',
    maxWidth: 680,
    padding: spacing.xl,
    width: '100%',
  },
  band: {
    backgroundColor: colors.brandSoft,
    width: '100%',
  },
  content: {
    flex: 1,
    gap: spacing.lg,
    marginHorizontal: 'auto',
    maxWidth: 680,
    padding: spacing.xl,
    width: '100%',
  },
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
});
