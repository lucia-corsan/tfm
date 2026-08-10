import { StyleSheet, Text, View } from 'react-native';

import type { RejectedRoute } from '@/api/types';
import { describeViolation } from '@/features/route-comparison/presenters';

interface RejectedRouteCardProps {
  route: RejectedRoute;
}

export function RejectedRouteCard({ route }: RejectedRouteCardProps) {
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        {route.name}
      </Text>
      {route.violations.map((violation) => (
        <Text key={violation.code} style={styles.reason}>
          {describeViolation(violation)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F5F2F0',
    borderColor: '#CFC7C1',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  reason: {
    color: '#514A46',
    fontSize: 15,
    lineHeight: 21,
  },
  title: {
    color: '#2C2927',
    fontSize: 17,
    fontWeight: '700',
  },
});
