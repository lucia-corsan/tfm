import { useCallback, useEffect, useRef, useState } from 'react';

import type { PlaceResult } from '@/api/types';
import type { PreferenceStorage } from '@/features/adaptive-preferences/storage';
import {
  createSavedPlace,
  loadSavedPlaces,
  loadSavedPlacesOnboardingCompleted,
  saveSavedPlaces,
  saveSavedPlacesOnboardingCompleted,
  type SavedPlace,
} from '@/features/saved-places/storage';

interface SavedPlacesController {
  add: (name: string, place: PlaceResult) => Promise<void>;
  items: SavedPlace[];
  loaded: boolean;
  onboardingCompleted: boolean;
  completeOnboarding: () => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/** Mantiene la lista local y persiste cada cambio de forma atómica. */
export function useSavedPlaces(
  storage: PreferenceStorage,
): SavedPlacesController {
  const [items, setItems] = useState<SavedPlace[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const itemsRef = useRef<SavedPlace[]>([]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      loadSavedPlaces(storage),
      loadSavedPlacesOnboardingCompleted(storage),
    ]).then(([stored, completed]) => {
      if (active) {
        itemsRef.current = stored;
        setItems(stored);
        setOnboardingCompleted(completed || stored.length > 0);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, [storage]);

  const persist = useCallback(
    async (next: SavedPlace[]) => {
      itemsRef.current = next;
      setItems(next);
      try {
        await saveSavedPlaces(storage, next);
      } catch {
        // Los cambios permanecen disponibles durante la sesión actual.
      }
    },
    [storage],
  );

  const add = useCallback(
    async (name: string, place: PlaceResult) => {
      const item = createSavedPlace(name, place);
      await persist([...itemsRef.current, item]);
      setOnboardingCompleted(true);
      try {
        await saveSavedPlacesOnboardingCompleted(storage);
      } catch {
        // La sesión conserva el estado aunque falle el almacenamiento local.
      }
    },
    [persist, storage],
  );

  const completeOnboarding = useCallback(async () => {
    setOnboardingCompleted(true);
    try {
      await saveSavedPlacesOnboardingCompleted(storage);
    } catch {
      // La sesión conserva el estado aunque falle el almacenamiento local.
    }
  }, [storage]);

  const remove = useCallback(
    async (id: string) => {
      await persist(itemsRef.current.filter((item) => item.id !== id));
    },
    [persist],
  );

  return {
    add,
    completeOnboarding,
    items,
    loaded,
    onboardingCompleted,
    remove,
  };
}
