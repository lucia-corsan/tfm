import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import {
  focusRing,
  MINIMUM_TOUCH_TARGET,
  radii,
  spacing,
  type PresentationColors,
  useFocusRing,
  usePresentation,
} from '@/theme';

export type ButtonVariant = 'danger' | 'link' | 'primary' | 'quiet' | 'secondary';

interface PrimaryButtonProps {
  accessibilityHint: string;
  /** Etiqueta para el lector de pantalla cuando la visible es abreviada. */
  accessibilityLabel?: string;
  disabled?: boolean;
  expanded?: boolean;
  /** Icono decorativo; el significado siempre viaja en la etiqueta. */
  icon?: IconName;
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
}

/** Botón de acción a lo ancho, con altura táctil suficiente y foco único. */
export function PrimaryButton({
  accessibilityHint,
  accessibilityLabel,
  disabled = false,
  expanded,
  icon,
  label,
  onPress,
  variant = 'primary',
}: PrimaryButtonProps) {
  const { focused, focusProps } = useFocusRing();
  const presentation = usePresentation();
  const labelColors: Record<ButtonVariant, string> = {
    danger: presentation.colors.dangerOnSoft,
    link: presentation.colors.brandInk,
    primary: presentation.colors.inkInverse,
    quiet: presentation.colors.brandOnSoft,
    secondary: presentation.colors.brandOnSoft,
  };
  const disabledLabelColors: Record<ButtonVariant, string> = {
    danger: presentation.colors.inkMuted,
    link: presentation.colors.inkMuted,
    primary: presentation.colors.inkInverse,
    quiet: presentation.colors.inkMuted,
    secondary: presentation.colors.inkMuted,
  };
  const iconColor = disabled
    ? disabledLabelColors[variant]
    : labelColors[variant];

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLanguage="es-ES"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled, expanded }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variantStyles(presentation.colors)[variant],
        pressed && !disabled && pressedStyles(presentation.colors)[variant],
        disabled && disabledStyles(presentation.colors)[variant],
        focused && focusRing,
      ]}
      {...focusProps}
    >
      <View style={styles.content}>
        {icon ? <Icon color={iconColor} name={icon} size={22} /> : null}
        <Text
          style={[
            presentation.typography.emphasis,
            styles.label,
            { color: disabled ? disabledLabelColors[variant] : labelColors[variant] },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: radii.button,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: MINIMUM_TOUCH_TARGET - 2 * spacing.md,
  },
  label: {
    textAlign: 'center',
  },
});

const variantStyles = (palette: PresentationColors) => StyleSheet.create({
  danger: {
    backgroundColor: palette.surface,
    borderColor: palette.dangerBorder,
    borderWidth: 2,
  },
  link: {
    alignSelf: 'auto',
    backgroundColor: 'transparent',
    minHeight: MINIMUM_TOUCH_TARGET,
    paddingHorizontal: spacing.sm,
  },
  primary: {
    backgroundColor: palette.brandInk,
  },
  quiet: {
    backgroundColor: 'transparent',
  },
  secondary: {
    backgroundColor: palette.surface,
    borderColor: palette.brandInk,
    borderWidth: 2,
  },
});

const pressedStyles = (palette: PresentationColors) => StyleSheet.create({
  danger: {
    backgroundColor: palette.dangerSoft,
  },
  link: {
    backgroundColor: palette.brandSoft,
  },
  primary: {
    backgroundColor: palette.brandPressed,
  },
  quiet: {
    backgroundColor: palette.brandSoft,
  },
  secondary: {
    backgroundColor: palette.brandSoft,
  },
});

const disabledStyles = (palette: PresentationColors) => StyleSheet.create({
  danger: {
    borderColor: palette.border,
  },
  link: {
    opacity: 0.7,
  },
  primary: {
    backgroundColor: palette.brandDisabled,
  },
  quiet: {
    opacity: 0.7,
  },
  secondary: {
    borderColor: palette.border,
  },
});
