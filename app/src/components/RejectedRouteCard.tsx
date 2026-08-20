import { StyleSheet, View } from 'react-native';

import type { RejectedRoute } from '@/api/types';
import { AccessibleText } from '@/components/AccessibleText';
import { Icon } from '@/components/icons';
import { describeViolation } from '@/features/route-comparison/presenters';
import { colors, radii, spacing } from '@/theme';

interface RejectedRouteCardProps {
  route: RejectedRoute;
}

/** Fila plana con la alternativa descartada y el motivo del descarte. */
export function RejectedRouteCard({ route }: RejectedRouteCardProps) {
  return (
    <View style={styles.row}>
      <AccessibleText accessibilityRole="header" variant="subheading">
        {route.name}
      </AccessibleText>
      {route.violations.map((violation) => (
        <View key={violation.code} style={styles.reason}>
          <Icon color={colors.inkMuted} name="x" size={18} />
          <AccessibleText style={styles.reasonText} variant="body">
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
    color: colors.inkMuted,
    flex: 1,
  },
  row: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.button,
    gap: spacing.sm,
    padding: spacing.lg,
  },
});
