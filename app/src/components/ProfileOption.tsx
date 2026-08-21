import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import {
  focusRing,
  radii,
  spacing,
  useFocusRing,
  usePresentation,
} from '@/theme';

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
  const presentation = usePresentation();

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
        {
          backgroundColor: selected
            ? presentation.colors.brandSoft
            : presentation.colors.surface,
          borderColor: selected
            ? presentation.colors.brandInk
            : presentation.colors.border,
          borderWidth: selected ? 2 : 1,
        },
        pressed && { backgroundColor: presentation.colors.brandSoft },
        focused && focusRing,
      ]}
      {...focusProps}
    >
      <View
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.indicator,
          {
            borderColor: selected
              ? presentation.colors.brandInk
              : presentation.colors.inkMuted,
          },
          selected && { backgroundColor: presentation.colors.brandInk },
        ]}
      >
        {selected ? (
          <Icon
            color={presentation.colors.inkInverse}
            name="checkCircle"
            size={18}
          />
        ) : null}
      </View>
      <View importantForAccessibility="no-hide-descendants" style={styles.copy}>
        <Text
          style={[
            presentation.typography.emphasis,
            { color: presentation.colors.ink },
          ]}
        >
          {label}
        </Text>
        {description ? (
          <Text
            style={[
              presentation.typography.body,
              { color: presentation.colors.inkMuted },
            ]}
          >
            {description}
          </Text>
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
  indicator: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    marginTop: 2,
    width: 28,
  },
  option: {
    alignItems: 'flex-start',
    borderRadius: radii.card,
    flexDirection: 'row',
    gap: spacing.lg,
    minHeight: 76,
    padding: spacing.lg,
  },
});
