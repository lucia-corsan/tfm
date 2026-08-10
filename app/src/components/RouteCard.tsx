import { StyleSheet, Text, View } from 'react-native';

import type { ComparedRoute } from '@/api/types';
import { MetricItem } from '@/components/MetricItem';
import {
  describeReason,
  describeWarning,
  formatDistance,
  formatDuration,
  formatPercentage,
} from '@/features/route-comparison/presenters';
import { ES } from '../../i18n/es';

interface RouteCardProps {
  route: ComparedRoute;
}

export function RouteCard({ route }: RouteCardProps) {
  return (
    <View style={[styles.card, route.rank === 1 && styles.recommendedCard]}>
      <View style={styles.topLine}>
        <Text style={styles.rank}>{ES.routeComparison.rankLabel(route.rank)}</Text>
        {route.is_synthetic && (
          <Text style={styles.synthetic}>{ES.routeComparison.syntheticData}</Text>
        )}
      </View>

      <Text accessibilityRole="header" style={styles.title}>
        {route.name}
      </Text>
      <Text style={styles.journey}>
        {ES.routeComparison.distance}: {formatDistance(route.distance_m)} ·{' '}
        {ES.routeComparison.duration}: {formatDuration(route.duration_s)}
      </Text>

      <View style={styles.metrics}>
        <MetricItem
          label={ES.routeComparison.adequacy}
          value={formatPercentage(route.score.adequacy)}
        />
        <MetricItem
          label={ES.routeComparison.confidence}
          value={formatPercentage(route.score.confidence)}
        />
        <MetricItem
          label={ES.routeComparison.uncertainty}
          value={formatPercentage(route.score.uncertainty)}
        />
      </View>

      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {ES.routeComparison.reasonsTitle}
      </Text>
      {route.reasons.map((reason) => (
        <Text key={`${reason.kind}-${reason.dimension}`} style={styles.detail}>
          • {describeReason(reason)}
        </Text>
      ))}

      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {ES.routeComparison.warningsTitle}
      </Text>
      {route.warnings.length === 0 ? (
        <Text style={styles.detail}>{ES.routeComparison.noWarnings}</Text>
      ) : (
        route.warnings.map((warning) => (
          <View
            accessible
            accessibilityLabel={describeWarning(warning)}
            accessibilityRole="alert"
            key={warning.attribute}
            style={styles.warning}
          >
            <Text style={styles.warningText}>{describeWarning(warning)}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDD8E9',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  detail: {
    color: '#343B50',
    fontSize: 15,
    lineHeight: 22,
  },
  journey: {
    color: '#454B5E',
    fontSize: 15,
    lineHeight: 22,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rank: {
    color: '#5B3FC4',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  recommendedCard: {
    borderColor: '#7A5BD1',
    borderWidth: 2,
  },
  sectionTitle: {
    color: '#17213A',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  synthetic: {
    backgroundColor: '#ECE8FA',
    borderRadius: 10,
    color: '#3E277F',
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  title: {
    color: '#17213A',
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 29,
  },
  topLine: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  warning: {
    backgroundColor: '#FFF4DC',
    borderColor: '#E4BC65',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  warningText: {
    color: '#533B0C',
    fontSize: 14,
    lineHeight: 20,
  },
});
