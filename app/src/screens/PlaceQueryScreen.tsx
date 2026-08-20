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
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import {
  colors,
  focusRing,
  spacing,
  typography,
  useFocusRing,
} from '@/theme';
import { ES } from '../../i18n/es';

type CurrentLocationStatus = 'denied' | 'idle' | 'loading' | 'unavailable';

interface PlaceQueryScreenProps {
  backHint?: string;
  backLabel?: string;
  field: 'destination' | 'origin';
  onBack?: () => void;
  onNext: () => void;
  onSelect: (place: PlaceResult) => void;
  search?: SearchPlacesFunction;
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

  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={value ? `${label}: ${value}` : label}
      accessibilityLanguage="es-ES"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
        focused && focusRing,
      ]}
      {...focusProps}
    >
      <Icon color={colors.brandInk} name={icon} size={24} />
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
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
  onSelect,
  search,
  selectedPlace,
}: PlaceQueryScreenProps) {
  const copy = ES.placeQuery[field];
  const [locationStatus, setLocationStatus] =
    useState<CurrentLocationStatus>('idle');
  const [manualEntry, setManualEntry] = useState(field === 'destination');

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
          {...(backLabel && onBack ? { backHint, backLabel, onBack } : {})}
          title={ES.appName}
        />
      }
    >
      <AccessibleText accessibilityRole="header" variant="display">
        {copy.title}
      </AccessibleText>

      {field === 'origin' && !manualEntry && (
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
          <ChoiceRow
            hint={ES.placeQuery.chooseOtherOriginHint}
            icon="magnifyingGlass"
            label={ES.placeQuery.chooseOtherOrigin}
            onPress={() => setManualEntry(true)}
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

      {manualEntry && (
        <PlaceSearchField
          field={field}
          onSelect={onSelect}
          search={search}
          selectedPlace={selectedPlace}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
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
  rowLabel: {
    ...typography.emphasis,
    color: colors.brandInk,
  },
  rowPressed: {
    backgroundColor: colors.brandSoft,
  },
  rowValue: {
    ...typography.body,
    color: colors.ink,
  },
  rows: {
    gap: 0,
  },
});
