import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';

/**
 * A hook that creates styles based on the current theme
 * 
 * @param styleCreator - A function that takes theme colors and returns a StyleSheet
 * @returns The created styles
 * 
 * @example
 * const styles = useThemedStyles((colors) => ({
 *   container: {
 *     backgroundColor: colors.background,
 *   },
 *   text: {
 *     color: colors.text,
 *   },
 * }));
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  styleCreator: (colors: ReturnType<typeof useTheme>['colors']) => T
): T {
  const { colors } = useTheme();
  
  // Memoize the styles to prevent unnecessary re-renders
  return useMemo(() => StyleSheet.create(styleCreator(colors)), [colors, styleCreator]);
}

export default useThemedStyles;
