import { StyleSheet, View } from 'react-native';

import { AccessibleText } from '@/components/AccessibleText';
import { radii, spacing, usePresentation } from '@/theme';

interface StepProgressProps {
  current: number;
  label: string;
  total: number;
}

/**
 * Progreso por segmentos de los pasos de configuración.
 *
 * El texto queda fuera de la barra superior para que esta identifique siempre
 * la sección actual. Si solo hay un paso, se omite por no aportar orientación.
 */
export function StepProgress({ current, label, total }: StepProgressProps) {
  const presentation = usePresentation();
  if (total <= 1) {
    return null;
  }
  return (
    <View style={styles.container}>
      <AccessibleText
        accessibilityLiveRegion="polite"
        style={{ color: presentation.colors.brandOnSoft }}
        variant="meta"
      >
        {label}
      </AccessibleText>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.track}
      >
        {Array.from({ length: total }, (unused, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              {
                backgroundColor:
                  index < current
                    ? presentation.colors.brand
                    : presentation.colors.border,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginHorizontal: 'auto',
    maxWidth: 680,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    width: '100%',
  },
  segment: {
    borderRadius: radii.pill,
    flex: 1,
    height: 6,
  },
  track: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
});
