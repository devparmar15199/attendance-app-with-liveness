import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeState = 'light' | 'dark' | 'system';

interface ThemeStore {
  theme: ThemeState;
  setTheme: (theme: ThemeState) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'system', // Default theme
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'app-theme-storage', // Name for the storage key
      storage: createJSONStorage(() => AsyncStorage), // Use AsyncStorage
    },
  ),
);