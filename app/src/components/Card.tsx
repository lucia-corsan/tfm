import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { radii, spacing, usePresentation } from '@/theme';

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
  const presentation = usePresentation();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: presentation.colors.surface,
          borderColor: highlighted
            ? presentation.colors.borderStrong
            : presentation.colors.border,
          borderWidth: highlighted ? 2 : 1,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    gap: spacing.md,
    padding: spacing.xl,
  },
});
