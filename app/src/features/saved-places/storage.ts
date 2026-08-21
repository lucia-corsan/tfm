import type { PlaceResult } from '@/api/types';
import type { PreferenceStorage } from '@/features/adaptive-preferences/storage';

const STORAGE_KEY = 'saved-places:v1:items';
const ONBOARDING_STORAGE_KEY = 'saved-places:v1:onboarding-completed';
const STORAGE_VERSION = 1;

/** Lugar habitual guardado únicamente en el dispositivo. */
export interface SavedPlace {
  id: string;
  name: string;
  place: PlaceResult;
}

interface PersistedSavedPlaces {
  items: unknown;
  version: number;
}

function isPlaceResult(value: unknown): value is PlaceResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const place = value as Partial<PlaceResult>;
  return (
    typeof place.place_id === 'string' &&
    typeof place.name === 'string' &&
    typeof place.description === 'string' &&
    (place.source === 'pilot_catalog' || place.source === 'ors_geocoder') &&
    typeof place.location === 'object' &&
    place.location !== null &&
    typeof place.location.latitude === 'number' &&
    Number.isFinite(place.location.latitude) &&
    place.location.latitude >= -90 &&
    place.location.latitude <= 90 &&
    typeof place.location.longitude === 'number' &&
    Number.isFinite(place.location.longitude) &&
    place.location.longitude >= -180 &&
    place.location.longitude <= 180
  );
}

function parseSavedPlaces(value: unknown): SavedPlace[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const parsed: SavedPlace[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      continue;
    }
    const candidate = item as Partial<SavedPlace>;
    if (
      typeof candidate.id === 'string' &&
      candidate.id.length > 0 &&
      typeof candidate.name === 'string' &&
      candidate.name.trim().length > 0 &&
      candidate.name.trim().length <= 60 &&
      isPlaceResult(candidate.place)
    ) {
      parsed.push({
        id: candidate.id,
        name: candidate.name.trim(),
        place: candidate.place,
      });
    }
  }
  return parsed;
}

/** Lee los lugares guardados; los registros dañados se omiten. */
export async function loadSavedPlaces(
  storage: PreferenceStorage,
): Promise<SavedPlace[]> {
  try {
    const serialized = await storage.getItem(STORAGE_KEY);
    if (serialized === null) {
      return [];
    }
    const envelope = JSON.parse(serialized) as PersistedSavedPlaces;
    if (envelope.version !== STORAGE_VERSION) {
      return [];
    }
    return parseSavedPlaces(envelope.items);
  } catch {
    return [];
  }
}

/** Guarda la lista completa solo en SQLite local. */
export async function saveSavedPlaces(
  storage: PreferenceStorage,
  items: SavedPlace[],
): Promise<void> {
  const envelope: PersistedSavedPlaces = {
    items,
    version: STORAGE_VERSION,
  };
  await storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
}

/** Indica si la persona ya respondió al paso opcional de lugares habituales. */
export async function loadSavedPlacesOnboardingCompleted(
  storage: PreferenceStorage,
): Promise<boolean> {
  try {
    return (await storage.getItem(ONBOARDING_STORAGE_KEY)) === 'true';
  } catch {
    return false;
  }
}

/** Recuerda localmente que el paso opcional ya se mostró y respondió. */
export async function saveSavedPlacesOnboardingCompleted(
  storage: PreferenceStorage,
): Promise<void> {
  await storage.setItem(ONBOARDING_STORAGE_KEY, 'true');
}

/** Construye un lugar guardado sin modificar el resultado geocodificado. */
export function createSavedPlace(
  name: string,
  place: PlaceResult,
  id: string = `${Date.now()}-${place.place_id}`,
): SavedPlace {
  return { id, name: name.trim(), place };
}
