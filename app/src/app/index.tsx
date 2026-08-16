import { useState } from 'react';

import type { NavigationSession } from '@/api/types';
import { NavigationScreen } from '@/screens/NavigationScreen';
import { RouteComparisonScreen } from '@/screens/RouteComparisonScreen';

export default function HomeScreen() {
  const [navigationSession, setNavigationSession] =
    useState<NavigationSession | null>(null);

  if (navigationSession) {
    return (
      <NavigationScreen
        onFinish={() => setNavigationSession(null)}
        session={navigationSession}
      />
    );
  }

  return <RouteComparisonScreen onChooseRoute={setNavigationSession} />;
}
