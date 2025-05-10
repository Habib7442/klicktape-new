import React from 'react';
import { View, ViewProps, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';

interface ThemeAwareViewProps extends ViewProps {
  lightStyle?: ViewStyle;
  darkStyle?: ViewStyle;
  children: React.ReactNode;
}

/**
 * A View component that automatically applies different styles based on the current theme
 * 
 * @param props.lightStyle - Styles to apply in light mode
 * @param props.darkStyle - Styles to apply in dark mode
 * @param props.style - Base styles that apply in both modes
 */
export const ThemeAwareView: React.FC<ThemeAwareViewProps> = ({
  lightStyle,
  darkStyle,
  style,
  children,
  ...props
}) => {
  const { isDarkMode } = useTheme();
  
  // Combine base style with theme-specific style
  const themeStyle = isDarkMode ? darkStyle : lightStyle;
  const combinedStyle = StyleSheet.compose(style, themeStyle);
  
  return (
    <View style={combinedStyle} {...props}>
      {children}
    </View>
  );
};

export default ThemeAwareView;
