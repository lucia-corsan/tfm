import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import {
  colors,
  focusRing,
  MINIMUM_TOUCH_TARGET,
  radii,
  spacing,
  typography,
  useFocusRing,
} from '@/theme';

export type ButtonVariant = 'link' | 'primary' | 'quiet' | 'secondary';

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
        variantStyles[variant],
        pressed && !disabled && pressedStyles[variant],
        disabled && disabledStyles[variant],
        focused && focusRing,
      ]}
      {...focusProps}
    >
      <View style={styles.content}>
        {icon ? <Icon color={iconColor} name={icon} size={22} /> : null}
        <Text
          style={[
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

const labelColors: Record<ButtonVariant, string> = {
  link: colors.brandInk,
  primary: colors.inkInverse,
  quiet: colors.brandOnSoft,
  secondary: colors.brandOnSoft,
};

const disabledLabelColors: Record<ButtonVariant, string> = {
  link: colors.inkMuted,
  primary: colors.inkInverse,
  quiet: colors.inkMuted,
  secondary: colors.inkMuted,
};

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
    ...typography.emphasis,
    textAlign: 'center',
  },
});

const variantStyles = StyleSheet.create({
  link: {
    alignSelf: 'auto',
    backgroundColor: 'transparent',
    minHeight: MINIMUM_TOUCH_TARGET,
    paddingHorizontal: spacing.sm,
  },
  primary: {
    backgroundColor: colors.brandInk,
  },
  quiet: {
    backgroundColor: 'transparent',
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.brandInk,
    borderWidth: 2,
  },
});

const pressedStyles = StyleSheet.create({
  link: {
    backgroundColor: colors.brandSoft,
  },
  primary: {
    backgroundColor: colors.brandPressed,
  },
  quiet: {
    backgroundColor: colors.brandSoft,
  },
  secondary: {
    backgroundColor: colors.brandSoft,
  },
});

const disabledStyles = StyleSheet.create({
  link: {
    opacity: 0.7,
  },
  primary: {
    backgroundColor: colors.brandDisabled,
  },
  quiet: {
    opacity: 0.7,
  },
  secondary: {
    borderColor: colors.border,
  },
});
