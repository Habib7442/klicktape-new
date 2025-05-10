import React from 'react';
import { ViewStyle } from 'react-native';
import { LinearGradient, LinearGradientProps } from 'expo-linear-gradient';
import { useThemedGradient } from '@/hooks/useThemedGradient';

interface ThemedGradientProps extends Omit<LinearGradientProps, 'colors'> {
  style?: ViewStyle;
  children: React.ReactNode;
  customColors?: readonly string[];
}

/**
 * A LinearGradient component that automatically uses theme-appropriate colors
 * 
 * @param props.customColors - Optional custom colors to override the theme colors
 * @param props.style - Style to apply to the gradient
 * @param props.children - Child components
 */
export const ThemedGradient: React.FC<ThemedGradientProps> = ({
  style,
  children,
  customColors,
  ...props
}) => {
  const { gradientColors, start, end } = useThemedGradient();
  
  return (
    <LinearGradient
      colors={customColors || gradientColors}
      start={start}
      end={end}
      style={style}
      {...props}
    >
      {children}
    </LinearGradient>
  );
};

export default ThemedGradient;
