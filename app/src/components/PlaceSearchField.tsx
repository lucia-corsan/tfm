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
import { ES } from '../../i18n/es';

export type SearchPlacesFunction = (query: string) => Promise<PlaceSearchResponse>;

interface PlaceSearchFieldProps {
  field: 'destination' | 'origin';
  onSelect: (place: PlaceResult) => void;
  search?: SearchPlacesFunction;
  selectedPlace: PlaceResult;
}

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'results'; places: PlaceResult[] }
  | { status: 'empty' | 'error' | 'invalid' };

export function PlaceSearchField({
  field,
  onSelect,
  search = searchPlaces,
  selectedPlace,
}: PlaceSearchFieldProps) {
  const copy = ES.routeComparison.placeSearch[field];
  const [query, setQuery] = useState(selectedPlace.name);
  const [state, setState] = useState<SearchState>({ status: 'idle' });
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
      <AccessibleText accessibilityRole="header" style={styles.label}>
        {copy.label}
      </AccessibleText>
      <TextInput
        accessibilityHint={copy.inputHint}
        accessibilityLanguage="es-ES"
        accessibilityLabel={copy.inputLabel}
        autoCapitalize="words"
        autoCorrect={false}
        onChangeText={updateQuery}
        onSubmitEditing={() => void runSearch()}
        returnKeyType="search"
        style={styles.input}
        value={query}
      />
      <Pressable
        accessibilityHint={copy.searchHint}
        accessibilityLanguage="es-ES"
        accessibilityLabel={copy.searchButton}
        accessibilityRole="button"
        accessibilityState={{ disabled: state.status === 'loading' }}
        disabled={state.status === 'loading'}
        onPress={() => void runSearch()}
        style={({ pressed }) => [
          styles.searchButton,
          pressed && styles.searchButtonPressed,
        ]}
      >
        <Text style={styles.searchButtonText}>{copy.searchButton}</Text>
      </Pressable>

      <View
        accessible
        accessibilityLanguage="es-ES"
        accessibilityRole="text"
        style={styles.selection}
      >
        <Text style={styles.selectionLabel}>
          {ES.routeComparison.placeSearch.selectedLabel}
        </Text>
        <Text style={styles.selectionName}>{selectedPlace.name}</Text>
        <Text style={styles.selectionDescription}>{selectedPlace.description}</Text>
      </View>

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
          <ActivityIndicator color="#5B3FC4" />
          <Text style={styles.statusText}>{ES.routeComparison.placeSearch.loading}</Text>
        </View>
      )}

      {state.status === 'invalid' && (
        <AccessibleText accessibilityLiveRegion="polite" style={styles.message}>
          {ES.routeComparison.placeSearch.minimumCharacters}
        </AccessibleText>
      )}
      {state.status === 'empty' && (
        <AccessibleText accessibilityLiveRegion="polite" style={styles.message}>
          {ES.routeComparison.placeSearch.noResults}
        </AccessibleText>
      )}
      {state.status === 'error' && (
        <AccessibleText accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
          {ES.routeComparison.placeSearch.error}
        </AccessibleText>
      )}

      {state.status === 'results' && (
        <View style={styles.results}>
          <AccessibleText accessibilityRole="header" style={styles.resultsTitle}>
            {copy.resultsTitle}
          </AccessibleText>
          {state.places.map((place) => (
            <Pressable
              accessibilityHint={copy.resultHint}
              accessibilityLanguage="es-ES"
              accessibilityLabel={`${place.name}. ${place.description}`}
              accessibilityRole="button"
              accessibilityState={{ selected: place.place_id === selectedPlace.place_id }}
              key={place.place_id}
              onPress={() => selectResult(place)}
              style={({ pressed }) => [
                styles.result,
                place.place_id === selectedPlace.place_id && styles.resultSelected,
                pressed && styles.resultPressed,
              ]}
            >
              <Text style={styles.resultName}>{place.name}</Text>
              <Text style={styles.resultDescription}>{place.description}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D6D0E6',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  error: {
    color: '#7A2525',
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#6B6680',
    borderRadius: 12,
    borderWidth: 1,
    color: '#17213A',
    fontSize: 17,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  label: {
    color: '#17213A',
    fontSize: 18,
    fontWeight: '800',
  },
  message: {
    color: '#4B5265',
    fontSize: 14,
    lineHeight: 20,
  },
  result: {
    backgroundColor: '#FAF9FD',
    borderColor: '#D6D0E6',
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
    minHeight: 58,
    padding: 12,
  },
  resultDescription: {
    color: '#4B5265',
    fontSize: 14,
    lineHeight: 20,
  },
  resultName: {
    color: '#17213A',
    fontSize: 16,
    fontWeight: '700',
  },
  resultPressed: {
    backgroundColor: '#ECE8FA',
  },
  resultSelected: {
    borderColor: '#6C4BC3',
    borderWidth: 2,
  },
  results: {
    gap: 8,
  },
  resultsTitle: {
    color: '#30364A',
    fontSize: 15,
    fontWeight: '700',
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: '#ECE8FA',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchButtonPressed: {
    backgroundColor: '#DCD4F5',
  },
  searchButtonText: {
    color: '#432B9B',
    fontSize: 16,
    fontWeight: '700',
  },
  selection: {
    backgroundColor: '#F3F0FC',
    borderRadius: 12,
    gap: 3,
    padding: 12,
  },
  selectionDescription: {
    color: '#4B5265',
    fontSize: 14,
    lineHeight: 20,
  },
  selectionLabel: {
    color: '#5B3FC4',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  selectionName: {
    color: '#17213A',
    fontSize: 16,
    fontWeight: '700',
  },
  status: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  statusText: {
    color: '#4B5265',
    fontSize: 14,
  },
});
