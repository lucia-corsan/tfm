import { StyleSheet, View } from 'react-native';

import type { ComparedRoute, RouteCompareResponse } from '@/api/types';
import { RejectedRouteCard } from '@/components/RejectedRouteCard';
import { RouteCard } from '@/components/RouteCard';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { spacing } from '@/theme';
import { ES } from '../../i18n/es';

interface RouteResultsScreenProps {
  choosingRouteId: string | null;
  onBack: () => void;
  onChooseRoute: (route: ComparedRoute) => void;
  onOpenSettings?: () => void;
  response: RouteCompareResponse;
}

/** Segunda pantalla: alternativas ordenadas, ya sin el formulario de búsqueda. */
export function RouteResultsScreen({
  choosingRouteId,
  onBack,
  onChooseRoute,
  onOpenSettings,
  response,
}: RouteResultsScreenProps) {
  return (
    <Screen
      header={
        <TopBar
          {...(onOpenSettings
            ? {
                actionHint: ES.settings.openHint,
                actionLabel: ES.settings.openButton,
                onAction: onOpenSettings,
              }
            : {})}
          backHint={ES.routeComparison.backToSearchHint}
          backLabel={ES.routeComparison.backToSearchButton}
          onBack={onBack}
          title={ES.routeComparison.resultsAppBarTitle}
        />
      }
    >
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
          {response.rejected_routes.map((route) => (
            <RejectedRouteCard key={route.route_id} route={route} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.lg,
  },
});
