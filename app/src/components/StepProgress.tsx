import { StyleSheet, View } from 'react-native';

import { radii, spacing, usePresentation } from '@/theme';

interface StepProgressProps {
  current: number;
  total: number;
}

/**
 * Progreso por segmentos de los pasos de configuración.
 *
 * Es solo un refuerzo visual: el paso también se enuncia como texto en la barra
 * superior, así que se oculta al lector de pantalla para no repetirlo.
 */
export function StepProgress({ current, total }: StepProgressProps) {
  const presentation = usePresentation();
  return (
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
  );
}

const styles = StyleSheet.create({
  segment: {
    borderRadius: radii.pill,
    flex: 1,
    height: 6,
  },
  track: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: 'auto',
    maxWidth: 680,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    width: '100%',
  },
});
