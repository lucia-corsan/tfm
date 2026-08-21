import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccessibleText } from '@/components/AccessibleText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TopBar } from '@/components/TopBar';
import { colors, spacing } from '@/theme';
import { ES } from '../../i18n/es';

interface OnboardingIntroScreenProps {
  onSkip: () => void;
  onStart: () => void;
}

/**
 * Presentación del cuestionario.
 *
 * Antes de preguntar nada declara dónde se guardan las respuestas y advierte de
 * que una recomendación no garantiza que una ruta sea accesible, de modo que la
 * configuración empiece con esa expectativa ya fijada.
 */
export function OnboardingIntroScreen({
  onSkip,
  onStart,
}: OnboardingIntroScreenProps) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <TopBar title={ES.appName} />
      <View style={styles.content}>
        <AccessibleText accessibilityRole="header" variant="display">
          {ES.onboarding.intro.title}
        </AccessibleText>
        <AccessibleText style={styles.notice}>
          {ES.onboarding.intro.storageNotice}
        </AccessibleText>
        <AccessibleText style={styles.notice}>
          {ES.onboarding.intro.evidenceNotice}
        </AccessibleText>
      </View>
      <SafeAreaView edges={['bottom']} style={styles.band}>
        <View style={styles.actions}>
          <PrimaryButton
            accessibilityHint={ES.onboarding.intro.continueHint}
            label={ES.onboarding.intro.continueButton}
            onPress={onStart}
          />
          <PrimaryButton
            accessibilityHint={ES.onboarding.intro.skipHint}
            label={ES.onboarding.intro.skipButton}
            onPress={onSkip}
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
  notice: {
    color: colors.inkMuted,
  },
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
});
