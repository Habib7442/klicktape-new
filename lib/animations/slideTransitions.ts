import { Platform } from 'react-native';
import {
  StackCardInterpolationProps,
  StackCardInterpolatedStyle
} from '@react-navigation/stack';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

// Theme-aware slide animation configuration
export const createSlideFromRightConfig = (isDarkMode: boolean = true) => ({
  headerShown: false,
  animation: 'slide_from_right' as const,
  animationDuration: Platform.select({
    ios: 300,
    android: 280,
  }),
  gestureEnabled: true,
  gestureDirection: 'horizontal' as const,
  
  // Optimized transition specs for 60fps performance
  transitionSpec: {
    open: {
      animation: 'timing' as const,
      config: {
        duration: Platform.select({
          ios: 300,
          android: 280,
        }),
        useNativeDriver: true, // Critical for performance
        easing: Platform.select({
          ios: 'easeOut' as const,
          android: 'fastOutSlowIn' as const,
        }),
      },
    },
    close: {
      animation: 'timing' as const,
      config: {
        duration: Platform.select({
          ios: 250,
          android: 230,
        }),
        useNativeDriver: true, // Critical for performance
        easing: Platform.select({
          ios: 'easeIn' as const,
          android: 'fastOutSlowIn' as const,
        }),
      },
    },
  },

  // Custom interpolator for smooth slide animation with theme-aware background
  cardStyleInterpolator: ({ current, layouts }: StackCardInterpolationProps): StackCardInterpolatedStyle => {
    const { width } = layouts.screen;
    const backgroundColor = isDarkMode ? '#000000' : '#FFFFFF';

    return {
      cardStyle: {
        backgroundColor, // Theme-aware background to prevent white flash
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [width, 0],
              extrapolate: 'clamp',
            }),
          },
        ],
        // Add subtle shadow for depth
        shadowOpacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.1],
          extrapolate: 'clamp',
        }),
        shadowRadius: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 10],
          extrapolate: 'clamp',
        }),
        shadowOffset: {
          width: -5,
          height: 0,
        },
        elevation: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 5],
          extrapolate: 'clamp',
        }),
      },
      overlayStyle: {
        backgroundColor, // Theme-aware overlay background
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.1],
          extrapolate: 'clamp',
        }),
      },
      containerStyle: {
        backgroundColor, // Theme-aware container background
      },
    };
  },

  // Gesture configuration for smooth swipe back
  gestureResponseDistance: {
    horizontal: 50,
    vertical: 135,
  },
  
  // Performance optimizations with theme-aware styling
  cardOverlayEnabled: true,
  cardShadowEnabled: Platform.OS === 'ios',
  cardStyle: {
    backgroundColor: isDarkMode ? '#000000' : '#FFFFFF', // Theme-aware background
  },
  // Ensure the screen container also has proper background
  sceneContainerStyle: {
    backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
  },
});

// Native Stack compatible configuration for Expo Router
export const createNativeStackSlideConfig = (isDarkMode: boolean = true): NativeStackNavigationOptions => ({
  headerShown: false,
  animation: 'slide_from_right',
  animationDuration: Platform.select({
    ios: 300,
    android: 280,
  }),
  gestureEnabled: true,
  gestureDirection: 'horizontal',
  contentStyle: {
    backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
  },
});

// Create theme-aware configurations
export const createThemeAwareSlideConfig = (isDarkMode: boolean) => createNativeStackSlideConfig(isDarkMode);

// Default configurations (will be updated by layout)
export const slideFromRightConfig = createSlideFromRightConfig(true); // Default to dark
export const slideFromRightConfigLight = createSlideFromRightConfig(false);

// Alternative faster configuration for lower-end devices
export const fastSlideFromRightConfig = {
  headerShown: false,
  animation: 'slide_from_right' as const,
  animationDuration: 200,
  gestureEnabled: true,
  gestureDirection: 'horizontal' as const,
  
  transitionSpec: {
    open: {
      animation: 'timing' as const,
      config: {
        duration: 200,
        useNativeDriver: true,
        easing: 'easeOut' as const,
      },
    },
    close: {
      animation: 'timing' as const,
      config: {
        duration: 150,
        useNativeDriver: true,
        easing: 'easeIn' as const,
      },
    },
  },
};
