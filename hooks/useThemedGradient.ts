import { useTheme } from '@/src/context/ThemeContext';

/**
 * A hook that provides themed gradient colors for LinearGradient
 *
 * @returns An object with gradient colors for light and dark themes
 */
export function useThemedGradient() {
  const { isDarkMode } = useTheme();

  // Define gradient colors based on theme
  const gradientColors = isDarkMode
    ? ["#000000", "#1a1a1a", "#2a2a2a"] as const
    : ["#F8F9FA", "#F0F2F5", "#E9ECEF"] as const;

  return {
    gradientColors,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 }
  };
}

export default useThemedGradient;
