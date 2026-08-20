import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  ACTION_BAND_HEIGHT,
  colors,
  focusRing,
  spacing,
  typography,
  useFocusRing,
} from '@/theme';

interface ActionBandProps {
  accessibilityHint: string;
  /** Muestra la banda en reposo, sin acción, mientras se espera. */
  busy?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}

/**
 * Banda de acción inferior.
 *
 * Ocupa todo el ancho y la misma altura en cada pantalla del flujo, con el
 * texto centrado, para que la acción principal esté siempre en el mismo lugar.
 * Su texto es grande y de un solo peso: es el destino táctil mayor de la
 * pantalla y no compite con ningún otro control.
 */
export function ActionBand({
  accessibilityHint,
  busy = false,
  disabled = false,
  label,
  onPress,
}: ActionBandProps) {
  const { focused, focusProps } = useFocusRing();
  const inactive = busy || disabled;

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLanguage="es-ES"
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.band,
        inactive && styles.bandInactive,
        pressed && !inactive && styles.bandPressed,
        focused && focusRing,
      ]}
      {...focusProps}
    >
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  band: {
    alignItems: 'center',
    backgroundColor: colors.brandInk,
    justifyContent: 'center',
    minHeight: ACTION_BAND_HEIGHT,
    paddingHorizontal: spacing.xl,
    width: '100%',
  },
  bandInactive: {
    backgroundColor: colors.brandDisabled,
  },
  bandPressed: {
    backgroundColor: colors.brandPressed,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.action,
    color: colors.inkInverse,
    textAlign: 'center',
  },
});
