import { StyleSheet, Text, View } from 'react-native';

interface MetricItemProps {
  label: string;
  value: string;
}

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
    color: '#4A5063',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  metric: {
    alignItems: 'center',
    backgroundColor: '#F3F0FC',
    borderRadius: 14,
    flex: 1,
    gap: 4,
    minWidth: 96,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  value: {
    color: '#3E277F',
    fontSize: 19,
    fontWeight: '800',
  },
});
