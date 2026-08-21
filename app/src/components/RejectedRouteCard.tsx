import { StyleSheet, View } from 'react-native';

import type { RejectedRoute } from '@/api/types';
import { AccessibleText } from '@/components/AccessibleText';
import { Icon } from '@/components/icons';
import { describeViolation } from '@/features/route-comparison/presenters';
import { radii, spacing, usePresentation } from '@/theme';
import { ES } from '../../i18n/es';

interface RejectedRouteCardProps {
  route: RejectedRoute;
}

/** Fila plana con la alternativa descartada y el motivo del descarte. */
export function RejectedRouteCard({ route }: RejectedRouteCardProps) {
  const presentation = usePresentation();
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: presentation.colors.surfaceSunken },
      ]}
    >
      <AccessibleText
        style={{ color: presentation.colors.inkMuted }}
        variant="meta"
      >
        {ES.routeComparison.rejectedCardLabel}
      </AccessibleText>
      <AccessibleText accessibilityRole="header" variant="subheading">
        {route.name}
      </AccessibleText>
      {route.violations.map((violation) => (
        <View key={violation.code} style={styles.reason}>
          <Icon color={presentation.colors.inkMuted} name="x" size={18} />
          <AccessibleText
            style={[
              styles.reasonText,
              { color: presentation.colors.inkMuted },
            ]}
            variant="body"
          >
            {describeViolation(violation)}
          </AccessibleText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  reason: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reasonText: {
    flex: 1,
  },
  row: {
    borderRadius: radii.button,
    gap: spacing.sm,
    padding: spacing.lg,
  },
});
