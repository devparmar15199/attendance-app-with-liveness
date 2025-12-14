import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthStore } from './src/store/useAuthStore';
import { useThemeStore } from './src/store/useThemeStore';
import { Navigation } from './src/navigation/Navigation';

import ErrorBoundary from './src/components/ErrorBoundary';
import FullScreenLoader from './src/components/FullScreenLoader';
import {
  AppLightTheme,
  AppDarkTheme,
  AppNavigationLightTheme,
  AppNavigationDarkTheme,
} from './src/styles/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60, // Data is fresh for 1 minute
      gcTime: 1000 * 60 * 5, // Cache is kept for 5 minutes
      refetchOnWindowFocus: false, // Prevents refetching when switching apps
      refetchOnReconnect: true,
    },
  },
});

export default function App() {
  // Get auth state and actions from Zustand
  const isLoading = useAuthStore((state) => state.isLoading);
  const checkAuthState = useAuthStore((state) => state.checkAuthState);

  // Check for saved session on app load
  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);

  // Theme Selection
  const systemColorScheme = useColorScheme();
  const appTheme = useThemeStore((state) => state.theme);
  
  let isDarkMode: boolean;
  if (appTheme === 'system') {
    isDarkMode = systemColorScheme === 'dark';
  } else {
    isDarkMode = appTheme === 'dark';
  }

  const paperTheme = isDarkMode ? AppDarkTheme : AppLightTheme;
  const navigationTheme = isDarkMode
    ? AppNavigationDarkTheme
    : AppNavigationLightTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <PaperProvider theme={paperTheme}>
            <ErrorBoundary>
              <NavigationContainer theme={navigationTheme}>
                {isLoading ? <FullScreenLoader /> : <Navigation />}
                <StatusBar style={isDarkMode ? 'light' : 'dark'} />
              </NavigationContainer>
            </ErrorBoundary>
          </PaperProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}