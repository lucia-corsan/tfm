import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { searchPlaces } from '@/api/client';
import type { PlaceResult, PlaceSearchResponse } from '@/api/types';
import { AccessibleText } from '@/components/AccessibleText';
import { Callout } from '@/components/Callout';
import { Icon } from '@/components/icons';
import {
  colors,
  focusRing,
  MINIMUM_TOUCH_TARGET,
  radii,
  spacing,
  typography,
  usePresentation,
} from '@/theme';

import { ES } from '../../i18n/es';

export type SearchPlacesFunction = (query: string) => Promise<PlaceSearchResponse>;

interface PlaceSearchFieldProps {
  field: 'destination' | 'origin';
  onSelect: (place: PlaceResult) => void;
  search?: SearchPlacesFunction;
  selectedPlace: PlaceResult | null;
}

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'results'; places: PlaceResult[] }
  | { status: 'empty' | 'error' | 'invalid' };

/** Campo de búsqueda de un extremo del trayecto, con su selección visible. */
export function PlaceSearchField({
  field,
  onSelect,
  search = searchPlaces,
  selectedPlace,
}: PlaceSearchFieldProps) {
  const copy = ES.routeComparison.placeSearch[field];
  const presentation = usePresentation();
  const [query, setQuery] = useState(selectedPlace?.name ?? '');
  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [dictationFocused, setDictationFocused] = useState(false);
  const [dictationRequested, setDictationRequested] = useState(false);
  const requestVersion = useRef(0);

  const runSearch = useCallback(async () => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      setState({ status: 'invalid' });
      return;
    }
    const currentVersion = requestVersion.current + 1;
    requestVersion.current = currentVersion;
    setState({ status: 'loading' });
    try {
      const response = await search(normalizedQuery);
      if (requestVersion.current !== currentVersion) {
        return;
      }
      setState(
        response.places.length > 0
          ? { places: response.places, status: 'results' }
          : { status: 'empty' },
      );
    } catch {
      if (requestVersion.current === currentVersion) {
        setState({ status: 'error' });
      }
    }
  }, [query, search]);

  const updateQuery = useCallback((value: string) => {
    requestVersion.current += 1;
    setQuery(value);
    setState({ status: 'idle' });
  }, []);

  const selectResult = useCallback(
    (place: PlaceResult) => {
      requestVersion.current += 1;
      onSelect(place);
      setQuery(place.name);
      setState({ status: 'idle' });
    },
    [onSelect],
  );

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Icon
          color={presentation.colors.brandInk}
          name={field === 'origin' ? 'mapPin' : 'flagCheckered'}
          size={22}
        />
        <AccessibleText accessibilityRole="header" variant="subheading">
          {copy.label}
        </AccessibleText>
      </View>

      <View
        style={[styles.field, { borderColor: presentation.colors.ink }]}
      >
        <TextInput
          accessibilityHint={copy.inputHint}
          accessibilityLanguage="es-ES"
          accessibilityLabel={copy.inputLabel}
          autoCapitalize="words"
          autoCorrect={false}
          onChangeText={updateQuery}
          onSubmitEditing={() => void runSearch()}
          placeholderTextColor={presentation.colors.inkSubtle}
          returnKeyType="search"
          style={[
            styles.input,
            presentation.typography.emphasis,
            { color: presentation.colors.ink },
          ]}
          value={query}
        />
        <Pressable
          accessibilityHint={ES.placeQuery.microphoneHint}
          accessibilityLanguage="es-ES"
          accessibilityLabel={ES.placeQuery[field].microphoneLabel}
          accessibilityRole="button"
          onBlur={() => setDictationFocused(false)}
          onFocus={() => setDictationFocused(true)}
          onPress={() => setDictationRequested(true)}
          style={({ pressed }) => [
            styles.dictationButton,
            pressed && { backgroundColor: presentation.colors.brandSoft },
            dictationFocused && focusRing,
          ]}
        >
          <Icon
            color={presentation.colors.brandInk}
            name="microphone"
            size={24}
          />
        </Pressable>
      </View>

      <AccessibleText
        style={{ color: presentation.colors.inkMuted }}
        variant="meta"
      >
        {ES.placeQuery.inputHint}
      </AccessibleText>

      <View>
        <Pressable
          accessibilityHint={copy.searchHint}
          accessibilityLanguage="es-ES"
          accessibilityLabel={copy.searchButton}
          accessibilityRole="button"
          accessibilityState={{ disabled: state.status === 'loading' }}
          disabled={state.status === 'loading'}
          onBlur={() => setSearchFocused(false)}
          onFocus={() => setSearchFocused(true)}
          onPress={() => void runSearch()}
          style={({ pressed }) => [
            styles.searchButton,
            { backgroundColor: presentation.colors.brandSoft },
            pressed && { backgroundColor: presentation.colors.border },
            searchFocused && focusRing,
          ]}
        >
          <Icon
            color={presentation.colors.brandInk}
            name="magnifyingGlass"
            size={22}
          />
          <Text
            style={[
              presentation.typography.emphasis,
              { color: presentation.colors.brandInk },
            ]}
          >
            {copy.searchButton}
          </Text>
        </Pressable>
      </View>

      {dictationRequested && (
        <Callout
          accessibilityLiveRegion="assertive"
          role="alert"
          text={ES.placeQuery.voiceUnavailable}
          tone="caution"
        />
      )}

      {selectedPlace && (
        <View
          accessible
          accessibilityLanguage="es-ES"
          accessibilityRole="text"
          style={[
            styles.selection,
            { borderColor: presentation.colors.border },
          ]}
        >
          <Icon
            color={presentation.colors.brandInk}
            name="checkCircle"
            size={20}
          />
          <View style={styles.selectionCopy}>
            <Text
              style={[
                presentation.typography.meta,
                { color: presentation.colors.inkMuted },
              ]}
            >
              {ES.routeComparison.placeSearch.selectedLabel}
            </Text>
            <Text
              style={[
                presentation.typography.emphasis,
                { color: presentation.colors.ink },
              ]}
            >
              {selectedPlace.name}
            </Text>
            <Text
              style={[
                presentation.typography.meta,
                { color: presentation.colors.inkMuted },
              ]}
            >
              {selectedPlace.description}
            </Text>
          </View>
        </View>
      )}

      {state.status === 'loading' && (
        <View
          accessible
          accessibilityLanguage="es-ES"
          accessibilityLabel={ES.routeComparison.placeSearch.loading}
          accessibilityLiveRegion="polite"
          accessibilityRole="progressbar"
          accessibilityState={{ busy: true }}
          style={styles.status}
        >
          <ActivityIndicator color={presentation.colors.brandInk} />
          <Text
            style={[
              presentation.typography.body,
              styles.statusText,
              { color: presentation.colors.inkMuted },
            ]}
          >
            {ES.routeComparison.placeSearch.loading}
          </Text>
        </View>
      )}

      {state.status === 'invalid' && (
        <AccessibleText
          accessibilityLiveRegion="polite"
          style={{ color: presentation.colors.inkMuted }}
          variant="body"
        >
          {ES.routeComparison.placeSearch.minimumCharacters}
        </AccessibleText>
      )}
      {state.status === 'empty' && (
        <AccessibleText
          accessibilityLiveRegion="polite"
          style={{ color: presentation.colors.inkMuted }}
          variant="body"
        >
          {ES.routeComparison.placeSearch.noResults}
        </AccessibleText>
      )}
      {state.status === 'error' && (
        <AccessibleText
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={{ color: presentation.colors.dangerOnSoft }}
          variant="body"
        >
          {ES.routeComparison.placeSearch.error}
        </AccessibleText>
      )}

      {state.status === 'results' && (
        <View style={styles.results}>
          <AccessibleText accessibilityRole="header" variant="subheading">
            {copy.resultsTitle}
          </AccessibleText>
          {state.places.map((place) => (
            <Pressable
              accessibilityHint={copy.resultHint}
              accessibilityLanguage="es-ES"
              accessibilityLabel={`${place.name}. ${place.description}`}
              accessibilityRole="button"
              accessibilityState={{
                selected: place.place_id === selectedPlace?.place_id,
              }}
              key={place.place_id}
              onBlur={() => setFocusedPlaceId(null)}
              onFocus={() => setFocusedPlaceId(place.place_id)}
              onPress={() => selectResult(place)}
              style={({ pressed }) => [
                styles.result,
                {
                  backgroundColor: presentation.colors.canvas,
                  borderColor:
                    place.place_id === selectedPlace?.place_id
                      ? presentation.colors.brandInk
                      : presentation.colors.border,
                  borderWidth:
                    place.place_id === selectedPlace?.place_id ? 2 : 1,
                },
                pressed && { backgroundColor: presentation.colors.brandSoft },
                focusedPlaceId === place.place_id && focusRing,
              ]}
            >
              <Icon
                color={presentation.colors.brandInk}
                name="mapPin"
                size={20}
              />
              <View style={styles.resultCopy}>
                <Text
                  style={[
                    presentation.typography.emphasis,
                    { color: presentation.colors.ink },
                  ]}
                >
                  {place.name}
                </Text>
                <Text
                  style={[
                    presentation.typography.meta,
                    { color: presentation.colors.inkMuted },
                  ]}
                >
                  {place.description}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  field: {
    alignItems: 'center',
    borderColor: colors.ink,
    borderRadius: radii.field,
    borderWidth: 1,
    flexDirection: 'row',
    paddingRight: spacing.sm,
  },
  input: {
    ...typography.emphasis,
    color: colors.ink,
    flex: 1,
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dictationButton: {
    alignItems: 'center',
    borderRadius: radii.field,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  dictationButtonPressed: {
    backgroundColor: colors.brandSoft,
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: colors.brandSoft,
    borderRadius: radii.field,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  searchButtonPressed: {
    backgroundColor: colors.border,
  },
  searchLabel: {
    ...typography.emphasis,
    color: colors.brandInk,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  result: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.field,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: MINIMUM_TOUCH_TARGET + 12,
    padding: spacing.md,
  },
  resultCopy: {
    flex: 1,
    gap: 2,
  },
  resultDescription: {
    ...typography.meta,
    color: colors.inkMuted,
  },
  resultName: {
    ...typography.emphasis,
    color: colors.ink,
  },
  resultPressed: {
    backgroundColor: colors.brandSoft,
  },
  resultSelected: {
    borderColor: colors.brandInk,
    borderWidth: 2,
  },
  results: {
    gap: spacing.sm,
  },
  selection: {
    alignItems: 'flex-start',
    borderColor: colors.border,
    borderRadius: radii.field,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  selectionCopy: {
    flex: 1,
    gap: 2,
  },
  selectionDescription: {
    ...typography.meta,
    color: colors.inkMuted,
  },
  selectionLabel: {
    ...typography.meta,
    color: colors.inkMuted,
  },
  selectionName: {
    ...typography.emphasis,
    color: colors.ink,
  },
  status: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusText: {
    ...typography.body,
    color: colors.inkMuted,
    flex: 1,
  },
});
