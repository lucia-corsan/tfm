import { useState } from 'react';

import type { NavigationSession } from '@/api/types';
import { InputModeScreen } from '@/screens/InputModeScreen';
import { NavigationScreen } from '@/screens/NavigationScreen';
import { RouteComparisonScreen } from '@/screens/RouteComparisonScreen';
import { WelcomeScreen } from '@/screens/WelcomeScreen';

/** Pantallas previas a la elección del trayecto. */
type EntryStage = 'inputMode' | 'plan' | 'welcome';

export default function HomeScreen() {
  const [entryStage, setEntryStage] = useState<EntryStage>('welcome');
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

  if (entryStage === 'welcome') {
    return <WelcomeScreen onStart={() => setEntryStage('inputMode')} />;
  }

  if (entryStage === 'inputMode') {
    return <InputModeScreen onChooseTyping={() => setEntryStage('plan')} />;
  }

  return <RouteComparisonScreen onChooseRoute={setNavigationSession} />;
}
