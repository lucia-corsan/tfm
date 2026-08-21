import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ComparedRoute } from '@/api/types';
import { AccessibleText } from '@/components/AccessibleText';
import { Callout } from '@/components/Callout';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/icons';
import { MetricItem } from '@/components/MetricItem';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  describeReason,
  describeWarning,
  formatDistance,
  formatDuration,
  formatPercentage,
} from '@/features/route-comparison/presenters';
import { spacing, usePresentation } from '@/theme';
import { ES } from '../../i18n/es';

interface RouteCardProps {
  choosing?: boolean;
  disabled?: boolean;
  onChoose: (route: ComparedRoute) => void;
  route: ComparedRoute;
}

/**
 * Resumen accionable de una alternativa.
 *
 * Muestra siempre la evidencia desfavorable, porque es un aviso de seguridad,
 * y remite al detalle la información que todavía no puede confirmarse.
 */
export function RouteCard({
  choosing = false,
  disabled = false,
  onChoose,
  route,
}: RouteCardProps) {
  const presentation = usePresentation();
  const [detailExpanded, setDetailExpanded] = useState(false);
  const unknownWarnings = route.warnings.filter(
    (warning) => warning.state === 'unknown',
  );
  const unfavorableWarnings = route.warnings.filter(
    (warning) => warning.state === 'unfavorable',
  );

  return (
    <Card highlighted={route.rank === 1}>
      <View style={styles.chips}>
        <Chip
          icon={route.rank === 1 ? 'trophy' : 'listChecks'}
          label={
            route.rank === 1
              ? ES.routeComparison.bestRouteLabel
              : ES.routeComparison.rankLabel(route.rank)
          }
          tone={route.rank === 1 ? 'accent' : 'neutral'}
        />
        {route.is_synthetic ? (
          <Chip
            icon="sparkle"
            label={ES.routeComparison.syntheticData}
            tone="unknown"
          />
        ) : null}
        {route.source === 'ors' && !route.is_synthetic ? (
          <Chip
            icon="shieldCheck"
            label={ES.routeComparison.realData}
            tone="brand"
          />
        ) : null}
        {unfavorableWarnings.length > 0 ? (
          <Chip
            icon="warning"
            label={ES.routeComparison.unfavorableCountChip(
              unfavorableWarnings.length,
            )}
            tone="caution"
          />
        ) : null}
      </View>

      <AccessibleText accessibilityRole="header" variant="section">
        {route.name}
      </AccessibleText>

      <AccessibleText style={{ color: presentation.colors.inkMuted }}>
        {`${ES.routeComparison.distance}: ${formatDistance(route.distance_m)} · ${ES.routeComparison.duration}: ${formatDuration(route.duration_s)}`}
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

      <View style={styles.reasons}>
        <AccessibleText accessibilityRole="header" variant="subheading">
          {ES.routeComparison.reasonsTitle}
        </AccessibleText>
        {route.reasons.map((reason) => (
          <View key={`${reason.kind}-${reason.dimension}`} style={styles.reason}>
            <Icon
              color={presentation.colors.brandInk}
              name="checkCircle"
              size={20}
            />
            <AccessibleText
              style={[styles.reasonText, { color: presentation.colors.inkMuted }]}
              variant="body"
            >
              {describeReason(reason)}
            </AccessibleText>
          </View>
        ))}
      </View>

      <PrimaryButton
        accessibilityHint={ES.routeComparison.detailsHint(route.name)}
        expanded={detailExpanded}
        icon={detailExpanded ? 'caretUp' : 'caretDown'}
        label={
          detailExpanded
            ? ES.routeComparison.detailsCloseButton
            : ES.routeComparison.detailsButton
        }
        onPress={() => setDetailExpanded(!detailExpanded)}
        variant="quiet"
      />

      {detailExpanded && (
        <View
          style={[
            styles.detail,
            { borderTopColor: presentation.colors.border },
          ]}
        >
          {route.source === 'ors' && !route.is_synthetic ? (
            <AccessibleText
              style={{ color: presentation.colors.inkSubtle }}
              variant="meta"
            >
              {ES.routeComparison.realDataProvenance}
            </AccessibleText>
          ) : null}

          <AccessibleText accessibilityRole="header" variant="subheading">
            {ES.routeComparison.unknownEvidenceTitle}
          </AccessibleText>
          {unknownWarnings.length === 0 ? (
            <AccessibleText
              style={[styles.reasonText, { color: presentation.colors.inkMuted }]}
            >
              {ES.routeComparison.noUnknownEvidence}
            </AccessibleText>
          ) : (
            <>
              <AccessibleText
                style={[styles.reasonText, { color: presentation.colors.inkMuted }]}
              >
                {ES.routeComparison.unknownEvidenceIntroduction(
                  formatPercentage(route.score.uncertainty),
                  unknownWarnings.length,
                )}
              </AccessibleText>
              {unknownWarnings.map((warning) => (
                <Callout
                  key={warning.attribute}
                  text={describeWarning(warning)}
                  tone="unknown"
                />
              ))}
            </>
          )}

          <AccessibleText accessibilityRole="header" variant="subheading">
            {ES.routeComparison.unfavorableEvidenceTitle}
          </AccessibleText>
          {unfavorableWarnings.length === 0 ? (
            <AccessibleText
              style={[styles.reasonText, { color: presentation.colors.inkMuted }]}
            >
              {ES.routeComparison.noUnfavorableEvidence}
            </AccessibleText>
          ) : (
            unfavorableWarnings.map((warning) => (
              <Callout
                key={warning.attribute}
                role="alert"
                text={describeWarning(warning)}
                tone="caution"
              />
            ))
          )}
        </View>
      )}

      <View style={styles.actions}>
        <PrimaryButton
          accessibilityHint={ES.routeComparison.chooseRouteHint(route.name)}
          disabled={disabled}
          icon="navigationArrow"
          label={
            choosing
              ? ES.routeComparison.choosingRouteButton
              : ES.routeComparison.chooseRouteButton
          }
          onPress={() => onChoose(route)}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  chips: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reason: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reasonText: {
    flex: 1,
  },
  detail: {
    borderTopWidth: 1,
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  reasons: {
    gap: spacing.sm,
  },
});
