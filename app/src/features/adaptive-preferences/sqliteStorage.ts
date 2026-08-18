import SQLiteStorage from 'expo-sqlite/kv-store';

import type { PreferenceStorage } from '@/features/adaptive-preferences/storage';

export const sqlitePreferenceStorage: PreferenceStorage = {
  getItem: (key) => SQLiteStorage.getItem(key),
  removeItem: (key) => SQLiteStorage.removeItem(key),
  setItem: (key, value) => SQLiteStorage.setItem(key, value),
};
