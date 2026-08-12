import { StyleSheet, Text, View } from 'react-native';

import type { ComparedRoute } from '@/api/types';
import { AccessibleText } from '@/components/AccessibleText';
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
        <AccessibleText style={styles.rank}>
          {ES.routeComparison.rankLabel(route.rank)}
        </AccessibleText>
        {route.is_synthetic && (
          <AccessibleText style={styles.synthetic}>
            {ES.routeComparison.syntheticData}
          </AccessibleText>
        )}
      </View>

      <AccessibleText accessibilityRole="header" style={styles.title}>
        {route.name}
      </AccessibleText>
      <AccessibleText style={styles.journey}>
        {ES.routeComparison.distance}: {formatDistance(route.distance_m)} ·{' '}
        {ES.routeComparison.duration}: {formatDuration(route.duration_s)}
      </AccessibleText>

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

      <AccessibleText accessibilityRole="header" style={styles.sectionTitle}>
        {ES.routeComparison.reasonsTitle}
      </AccessibleText>
      {route.reasons.map((reason) => (
        <AccessibleText
          key={`${reason.kind}-${reason.dimension}`}
          style={styles.detail}
        >
          • {describeReason(reason)}
        </AccessibleText>
      ))}

      <AccessibleText accessibilityRole="header" style={styles.sectionTitle}>
        {ES.routeComparison.warningsTitle}
      </AccessibleText>
      {route.warnings.length === 0 ? (
        <AccessibleText style={styles.detail}>
          {ES.routeComparison.noWarnings}
        </AccessibleText>
      ) : (
        route.warnings.map((warning) => (
          <View
            accessible
            accessibilityLanguage="es-ES"
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
