import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { colors, focusRing, radii, spacing, typography, useFocusRing } from '@/theme';

interface ProfileOptionProps {
  description?: string;
  hint: string;
  label: string;
  onPress: () => void;
  selected: boolean;
}

/** Opción de perfil con estado visible por color, borde e icono. */
export function ProfileOption({
  description,
  hint,
  label,
  onPress,
  selected,
}: ProfileOptionProps) {
  const { focused, focusProps } = useFocusRing();

  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLanguage="es-ES"
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && styles.optionPressed,
        focused && focusRing,
      ]}
      {...focusProps}
    >
      <View
        importantForAccessibility="no-hide-descendants"
        style={[styles.indicator, selected && styles.indicatorSelected]}
      >
        {selected ? (
          <Icon color={colors.inkInverse} name="checkCircle" size={18} />
        ) : null}
      </View>
      <View importantForAccessibility="no-hide-descendants" style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  description: {
    ...typography.body,
    color: colors.inkMuted,
  },
  indicator: {
    alignItems: 'center',
    borderColor: colors.inkMuted,
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    marginTop: 2,
    width: 28,
  },
  indicatorSelected: {
    backgroundColor: colors.brandInk,
    borderColor: colors.brandInk,
  },
  label: {
    ...typography.emphasis,
    color: colors.ink,
  },
  option: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.lg,
    minHeight: 76,
    padding: spacing.lg,
  },
  optionPressed: {
    backgroundColor: colors.brandSoft,
  },
  optionSelected: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brandInk,
    borderWidth: 2,
  },
});
