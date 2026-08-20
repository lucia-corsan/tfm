import type { ComponentProps } from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors, typography } from '@/theme';

type TextVariant = keyof typeof typography;

interface AccessibleTextProps extends ComponentProps<typeof Text> {
  /** Presets de la escala tipográfica de la aplicación. */
  variant?: TextVariant;
}

/**
 * Texto expuesto como una única parada de lectura en español.
 *
 * En Android, `accessible` también introduce el texto en el recorrido del
 * teclado: `ReactTextViewManager` traduce esa propiedad a `isFocusable`. Ambos
 * recorridos son el mismo, así que la única forma de mantenerlos manejables es
 * que cada pantalla tenga pocos párrafos.
 */
export function AccessibleText({
  accessibilityRole = 'text',
  style,
  variant = 'body',
  ...props
}: AccessibleTextProps) {
  return (
    <Text
      accessible
      accessibilityLanguage="es-ES"
      accessibilityRole={accessibilityRole}
      style={[styles.base, typography[variant], style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.ink,
  },
});
