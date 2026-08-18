import { StyleSheet, Text, View } from 'react-native';

import type { ComparedRoute } from '@/api/types';
import { AccessibleText } from '@/components/AccessibleText';
import { MetricItem } from '@/components/MetricItem';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  describeReason,
  describeWarning,
  formatDistance,
  formatDuration,
  formatPercentage,
} from '@/features/route-comparison/presenters';
import { ES } from '../../i18n/es';

interface RouteCardProps {
  choosing?: boolean;
  disabled?: boolean;
  onChoose: (route: ComparedRoute) => void;
  route: ComparedRoute;
}

export function RouteCard({
  choosing = false,
  disabled = false,
  onChoose,
  route,
}: RouteCardProps) {
  const unknownWarnings = route.warnings.filter(
    (warning) => warning.state === 'unknown',
  );
  const unfavorableWarnings = route.warnings.filter(
    (warning) => warning.state === 'unfavorable',
  );

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
        {route.source === 'ors' && !route.is_synthetic && (
          <AccessibleText style={styles.realData}>
            {ES.routeComparison.realData}
          </AccessibleText>
        )}
      </View>

      {route.source === 'ors' && !route.is_synthetic && (
        <AccessibleText style={styles.provenance}>
          {ES.routeComparison.realDataProvenance}
        </AccessibleText>
      )}

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
        {ES.routeComparison.unknownEvidenceTitle}
      </AccessibleText>
      {unknownWarnings.length === 0 ? (
        <AccessibleText style={styles.detail}>
          {ES.routeComparison.noUnknownEvidence}
        </AccessibleText>
      ) : (
        <>
          <AccessibleText style={styles.detail}>
            {ES.routeComparison.unknownEvidenceIntroduction(
              formatPercentage(route.score.uncertainty),
              unknownWarnings.length,
            )}
          </AccessibleText>
          {unknownWarnings.map((warning) => (
            <AccessibleText
              accessibilityLabel={describeWarning(warning)}
              key={warning.attribute}
              style={styles.unknownWarning}
            >
              {describeWarning(warning)}
            </AccessibleText>
          ))}
        </>
      )}

      <AccessibleText accessibilityRole="header" style={styles.sectionTitle}>
        {ES.routeComparison.unfavorableEvidenceTitle}
      </AccessibleText>
      {unfavorableWarnings.length === 0 ? (
        <AccessibleText style={styles.detail}>
          {ES.routeComparison.noUnfavorableEvidence}
        </AccessibleText>
      ) : (
        unfavorableWarnings.map((warning) => (
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

      <PrimaryButton
        accessibilityHint={ES.routeComparison.chooseRouteHint(route.name)}
        disabled={disabled}
        label={
          choosing
            ? ES.routeComparison.choosingRouteButton
            : ES.routeComparison.chooseRouteButton
        }
        onPress={() => onChoose(route)}
      />
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
  provenance: {
    color: '#285A4B',
    fontSize: 14,
    lineHeight: 20,
  },
  realData: {
    backgroundColor: '#DDF3EA',
    borderRadius: 10,
    color: '#17523E',
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
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
  unknownWarning: {
    backgroundColor: '#F1EFF7',
    borderColor: '#B7AEC9',
    borderRadius: 12,
    borderWidth: 1,
    color: '#40384F',
    fontSize: 14,
    lineHeight: 20,
    overflow: 'hidden',
    padding: 12,
  },
});
