import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';

interface ThemedGradientProps {
  style?: ViewStyle;
  children: React.ReactNode;
}

/**
 * A View component that automatically uses theme-appropriate solid background colors
 *
 * @param props.style - Style to apply to the view
 * @param props.children - Child components
 */
export const ThemedGradient: React.FC<ThemedGradientProps> = ({
  style,
  children,
}) => {
  const { isDarkMode } = useTheme();

  return (
    <View
      style={[
        { backgroundColor: isDarkMode ? '#000000' : '#FFFFFF' },
        style
      ]}
    >
      {children}
    </View>
  );
};

export default ThemedGradient;
