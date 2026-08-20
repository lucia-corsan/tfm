import { StyleSheet, View } from 'react-native';

import type { ComparedRoute, RouteCompareResponse } from '@/api/types';
import { AccessibleText } from '@/components/AccessibleText';
import { Callout } from '@/components/Callout';
import { RejectedRouteCard } from '@/components/RejectedRouteCard';
import { RouteCard } from '@/components/RouteCard';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { TopBar } from '@/components/TopBar';
import { colors, spacing } from '@/theme';
import { ES } from '../../i18n/es';

interface RouteResultsScreenProps {
  choosingRouteId: string | null;
  destinationName: string;
  onBack: () => void;
  onChooseRoute: (route: ComparedRoute) => void;
  originName: string;
  response: RouteCompareResponse;
}

/** Segunda pantalla: alternativas ordenadas, ya sin el formulario de búsqueda. */
export function RouteResultsScreen({
  choosingRouteId,
  destinationName,
  onBack,
  onChooseRoute,
  originName,
  response,
}: RouteResultsScreenProps) {
  const hasRoutes = response.routes.length > 0;

  return (
    <Screen
      header={
        <TopBar
          backHint={ES.routeComparison.backToSearchHint}
          backLabel={ES.routeComparison.backToSearchButton}
          onBack={onBack}
          brand
          title={ES.appName}
        />
      }
    >
      <AccessibleText style={styles.journey} variant="meta">
        {ES.routeComparison.resultsAppBarSubtitle(originName, destinationName)}
      </AccessibleText>

      <Callout
        accessibilityLiveRegion="polite"
        text={ES.routeComparison.resultSummary(
          response.routes.length,
          response.rejected_routes.length,
        )}
        tone="positive"
      />

      <SectionHeader
        description={
          hasRoutes
            ? ES.routeComparison.resultIntroduction
            : ES.routeComparison.noAcceptedRoutesDescription
        }
        icon={hasRoutes ? 'listChecks' : 'warningCircle'}
        title={
          hasRoutes
            ? ES.routeComparison.resultTitle
            : ES.routeComparison.noAcceptedRoutesTitle
        }
      />

      <View style={styles.list}>
        {response.routes.map((route) => (
          <RouteCard
            choosing={choosingRouteId === route.route_id}
            disabled={choosingRouteId !== null}
            key={route.route_id}
            onChoose={onChooseRoute}
            route={route}
          />
        ))}
      </View>

      {response.rejected_routes.length > 0 && (
        <View style={styles.list}>
          <SectionHeader
            description={ES.routeComparison.rejectedDescription}
            icon="eyeSlash"
            title={ES.routeComparison.rejectedTitle}
          />
          {response.rejected_routes.map((route) => (
            <RejectedRouteCard key={route.route_id} route={route} />
          ))}
        </View>
      )}

      <AccessibleText style={styles.disclaimer} variant="meta">
        {ES.routeComparison.disclaimer}
      </AccessibleText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  journey: {
    color: colors.inkMuted,
  },
  disclaimer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    color: colors.inkSubtle,
    paddingTop: spacing.lg,
  },
  list: {
    gap: spacing.lg,
  },
});
