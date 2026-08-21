import { render, userEvent } from '@testing-library/react-native';

import type { PlaceResult } from '@/api/types';
import type { PreferenceStorage } from '@/features/adaptive-preferences/storage';
import {
  createSavedPlace,
  loadSavedPlaces,
  loadSavedPlacesOnboardingCompleted,
  saveSavedPlaces,
  saveSavedPlacesOnboardingCompleted,
} from '@/features/saved-places/storage';
import { PlaceQueryScreen } from '@/screens/PlaceQueryScreen';
import { SavedPlacesOnboardingScreen } from '@/screens/SavedPlacesOnboardingScreen';
import { ES } from '../i18n/es';

const PLACE: PlaceResult = {
  description: 'Calle de ejemplo, 10, Madrid',
  location: { latitude: 40.43, longitude: -3.72 },
  name: 'Calle de ejemplo, 10',
  place_id: 'ors-1',
  source: 'ors_geocoder',
};

function memoryStorage(): PreferenceStorage {
  const values = new Map<string, string>();
  return {
    getItem: async (key) => values.get(key) ?? null,
    removeItem: async (key) => {
      values.delete(key);
    },
    setItem: async (key, value) => {
      values.set(key, value);
    },
  };
}

describe('lugares guardados', () => {
  test('guarda y recupera nombre, dirección y coordenadas solo en el almacén local', async () => {
    const storage = memoryStorage();
    const item = createSavedPlace('Casa', PLACE, 'saved-1');

    await saveSavedPlaces(storage, [item]);

    await expect(loadSavedPlaces(storage)).resolves.toEqual([item]);
  });

  test('recuerda localmente que el paso opcional ya se respondió', async () => {
    const storage = memoryStorage();

    await expect(
      loadSavedPlacesOnboardingCompleted(storage),
    ).resolves.toBe(false);
    await saveSavedPlacesOnboardingCompleted(storage);
    await expect(
      loadSavedPlacesOnboardingCompleted(storage),
    ).resolves.toBe(true);
  });

  test('permite elegir un lugar guardado como destino', async () => {
    const onSelect = jest.fn();
    const item = createSavedPlace('Gimnasio', PLACE, 'saved-2');
    const screen = await render(
      <PlaceQueryScreen
        field="destination"
        onNext={jest.fn()}
        onSelect={onSelect}
        savedPlaces={[item]}
        selectedPlace={null}
      />,
    );
    const user = userEvent.setup();

    await user.press(
      screen.getByRole('button', {
        name: `${item.name}: ${item.place.description}`,
      }),
    );

    expect(onSelect).toHaveBeenCalledWith(PLACE);
  });

  test('muestra primero la búsqueda y después los lugares guardados', async () => {
    const item = createSavedPlace('Casa', PLACE, 'saved-order');
    const screen = await render(
      <PlaceQueryScreen
        field="destination"
        onNext={jest.fn()}
        onSelect={jest.fn()}
        savedPlaces={[item]}
        selectedPlace={null}
      />,
    );
    const tree = JSON.stringify(screen.toJSON());
    const searchPosition = tree.indexOf(
      ES.routeComparison.placeSearch.destination.inputLabel,
    );
    const savedPlacesPosition = tree.indexOf(ES.placeQuery.savedPlacesTitle);

    expect(searchPosition).toBeGreaterThanOrEqual(0);
    expect(savedPlacesPosition).toBeGreaterThan(searchPosition);
  });

  test('hace visible la función en origen y destino aunque la lista esté vacía', async () => {
    const onOpenSettings = jest.fn();
    const screen = await render(
      <PlaceQueryScreen
        field="origin"
        onNext={jest.fn()}
        onOpenSettings={onOpenSettings}
        onSelect={jest.fn()}
        savedPlaces={[]}
        selectedPlace={null}
      />,
    );
    const user = userEvent.setup();

    screen.getByRole('header', { name: ES.placeQuery.savedPlacesTitle });
    screen.getByText(ES.placeQuery.savedPlacesEmpty);
    await user.press(
      screen.getByRole('button', {
        name: ES.placeQuery.savedPlacesAddButton,
      }),
    );
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  test('ofrece guardar el primer lugar o continuar sin hacerlo', async () => {
    const screen = await render(
      <SavedPlacesOnboardingScreen
        onAdd={jest.fn()}
        onFinish={jest.fn()}
      />,
    );

    screen.getByRole('header', { name: ES.savedPlaces.onboardingTitle });
    screen.getByRole('button', {
      name: ES.savedPlaces.onboardingAddButton,
    });
    screen.getByRole('button', {
      name: ES.savedPlaces.onboardingSkipButton,
    });
  });
});
