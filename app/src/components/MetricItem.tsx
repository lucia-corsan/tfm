import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';

interface MetricItemProps {
  label: string;
  value: string;
}

/** Cifra destacada con su etiqueta, en una caja suave dentro de la tarjeta. */
export function MetricItem({ label, value }: MetricItemProps) {
  return (
    <View
      accessible
      accessibilityLanguage="es-ES"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityRole="text"
      style={styles.metric}
    >
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.meta,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  metric: {
    alignItems: 'center',
    backgroundColor: colors.brandSoft,
    borderRadius: radii.field,
    flexBasis: '46%',
    flexGrow: 1,
    gap: 2,
    minWidth: 130,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  value: {
    ...typography.metric,
    color: colors.brandInk,
  },
});
