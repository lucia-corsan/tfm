import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  ACTION_BAND_HEIGHT,
  focusRing,
  spacing,
  useFocusRing,
  usePresentation,
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
  const presentation = usePresentation();
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
        {
          backgroundColor: inactive
            ? presentation.colors.brandDisabled
            : presentation.colors.brandInk,
        },
        pressed && !inactive && {
          backgroundColor: presentation.colors.brandPressed,
        },
        focused && focusRing,
      ]}
      {...focusProps}
    >
      <View style={styles.content}>
        <Text
          style={[
            presentation.typography.action,
            styles.label,
            { color: presentation.colors.inkInverse },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  band: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: ACTION_BAND_HEIGHT,
    paddingHorizontal: spacing.xl,
    width: '100%',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
});
