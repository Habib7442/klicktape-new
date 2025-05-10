import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';

interface ThemeAwareTextProps extends TextProps {
  lightStyle?: TextStyle;
  darkStyle?: TextStyle;
  children: React.ReactNode;
}

/**
 * A Text component that automatically applies different styles based on the current theme
 * 
 * @param props.lightStyle - Styles to apply in light mode
 * @param props.darkStyle - Styles to apply in dark mode
 * @param props.style - Base styles that apply in both modes
 */
export const ThemeAwareText: React.FC<ThemeAwareTextProps> = ({
  lightStyle,
  darkStyle,
  style,
  children,
  ...props
}) => {
  const { isDarkMode, colors } = useTheme();
  
  // Default text color based on theme
  const defaultStyle: TextStyle = {
    color: colors.text
  };
  
  // Combine base style with theme-specific style
  const themeStyle = isDarkMode ? darkStyle : lightStyle;
  const combinedStyle = StyleSheet.compose(
    StyleSheet.compose(defaultStyle, style),
    themeStyle
  );
  
  return (
    <Text style={combinedStyle} {...props}>
      {children}
    </Text>
  );
};

export default ThemeAwareText;
