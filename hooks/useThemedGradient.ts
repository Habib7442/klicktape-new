import { useTheme } from '@/src/context/ThemeContext';

/**
 * A hook that provides themed solid colors instead of gradients
 *
 * @returns An object with solid background color for light and dark themes
 */
export function useThemedGradient() {
  const { isDarkMode } = useTheme();

  // Define solid colors based on theme
  const backgroundColor = isDarkMode ? "#000000" : "#FFFFFF";

  return {
    backgroundColor,
    gradientColors: [backgroundColor, backgroundColor] as const, // For backward compatibility
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 }
  };
}

export default useThemedGradient;
