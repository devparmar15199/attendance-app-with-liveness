import {
  MD3LightTheme,
  MD3DarkTheme,
  configureFonts,
} from 'react-native-paper';
import {
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native';
import { Font } from 'react-native-paper/lib/typescript/types';

// Your original light color palette
const lightColors = {
  primary: '#0061a4',
  onPrimary: '#ffffff',
  primaryContainer: '#d1e4ff',
  onPrimaryContainer: '#001d36',
  secondary: '#535f70',
  onSecondary: '#ffffff',
  secondaryContainer: '#d7e3f8',
  onSecondaryContainer: '#101c2b',
  tertiary: '#6b5778',
  onTertiary: '#ffffff',
  tertiaryContainer: '#f3daff',
  onTertiaryContainer: '#251431',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#410002',
  // --- UPDATED ---
  background: '#f4f7fa', // Was #fdfcff (Now the subtle "off-white" background)
  onBackground: '#1a1c1e',
  surface: '#fdfcff', // Was #fdfcff (Cards will be pure white)
  // --- END UPDATE ---
  onSurface: '#1a1c1e',
  surfaceVariant: '#dfe3eb',
  onSurfaceVariant: '#43474e',
  outline: '#73777f',
  outlineVariant: '#c3c7cf',
  shadow: '#000000',
  scrim: '#000000',
  inverseSurface: '#2f3033',
  inverseOnSurface: '#f1f0f4',
  inversePrimary: '#9ecaff',
  elevation: {
    level0: 'transparent',
    level1: '#f4f7fa', // This is now our background
    level2: '#f0f4f9', // Perfect for tab bar
    level3: '#ebf1f8',
    level4: '#e9f0f7',
    level5: '#e5eef6',
  },
  surfaceDisabled: 'rgba(26, 28, 30, 0.12)',
  onSurfaceDisabled: 'rgba(26, 28, 30, 0.38)',
  backdrop: 'rgba(45, 48, 51, 0.4)',
};

// A matching dark color palette
const darkColors = {
  primary: '#9ecaff',
  onPrimary: '#003258',
  primaryContainer: '#00497d',
  onPrimaryContainer: '#d1e4ff',
  secondary: '#bbc7db',
  onSecondary: '#253140',
  secondaryContainer: '#3c4858',
  onSecondaryContainer: '#d7e3f8',
  tertiary: '#d7bde4',
  onTertiary: '#3b2948',
  tertiaryContainer: '#52405f',
  onTertiaryContainer: '#f3daff',
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',
  // --- UPDATED ---
  background: '#1a1c1e', // Was #1a1c1e (Stays the darkest color)
  onBackground: '#e3e2e6',
  surface: '#22262c', // Was #1a1c1e (Now elevation.level1, so cards are slightly lighter)
  // --- END UPDATE ---
  onSurface: '#e3e2e6',
  surfaceVariant: '#43474e',
  onSurfaceVariant: '#c3c7cf',
  outline: '#8d9199',
  outlineVariant: '#43474e',
  shadow: '#000000',
  scrim: '#000000',
  inverseSurface: '#e3e2e6',
  inverseOnSurface: '#2f3033',
  inversePrimary: '#0061a4',
  elevation: {
    level0: 'transparent',
    level1: '#22262c', // This is now our surface
    level2: '#272d33', // Perfect for tab bar
    level3: '#2c333a',
    level4: '#2e353c',
    level5: '#313840',
  },
  surfaceDisabled: 'rgba(227, 226, 230, 0.12)',
  onSurfaceDisabled: 'rgba(227, 226, 230, 0.38)',
  backdrop: 'rgba(47, 48, 51, 0.4)',
};

// Font configuration
const fontConfig: Record<string, Font> = {
  // ...default font configurations
};

// --- EXPORT THEMES ---

// React Native Paper Themes
export const AppLightTheme = {
  ...MD3LightTheme,
  colors: lightColors,
  roundness: 8,
  // fonts: configureFonts({ config: fontConfig }),
};

export const AppDarkTheme = {
  ...MD3DarkTheme,
  colors: darkColors,
  roundness: 8,
  // fonts: configureFonts({ config: fontConfig }),
};

// React Navigation Themes
// These must align with the Paper themes
export const AppNavigationLightTheme = {
  ...NavigationDefaultTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    primary: lightColors.primary,
    // --- UPDATED ---
    background: lightColors.background, // Use new 'off-white' background
    card: lightColors.surface, // Use new 'pure white' surface for headers
    // --- END UPDATE ---
    text: lightColors.onSurface,
    border: lightColors.outlineVariant,
    notification: lightColors.error,
  },
};

export const AppNavigationDarkTheme = {
  ...NavigationDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    primary: darkColors.primary,
    // --- UPDATED ---
    background: darkColors.background, // Use new 'pure black' background
    card: darkColors.surface, // Use new 'off-black' surface for headers
    // --- END UPDATE ---
    text: darkColors.onSurface,
    border: darkColors.outlineVariant,
    notification: darkColors.error,
  },
};