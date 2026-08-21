import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { PlaceResult } from '@/api/types';
import { AccessibleText } from '@/components/AccessibleText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import type { SearchPlacesFunction } from '@/components/PlaceSearchField';
import { SavedPlaceEditorScreen } from '@/screens/SavedPlaceEditorScreen';
import { spacing, usePresentation } from '@/theme';
import { ES } from '../../i18n/es';

interface SavedPlacesOnboardingScreenProps {
  onAdd: (name: string, place: PlaceResult) => Promise<void>;
  onFinish: () => void;
  onOpenSettings?: () => void;
  search?: SearchPlacesFunction;
}

/** Paso opcional tras el perfil para guardar el primer lugar habitual. */
export function SavedPlacesOnboardingScreen({
  onAdd,
  onFinish,
  onOpenSettings,
  search,
}: SavedPlacesOnboardingScreenProps) {
  const presentation = usePresentation();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <SavedPlaceEditorScreen
        onBack={() => setEditing(false)}
        {...(onOpenSettings ? { onOpenSettings } : {})}
        onSave={(name, place) => {
          void onAdd(name, place).then(onFinish);
        }}
        search={search}
        title={ES.savedPlaces.onboardingFormTitle}
      />
    );
  }

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
          title={ES.appName}
        />
      }
    >
      <AccessibleText accessibilityRole="header" variant="display">
        {ES.savedPlaces.onboardingTitle}
      </AccessibleText>
      <AccessibleText style={{ color: presentation.colors.inkMuted }}>
        {ES.savedPlaces.onboardingDescription}
      </AccessibleText>
      <View style={styles.actions}>
        <PrimaryButton
          accessibilityHint={ES.savedPlaces.onboardingAddHint}
          label={ES.savedPlaces.onboardingAddButton}
          onPress={() => setEditing(true)}
        />
        <PrimaryButton
          accessibilityHint={ES.savedPlaces.onboardingSkipHint}
          label={ES.savedPlaces.onboardingSkipButton}
          onPress={onFinish}
          variant="secondary"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ actions: { gap: spacing.md } });
