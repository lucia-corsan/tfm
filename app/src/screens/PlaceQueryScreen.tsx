import { useState } from 'react';
import * as Location from 'expo-location';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PlaceResult } from '@/api/types';
import { AccessibleText } from '@/components/AccessibleText';
import { ActionBand } from '@/components/ActionBand';
import { Callout } from '@/components/Callout';
import { Icon, type IconName } from '@/components/icons';
import {
  PlaceSearchField,
  type SearchPlacesFunction,
} from '@/components/PlaceSearchField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import type { SavedPlace } from '@/features/saved-places/storage';
import { focusRing, spacing, useFocusRing, usePresentation } from '@/theme';
import { ES } from '../../i18n/es';

type CurrentLocationStatus = 'denied' | 'idle' | 'loading' | 'unavailable';

interface PlaceQueryScreenProps {
  backHint?: string;
  backLabel?: string;
  field: 'destination' | 'origin';
  onBack?: () => void;
  onNext: () => void;
  onOpenSettings?: () => void;
  onSelect: (place: PlaceResult) => void;
  search?: SearchPlacesFunction;
  savedPlaces?: SavedPlace[];
  selectedPlace: PlaceResult | null;
}

interface ChoiceRowProps {
  hint: string;
  icon: IconName;
  label: string;
  onPress: () => void;
  value?: string;
}

/** Fila de elección: etiqueta destacada y, si existe, el valor bajo ella. */
function ChoiceRow({ hint, icon, label, onPress, value }: ChoiceRowProps) {
  const { focused, focusProps } = useFocusRing();
  const presentation = usePresentation();

  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={value ? `${label}: ${value}` : label}
      accessibilityLanguage="es-ES"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: presentation.colors.border },
        pressed && { backgroundColor: presentation.colors.brandSoft },
        focused && focusRing,
      ]}
      {...focusProps}
    >
      <Icon color={presentation.colors.brandInk} name={icon} size={24} />
      <View style={styles.rowCopy}>
        <Text
          style={[
            presentation.typography.emphasis,
            { color: presentation.colors.brandInk },
          ]}
        >
          {label}
        </Text>
        {value ? (
          <Text
            style={[
              presentation.typography.body,
              { color: presentation.colors.ink },
            ]}
          >
            {value}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/**
 * Elección de un extremo del trayecto, con una única pregunta por pantalla.
 *
 * El origen ofrece además la ubicación actual. Esta versión la expone como
 * coordenadas: traducirlas a un nombre de calle exigiría una geocodificación
 * inversa que el backend todavía no ofrece.
 */
export function PlaceQueryScreen({
  backHint,
  backLabel,
  field,
  onBack,
  onNext,
  onOpenSettings,
  onSelect,
  search,
  savedPlaces = [],
  selectedPlace,
}: PlaceQueryScreenProps) {
  const copy = ES.placeQuery[field];
  const presentation = usePresentation();
  const [locationStatus, setLocationStatus] =
    useState<CurrentLocationStatus>('idle');

  const readCurrentLocation = async () => {
    setLocationStatus('loading');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationStatus('denied');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      onSelect({
        description: ES.placeQuery.currentLocationDescription(
          latitude.toFixed(5).replace('.', ','),
          longitude.toFixed(5).replace('.', ','),
        ),
        location: { latitude, longitude },
        name: ES.placeQuery.currentLocationName,
        place_id: 'current_location',
        source: 'pilot_catalog',
      });
      setLocationStatus('idle');
    } catch {
      setLocationStatus('unavailable');
    }
  };

  return (
    <Screen
      band={
        <ActionBand
          accessibilityHint={ES.placeQuery.nextHint}
          label={ES.placeQuery.nextButton}
          onPress={onNext}
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
          {...(backLabel && onBack ? { backHint, backLabel, onBack } : {})}
          title={ES.appName}
        />
      }
    >
      <AccessibleText accessibilityRole="header" variant="display">
        {copy.title}
      </AccessibleText>

      <PlaceSearchField
        field={field}
        onSelect={onSelect}
        search={search}
        selectedPlace={selectedPlace}
      />

      <View style={styles.savedPlaces}>
        <AccessibleText accessibilityRole="header" variant="subheading">
          {ES.placeQuery.savedPlacesTitle}
        </AccessibleText>
        {savedPlaces.length > 0 ? (
          savedPlaces.map((item) => (
            <ChoiceRow
              hint={ES.savedPlaces.useHint(
                item.name,
                field === 'origin' ? 'origen' : 'destino',
              )}
              icon="mapPin"
              key={item.id}
              label={item.name}
              onPress={() => onSelect(item.place)}
              value={item.place.description}
            />
          ))
        ) : (
          <>
            <AccessibleText
              style={{ color: presentation.colors.inkMuted }}
            >
              {ES.placeQuery.savedPlacesEmpty}
            </AccessibleText>
            {onOpenSettings ? (
              <PrimaryButton
                accessibilityHint={ES.placeQuery.savedPlacesAddHint}
                icon="mapPin"
                label={ES.placeQuery.savedPlacesAddButton}
                onPress={onOpenSettings}
                variant="secondary"
              />
            ) : null}
          </>
        )}
      </View>

      {field === 'origin' && (
        <View style={styles.rows}>
          <ChoiceRow
            hint={ES.placeQuery.useCurrentLocationHint}
            icon="crosshairSimple"
            label={
              locationStatus === 'loading'
                ? ES.placeQuery.currentLocationPending
                : ES.placeQuery.useCurrentLocation
            }
            onPress={() => void readCurrentLocation()}
            {...(selectedPlace ? { value: selectedPlace.name } : {})}
          />
          {locationStatus === 'denied' && (
            <Callout
              accessibilityLiveRegion="assertive"
              role="alert"
              text={ES.placeQuery.currentLocationDenied}
              tone="caution"
            />
          )}
          {locationStatus === 'unavailable' && (
            <Callout
              accessibilityLiveRegion="assertive"
              role="alert"
              text={ES.placeQuery.currentLocationUnavailable}
              tone="caution"
            />
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 68,
    paddingVertical: spacing.md,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rows: {
    gap: 0,
  },
  savedPlaces: { gap: spacing.xs },
});
