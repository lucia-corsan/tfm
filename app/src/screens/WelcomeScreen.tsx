import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccessibleText } from '@/components/AccessibleText';
import { RumboLogo } from '@/components/RumboLogo';
import { colors, spacing } from '@/theme';
import { ES } from '../../i18n/es';

interface WelcomeScreenProps {
  onStart: () => void;
}

/** Tiempo que la portada permanece visible antes de continuar sola. */
const AUTOMATIC_ADVANCE_MS = 2500;

/** Tamaño protagonista del símbolo animado en la portada. */
const WELCOME_LOGO_SIZE = 160;

/**
 * Portada de marca.
 *
 * Continúa sola tras unos segundos y también al tocar cualquier punto, de modo
 * que no obligue a buscar un control ni retenga a quien ya conoce la
 * aplicación.
 */
export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  useEffect(() => {
    const timer = setTimeout(onStart, AUTOMATIC_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [onStart]);

  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <Pressable
          accessibilityHint={ES.welcome.startHint}
          accessibilityLanguage="es-ES"
          accessibilityLabel={`${ES.appName}. ${ES.welcome.tagline}`}
          accessibilityRole="button"
          onPress={onStart}
          style={styles.content}
        >
          <View accessibilityElementsHidden style={styles.brand}>
            <RumboLogo
              animated
              color={colors.inkInverse}
              size={WELCOME_LOGO_SIZE}
            />
            <AccessibleText
              accessible={false}
              style={styles.name}
              variant="display"
            >
              {ES.appName}
            </AccessibleText>
            <AccessibleText accessible={false} style={styles.tagline}>
              {ES.welcome.tagline}
            </AccessibleText>
          </View>
        </Pressable>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: 'center',
    gap: spacing.md,
    transform: [{ translateY: -spacing.xxl }],
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  name: {
    color: colors.inkInverse,
  },
  safeArea: {
    backgroundColor: colors.brandInk,
    flex: 1,
  },
  tagline: {
    color: colors.inkInverse,
    textAlign: 'center',
  },
});
