/**
 * Theme-aware navigation utilities to prevent white flashes during transitions
 */

import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';

export interface ThemeAwareNavigationConfig {
  isDarkMode: boolean;
  backgroundColor: string;
  statusBarStyle: 'light' | 'dark';
}

/**
 * Get theme-aware navigation configuration
 */
export const getThemeAwareConfig = (isDarkMode: boolean): ThemeAwareNavigationConfig => ({
  isDarkMode,
  backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
  statusBarStyle: isDarkMode ? 'light' : 'dark',
});

/**
 * Apply theme-aware status bar configuration
 */
export const applyThemeAwareStatusBar = (isDarkMode: boolean) => {
  const config = getThemeAwareConfig(isDarkMode);
  
  // Set status bar style based on theme
  if (Platform.OS === 'ios') {
    StatusBar.setStatusBarStyle(config.statusBarStyle, true);
  }
  
  return config;
};

/**
 * Get screen options with theme-aware background
 */
export const getThemeAwareScreenOptions = (isDarkMode: boolean) => ({
  headerShown: false,
  contentStyle: {
    backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
  },
  // Ensure the screen container has proper background
  sceneContainerStyle: {
    backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
  },
});

/**
 * Get animation-safe screen options that prevent white flashes
 */
export const getAnimationSafeScreenOptions = (isDarkMode: boolean) => ({
  ...getThemeAwareScreenOptions(isDarkMode),
  // Additional properties to prevent flashes during animations
  cardStyle: {
    backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
  },
  // Ensure overlay has proper background
  cardOverlayEnabled: true,
  cardShadowEnabled: Platform.OS === 'ios',
});

/**
 * Utility to ensure consistent theme-aware backgrounds across all navigation levels
 */
export const navigationThemeUtils = {
  // Get root stack options
  getRootStackOptions: (isDarkMode: boolean) => ({
    screenOptions: {
      contentStyle: {
        backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
      },
    },
  }),
  
  // Get tab navigator options
  getTabNavigatorOptions: (isDarkMode: boolean) => ({
    screenOptions: {
      headerShown: false,
      tabBarStyle: {
        backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
        borderTopColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      },
    },
  }),
  
  // Get stack navigator options for nested stacks
  getNestedStackOptions: (isDarkMode: boolean) => ({
    screenOptions: {
      headerShown: false,
      contentStyle: {
        backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
      },
      cardStyle: {
        backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
      },
    },
  }),
};

export default {
  getThemeAwareConfig,
  applyThemeAwareStatusBar,
  getThemeAwareScreenOptions,
  getAnimationSafeScreenOptions,
  navigationThemeUtils,
};
