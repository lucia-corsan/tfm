import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { PlaceResult } from '@/api/types';
import { AccessibleText } from '@/components/AccessibleText';
import { Callout } from '@/components/Callout';
import type { SearchPlacesFunction } from '@/components/PlaceSearchField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import type { OnboardingAnswers } from '@/features/onboarding/answers';
import type { QuestionId } from '@/features/onboarding/questions';
import type { SavedPlace } from '@/features/saved-places/storage';
import { SavedPlaceEditorScreen } from '@/screens/SavedPlaceEditorScreen';
import { radii, spacing, usePresentation } from '@/theme';
import { ES } from '../../i18n/es';

interface SettingsScreenProps {
  activeNavigation?: boolean;
  answers: OnboardingAnswers;
  onBack: () => void;
  onEditQuestion: (questionId: QuestionId) => void;
  onEditProfile: () => void;
  onAddSavedPlace?: (name: string, place: PlaceResult) => Promise<void>;
  onRemoveSavedPlace?: (id: string) => Promise<void>;
  savedPlaces?: SavedPlace[];
  search?: SearchPlacesFunction;
}

const SPEECH_MODE_LABELS = {
  automatic: ES.settings.speech.automatic,
  never: ES.settings.speech.never,
  onDemand: ES.settings.speech.onDemand,
} as const;

const SPEECH_RATE_LABELS = {
  fast: ES.onboarding.speechRate.options.fast,
  normal: ES.onboarding.speechRate.options.normal,
  slow: ES.onboarding.speechRate.options.slow,
  very_fast: ES.onboarding.speechRate.options.very_fast,
} as const;

/**
 * Ajustes locales del MVP.
 *
 * La pantalla reúne decisiones que la persona puede revisar después de la
 * configuración inicial. Los cambios se aplican después de confirmarlos; el
 * cuestionario completo sigue siendo la fuente de las restricciones y pesos
 * del ranking.
 */
