import { StyleSheet, Text, View } from 'react-native';

import { radii, spacing, usePresentation } from '@/theme';

interface MetricItemProps {
  label: string;
  value: string;
}

/** Cifra destacada con su etiqueta, en una caja suave dentro de la tarjeta. */
export function MetricItem({ label, value }: MetricItemProps) {
  const presentation = usePresentation();
  return (
    <View
      accessible
      accessibilityLanguage="es-ES"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityRole="text"
      style={[
        styles.metric,
        {
          backgroundColor: presentation.colors.brandSoft,
          borderColor: presentation.highContrast
            ? presentation.colors.borderStrong
            : 'transparent',
          borderWidth: presentation.highContrast ? 1 : 0,
        },
      ]}
    >
      <Text
        style={[
          presentation.typography.metric,
          styles.centered,
          { color: presentation.colors.brandInk },
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          presentation.typography.meta,
          styles.centered,
          { color: presentation.colors.inkMuted },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    textAlign: 'center',
  },
  metric: {
    alignItems: 'center',
    borderRadius: radii.field,
    flexBasis: '46%',
    flexGrow: 1,
    gap: 2,
    minWidth: 130,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
