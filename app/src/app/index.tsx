import { useState } from 'react';

import type { ComparedRoute } from '@/api/types';
import { NavigationScreen } from '@/screens/NavigationScreen';
import { RouteComparisonScreen } from '@/screens/RouteComparisonScreen';

export default function HomeScreen() {
  const [selectedRoute, setSelectedRoute] = useState<ComparedRoute | null>(null);

  if (selectedRoute) {
    return (
      <NavigationScreen
        onFinish={() => setSelectedRoute(null)}
        route={selectedRoute}
      />
    );
  }

  return <RouteComparisonScreen onChooseRoute={setSelectedRoute} />;
}