export function SettingsScreen({
  activeNavigation = false,
  answers,
  onBack,
  onEditQuestion,
  onEditProfile,
  onAddSavedPlace = async () => undefined,
  onRemoveSavedPlace = async () => undefined,
  savedPlaces = [],
  search,
}: SettingsScreenProps) {
  const presentation = usePresentation();
  const personalizedProfile = answers.profileMode === 'personalized';
  const [addingSavedPlace, setAddingSavedPlace] = useState(false);

  if (addingSavedPlace) {
    return (
      <SavedPlaceEditorScreen
        onBack={() => setAddingSavedPlace(false)}
        onSave={(name, place) => {
          void onAddSavedPlace(name, place).then(() =>
            setAddingSavedPlace(false),
          );
        }}
        search={search}
        title={ES.savedPlaces.settingsFormTitle}
      />
    );
  }

  return (
    <Screen
      header={
        <TopBar
          backHint={ES.settings.backHint}
          backLabel={ES.settings.backButton}
          onBack={onBack}
          title={ES.settings.title}
        />
      }
    >
      <AccessibleText style={{ color: presentation.colors.inkMuted }}>
        {ES.settings.savedNotice}
      </AccessibleText>
      {activeNavigation ? (
        <Callout text={ES.settings.activeNavigationNotice} tone="caution" />
      ) : null}

      <SettingsSection
        description={ES.settings.favorites.description}
        title={ES.settings.favorites.title}
      >
        {savedPlaces.length === 0 ? (
          <AccessibleText style={{ color: presentation.colors.inkMuted }}>
            {ES.settings.favorites.empty}
          </AccessibleText>
        ) : (
          <View style={styles.savedPlaces}>
            {savedPlaces.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.savedPlace,
                  { borderColor: presentation.colors.border },
                ]}
              >
                <View style={styles.savedPlaceCopy}>
                  <AccessibleText variant="subheading">
                    {item.name}
                  </AccessibleText>
                  <AccessibleText
                    style={{ color: presentation.colors.inkMuted }}
                  >
                    {item.place.description}
                  </AccessibleText>
                </View>
                <PrimaryButton
                  accessibilityHint={ES.settings.favorites.deleteHint(
                    item.name,
                  )}
                  accessibilityLabel={ES.settings.favorites.deleteButton(
                    item.name,
                  )}
                  icon="trash"
                  label={ES.settings.favorites.deleteButton(item.name)}
                  onPress={() => void onRemoveSavedPlace(item.id)}
                  variant="quiet"
                />
              </View>
            ))}
          </View>
        )}
        <PrimaryButton
          accessibilityHint={ES.settings.favorites.addHint}
          icon="mapPin"
          label={ES.settings.favorites.addButton}
          onPress={() => setAddingSavedPlace(true)}
          variant="secondary"
        />
      </SettingsSection>

      <SettingsSection
        description={
          personalizedProfile
            ? ES.settings.routePreferences.description
            : ES.settings.routePreferences.genericDescription
        }
        title={ES.settings.routePreferences.title}
      >
        <PrimaryButton
          accessibilityHint={
            personalizedProfile
              ? ES.settings.routePreferences.hint
              : ES.settings.routePreferences.genericHint
          }
          icon="slidersHorizontal"
          label={
            personalizedProfile
              ? ES.settings.routePreferences.button
              : ES.settings.routePreferences.genericButton
          }
          onPress={onEditProfile}
          variant="secondary"
        />
      </SettingsSection>

      <SettingsSection
        description={ES.settings.presentation.description}
        title={ES.settings.presentation.title}
      >
        <AccessibleText style={{ color: presentation.colors.inkMuted }}>
          {ES.settings.currentValue(
            ES.onboarding.presentation.options[answers.presentation],
          )}
        </AccessibleText>
        <PrimaryButton
          accessibilityHint={ES.settings.presentation.editHint}
          icon="slidersHorizontal"
          label={ES.settings.presentation.editButton}
          onPress={() => onEditQuestion('presentation')}
          variant="secondary"
        />
      </SettingsSection>

      <SettingsSection
        description={ES.settings.speech.modeDescription}
        title={ES.settings.speech.title}
      >
        <AccessibleText style={{ color: presentation.colors.inkMuted }}>
          {ES.settings.currentValue(SPEECH_MODE_LABELS[answers.speech])}
        </AccessibleText>
        <PrimaryButton
          accessibilityHint={ES.settings.speech.editModeHint}
          icon="speakerHigh"
          label={ES.settings.speech.editModeButton}
          onPress={() => onEditQuestion('speech')}
          variant="secondary"
        />
        {answers.speech !== 'never' ? (
          <>
            <AccessibleText style={{ color: presentation.colors.inkMuted }}>
              {ES.settings.currentValue(
                SPEECH_RATE_LABELS[answers.speechRate],
              )}
            </AccessibleText>
            <PrimaryButton
              accessibilityHint={ES.settings.speech.editRateHint}
              icon="clock"
              label={ES.settings.speech.editRateButton}
              onPress={() => onEditQuestion('speechRate')}
              variant="secondary"
            />
          </>
        ) : null}
        <AccessibleText style={{ color: presentation.colors.inkMuted }}>
          {ES.settings.speech.note}
        </AccessibleText>
      </SettingsSection>

      <SettingsSection
        description={
          personalizedProfile
            ? ES.settings.learning.description
            : ES.settings.learning.genericDescription
        }
        title={ES.settings.learning.title}
      >
        {personalizedProfile ? (
          <>
            <AccessibleText style={{ color: presentation.colors.inkMuted }}>
              {ES.settings.currentValue(
                answers.adaptiveLearning
                  ? ES.settings.learning.enabled
                  : ES.settings.learning.disabled,
              )}
            </AccessibleText>
            <PrimaryButton
              accessibilityHint={ES.settings.learning.editHint}
              icon="sparkle"
              label={ES.settings.learning.editButton}
              onPress={() => onEditQuestion('learning')}
              variant="secondary"
            />
          </>
        ) : (
          <AccessibleText style={{ color: presentation.colors.inkMuted }}>
            {ES.settings.learning.genericNotice}
          </AccessibleText>
        )}
      </SettingsSection>

      <SettingsSection
        description={ES.settings.privacy.description}
        title={ES.settings.privacy.title}
      />
    </Screen>
  );
}

interface SettingsSectionProps {
  children?: ReactNode;
  description: string;
  title: string;
}

function SettingsSection({
  children,
  description,
  title,
}: SettingsSectionProps) {
  const presentation = usePresentation();
  return (
    <View
      style={[
        styles.section,
        { borderBottomColor: presentation.colors.border },
      ]}
    >
      <AccessibleText accessibilityRole="header" variant="section">
        {title}
      </AccessibleText>
      <AccessibleText style={{ color: presentation.colors.inkMuted }}>
        {description}
      </AccessibleText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  savedPlace: {
    borderRadius: radii.field,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  savedPlaceCopy: { gap: spacing.xs },
  savedPlaces: { gap: spacing.md },
  section: {
    borderBottomWidth: 1,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
});
