import { useCallback, useEffect, useState } from 'react';

import type { NavigationSession } from '@/api/types';
import {
  buildSpeechPreferencesFromAnswers,
  DEFAULT_ONBOARDING_ANSWERS,
  type OnboardingAnswers,
} from '@/features/onboarding/answers';
import {
  loadOnboardingAnswers,
  saveOnboardingAnswers,
} from '@/features/onboarding/storage';
import { sqlitePreferenceStorage } from '@/features/adaptive-preferences/sqliteStorage';
import { InputModeScreen } from '@/screens/InputModeScreen';
import { NavigationScreen } from '@/screens/NavigationScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { RouteComparisonScreen } from '@/screens/RouteComparisonScreen';
import { WelcomeScreen } from '@/screens/WelcomeScreen';

/** Pantallas previas a la elección del trayecto. */
type EntryStage = 'inputMode' | 'onboarding' | 'plan' | 'welcome';

export default function HomeScreen() {
  const [entryStage, setEntryStage] = useState<EntryStage>('welcome');
  const [onboardingAnswers, setOnboardingAnswers] =
    useState<OnboardingAnswers | null>(null);
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);
  const [navigationSession, setNavigationSession] =
    useState<NavigationSession | null>(null);

  useEffect(() => {
    let active = true;
    void loadOnboardingAnswers(sqlitePreferenceStorage).then((answers) => {
      if (!active) {
        return;
      }
      setOnboardingAnswers(answers);
      setOnboardingLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const start = useCallback(() => {
    if (!onboardingLoaded) {
      return;
    }
    setEntryStage(onboardingAnswers ? 'inputMode' : 'onboarding');
  }, [onboardingAnswers, onboardingLoaded]);

  if (navigationSession) {
    return (
      <NavigationScreen
        {...(onboardingAnswers
          ? {
              initialSpeechPreferences:
                buildSpeechPreferencesFromAnswers(onboardingAnswers),
            }
          : {})}
        onFinish={() => setNavigationSession(null)}
        session={navigationSession}
      />
    );
  }

  if (entryStage === 'welcome') {
    return <WelcomeScreen onStart={start} />;
  }

  if (entryStage === 'onboarding') {
    return (
      <OnboardingScreen
        {...(onboardingAnswers ? { initialAnswers: onboardingAnswers } : {})}
        onFinish={(answers) => {
          const resolvedAnswers = answers ?? DEFAULT_ONBOARDING_ANSWERS;
          setOnboardingAnswers(resolvedAnswers);
          void saveOnboardingAnswers(
            sqlitePreferenceStorage,
            resolvedAnswers,
          );
          setEntryStage('inputMode');
        }}
      />
    );
  }

  if (entryStage === 'inputMode') {
    return <InputModeScreen onChooseTyping={() => setEntryStage('plan')} />;
  }

  return (
    <RouteComparisonScreen
      onChooseRoute={setNavigationSession}
      onUpdatePreferences={(answers) => {
        setOnboardingAnswers(answers);
        void saveOnboardingAnswers(sqlitePreferenceStorage, answers);
      }}
      {...(onboardingAnswers ? { onboardingAnswers } : {})}
    />
  );
}
