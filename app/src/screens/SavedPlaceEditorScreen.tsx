import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import type { PlaceResult } from '@/api/types';
import { AccessibleText } from '@/components/AccessibleText';
import { ActionBand } from '@/components/ActionBand';
import { PlaceSearchField, type SearchPlacesFunction } from '@/components/PlaceSearchField';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { radii, spacing, usePresentation } from '@/theme';
import { ES } from '../../i18n/es';

interface SavedPlaceEditorScreenProps {
  onBack?: () => void;
  onOpenSettings?: () => void;
  onSave: (name: string, place: PlaceResult) => void;
  search?: SearchPlacesFunction;
  title: string;
}

/** Formulario accesible para asignar un nombre habitual a una dirección. */
export function SavedPlaceEditorScreen({
  onBack,
  onOpenSettings,
  onSave,
  search,
  title,
}: SavedPlaceEditorScreenProps) {
  const presentation = usePresentation();
  const [name, setName] = useState('');
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const canSave = name.trim().length > 0 && place !== null;

  return (
    <Screen
      band={
        <ActionBand
          accessibilityHint={ES.savedPlaces.saveHint}
          disabled={!canSave}
          label={ES.savedPlaces.saveButton}
          onPress={() => {
            if (place) {
              onSave(name.trim(), place);
            }
          }}
        />
      }
      header={
        <TopBar
          {...(onOpenSettings
            ? {
                actionHint: ES.settings.openHint,
                actionLabel: ES.settings.openButton,
                onAction: onOpenSettings,
              }
            : {})}
          {...(onBack
            ? {
                backHint: ES.savedPlaces.backHint,
                backLabel: ES.savedPlaces.backButton,
                onBack,
              }
            : {})}
          title={ES.savedPlaces.appBarTitle}
        />
      }
    >
      <AccessibleText accessibilityRole="header" variant="display">
        {title}
      </AccessibleText>
      <AccessibleText style={{ color: presentation.colors.inkMuted }}>
        {ES.savedPlaces.formDescription}
      </AccessibleText>
      <View style={styles.fieldGroup}>
        <AccessibleText accessibilityRole="header" variant="subheading">
          {ES.savedPlaces.nameLabel}
        </AccessibleText>
        <TextInput
          accessibilityHint={ES.savedPlaces.nameHint}
          accessibilityLabel={ES.savedPlaces.nameLabel}
          accessibilityLanguage="es-ES"
          autoCapitalize="words"
          maxLength={60}
          onChangeText={setName}
          placeholder={ES.savedPlaces.namePlaceholder}
          placeholderTextColor={presentation.colors.inkSubtle}
          style={[
            styles.input,
            presentation.typography.emphasis,
            {
              borderColor: presentation.colors.ink,
              color: presentation.colors.ink,
            },
          ]}
          value={name}
        />
      </View>
      <PlaceSearchField
        field="destination"
        onSelect={setPlace}
        search={search}
        selectedPlace={place}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fieldGroup: { gap: spacing.sm },
  input: {
    borderRadius: radii.field,
    borderWidth: 2,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
