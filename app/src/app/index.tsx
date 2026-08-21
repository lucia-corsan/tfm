import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Modal } from 'react-native';

import type { NavigationSession } from '@/api/types';
import { sqlitePreferenceStorage } from '@/features/adaptive-preferences/sqliteStorage';
import {
  buildSpeechPreferencesFromAnswers,
  DEFAULT_ONBOARDING_ANSWERS,
  type OnboardingAnswers,
} from '@/features/onboarding/answers';
import {
  loadOnboardingAnswers,
  saveOnboardingAnswers,
} from '@/features/onboarding/storage';
import { NavigationScreen } from '@/screens/NavigationScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { OnboardingQuestionEditorScreen } from '@/screens/OnboardingQuestionEditorScreen';
import { RouteComparisonScreen } from '@/screens/RouteComparisonScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { SavedPlacesOnboardingScreen } from '@/screens/SavedPlacesOnboardingScreen';
import { WelcomeScreen } from '@/screens/WelcomeScreen';
import { useSavedPlaces } from '@/features/saved-places/useSavedPlaces';
import { PresentationProvider } from '@/theme';
import type { QuestionId } from '@/features/onboarding/questions';

/** Pantallas previas a la elección del trayecto. */
type EntryStage =
  | 'onboarding'
  | 'plan'
  | 'savedPlaces'
  | 'welcome';

export default function HomeScreen() {
  const [entryStage, setEntryStage] = useState<EntryStage>('welcome');
  const [onboardingAnswers, setOnboardingAnswers] =
    useState<OnboardingAnswers | null>(null);
  const [onboardingDraft, setOnboardingDraft] = useState<OnboardingAnswers>(
    DEFAULT_ONBOARDING_ANSWERS,
  );
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);
  const [navigationSession, setNavigationSession] =
    useState<NavigationSession | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingProfileFromSettings, setEditingProfileFromSettings] =
    useState(false);
  const [editingQuestionFromSettings, setEditingQuestionFromSettings] =
    useState<QuestionId | null>(null);
  const savedPlaces = useSavedPlaces(sqlitePreferenceStorage);

  useEffect(() => {
    let active = true;
    void loadOnboardingAnswers(sqlitePreferenceStorage).then((answers) => {
      if (!active) {
        return;
      }
      setOnboardingAnswers(answers);
      if (answers) {
        setOnboardingDraft(answers);
      }
      setOnboardingLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const persistAnswers = useCallback((answers: OnboardingAnswers) => {
    setOnboardingAnswers(answers);
    void saveOnboardingAnswers(sqlitePreferenceStorage, answers);
  }, []);

  const start = useCallback(() => {
    if (!onboardingLoaded || !savedPlaces.loaded) {
      return;
    }
    if (!onboardingAnswers) {
      setEntryStage('onboarding');
      return;
    }
    setEntryStage(savedPlaces.onboardingCompleted ? 'plan' : 'savedPlaces');
  }, [
    onboardingAnswers,
    onboardingLoaded,
    savedPlaces.loaded,
    savedPlaces.onboardingCompleted,
  ]);

  const closeSettings = useCallback(() => {
    setEditingProfileFromSettings(false);
    setEditingQuestionFromSettings(null);
    setSettingsOpen(false);
  }, []);

  const settingsAnswers =
    onboardingAnswers ??
    (entryStage === 'onboarding' ? onboardingDraft : null);

  const updateSettingsAnswers = useCallback(
    (answers: OnboardingAnswers) => {
      if (onboardingAnswers) {
        persistAnswers(answers);
        return;
      }
      setOnboardingDraft(answers);
    },
    [onboardingAnswers, persistAnswers],
  );

  let content: ReactNode;

  if (navigationSession) {
    content = (
      <NavigationScreen
        {...(onboardingAnswers
          ? {
              initialSpeechPreferences:
                buildSpeechPreferencesFromAnswers(onboardingAnswers),
            }
          : {})}
        onFinish={() => setNavigationSession(null)}
        onOpenSettings={() => setSettingsOpen(true)}
        session={navigationSession}
      />
    );
  } else if (entryStage === 'welcome') {
    content = <WelcomeScreen onStart={start} />;
  } else if (entryStage === 'onboarding') {
    content = (
      <OnboardingScreen
        initialAnswers={onboardingDraft}
        onAnswersChange={setOnboardingDraft}
        onFinish={(answers) => {
          persistAnswers(answers);
          setEntryStage('savedPlaces');
        }}
        onOpenSettings={() => setSettingsOpen(true)}
      />
    );
  } else if (entryStage === 'savedPlaces') {
    content = (
      <SavedPlacesOnboardingScreen
        onAdd={savedPlaces.add}
        onFinish={() => {
          void savedPlaces.completeOnboarding().then(() =>
            setEntryStage('plan'),
          );
        }}
        onOpenSettings={() => setSettingsOpen(true)}
      />
    );
  } else {
    content = (
      <RouteComparisonScreen
        onChooseRoute={setNavigationSession}
        onOpenSettings={() => setSettingsOpen(true)}
        onUpdatePreferences={persistAnswers}
        savedPlaces={savedPlaces.items}
        {...(onboardingAnswers ? { onboardingAnswers } : {})}
      />
    );
  }

  return (
    <PresentationProvider
      mode={
        entryStage === 'onboarding'
          ? onboardingDraft.presentation
          : onboardingAnswers?.presentation ?? 'system'
      }
    >
      {content}
      {settingsAnswers ? (
        <Modal
          animationType="slide"
          onRequestClose={closeSettings}
          presentationStyle="fullScreen"
          visible={settingsOpen}
        >
          {editingQuestionFromSettings ? (
            <OnboardingQuestionEditorScreen
              answers={settingsAnswers}
              onBack={() => setEditingQuestionFromSettings(null)}
              onSave={(answers) => {
                updateSettingsAnswers(answers);
                setEditingQuestionFromSettings(null);
              }}
              questionId={editingQuestionFromSettings}
            />
          ) : editingProfileFromSettings ? (
            <OnboardingScreen
              initialAnswers={settingsAnswers}
              onFinish={(answers) => {
                persistAnswers(answers);
                setEditingProfileFromSettings(false);
              }}
              onOpenSettings={() => setEditingProfileFromSettings(false)}
            />
          ) : (
            <SettingsScreen
              activeNavigation={navigationSession !== null}
              answers={settingsAnswers}
              onBack={closeSettings}
              onEditQuestion={setEditingQuestionFromSettings}
              onEditProfile={() => {
                if (onboardingAnswers) {
                  setEditingProfileFromSettings(true);
                  return;
                }
                closeSettings();
              }}
              onAddSavedPlace={savedPlaces.add}
              onRemoveSavedPlace={savedPlaces.remove}
              savedPlaces={savedPlaces.items}
            />
          )}
        </Modal>
      ) : null}
    </PresentationProvider>
  );
}
