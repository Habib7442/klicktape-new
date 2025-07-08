import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define theme types
export type ThemeType = 'light' | 'dark' | 'system';

// Define theme colors for light and dark modes
export const lightTheme = {
  // Background colors
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  backgroundTertiary: '#E0E0E0',

  // Text colors
  text: '#000000',
  textSecondary: '#000000',
  textTertiary: '#666666',

  // Brand colors
  primary: '#FFD700', // Keep gold for primary actions
  primaryDark: '#E6C200',
  primaryLight: '#FFF0AA',

  // UI element colors
  card: '#F5F5F5', // Gray card background
  cardBorder: 'rgba(128, 128, 128, 0.2)', // Gray border
  divider: 'rgba(0, 0, 0, 0.1)',
  input: '#F5F5F5',
  inputBorder: 'rgba(128, 128, 128, 0.3)',

  // Status colors
  success: '#4CAF50',
  error: '#FF6B6B',
  warning: '#FFC107',
  info: '#2196F3',

  // Overlay colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  modalBackground: '#F5F5F5',
};

export const darkTheme = {
  // Background colors
  background: '#000000',
  backgroundSecondary: '#2A2A2A',
  backgroundTertiary: '#404040',

  // Text colors
  text: '#FFFFFF',
  textSecondary: '#FFFFFF',
  textTertiary: '#CCCCCC',

  // Brand colors
  primary: '#FFD700', // Gold
  primaryDark: '#E6C200',
  primaryLight: '#FFF0AA',

  // UI element colors
  card: '#2A2A2A', // Gray card background
  cardBorder: 'rgba(128, 128, 128, 0.2)', // Gray border
  divider: 'rgba(255, 255, 255, 0.1)',
  input: '#404040',
  inputBorder: 'rgba(128, 128, 128, 0.3)',

  // Status colors
  success: '#4CAF50',
  error: '#FF6B6B',
  warning: '#FFC107',
  info: '#2196F3',

  // Overlay colors
  overlay: 'rgba(0, 0, 0, 0.7)',
  modalBackground: '#2A2A2A',
};

// Define the context type
interface ThemeContextType {
  theme: ThemeType;
  colors: typeof lightTheme | typeof darkTheme;
  setTheme: (theme: ThemeType) => void;
  isDarkMode: boolean;
}

// Create the context with a default value
const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  colors: darkTheme,
  setTheme: () => {},
  isDarkMode: true,
});

// Storage key for theme preference
const THEME_STORAGE_KEY = 'klicktape_theme_preference';

// Theme provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get system color scheme
  const systemColorScheme = useColorScheme() || 'dark';

  // State for the current theme (default to dark)
  const [theme, setThemeState] = useState<ThemeType>('dark');

  // Determine if dark mode is active
  const isDarkMode = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');

  // Get the current theme colors
  const colors = isDarkMode ? darkTheme : lightTheme;

  // Load saved theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme) {
          setThemeState(savedTheme as ThemeType);
        } else {
          // If no saved theme, set to dark and save it
          await AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };

    loadTheme();
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    // This will re-render the component when system theme changes
    // which will update isDarkMode and colors
    console.log('System color scheme changed:', systemColorScheme);
  }, [systemColorScheme]);

  // Function to set theme and save preference
  const setTheme = async (newTheme: ThemeType) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme, isDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);
