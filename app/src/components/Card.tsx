import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme';

interface CardProps {
  children: ReactNode;
  /** Resalta la tarjeta recomendada sin recurrir a otra capa interior. */
  highlighted?: boolean;
}

/**
 * Única superficie elevada permitida.
 *
 * Dentro de una tarjeta se usan filas, filetes y avisos planos, nunca otra
 * tarjeta, para que la jerarquía visual y la de lectura coincidan.
 */
export function Card({ children, highlighted = false }: CardProps) {
  return (
    <View style={[styles.card, highlighted && styles.highlighted]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  highlighted: {
    borderColor: colors.borderStrong,
    borderWidth: 2,
  },
});
