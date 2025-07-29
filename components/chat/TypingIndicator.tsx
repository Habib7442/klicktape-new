import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';

interface TypingIndicatorProps {
  isVisible: boolean;
  username?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  isVisible,
  username = 'Someone',
}) => {
  const { colors, isDarkMode } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      // Fade in the indicator
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Animate the dots
      const animateDots = () => {
        const createDotAnimation = (dot: Animated.Value, delay: number) => {
          return Animated.loop(
            Animated.sequence([
              Animated.delay(delay),
              Animated.timing(dot, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }),
              Animated.timing(dot, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
              }),
            ])
          );
        };

        Animated.parallel([
          createDotAnimation(dot1, 0),
          createDotAnimation(dot2, 200),
          createDotAnimation(dot3, 400),
        ]).start();
      };

      animateDots();
    } else {
      // Fade out the indicator
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Reset dots
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const bubbleStyle = {
    ...styles.bubble,
    backgroundColor: isDarkMode ? "#2A2A2A" : "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  };

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={bubbleStyle}>
        <Text style={[styles.typingText, { color: colors.textSecondary }]} className="font-rubik-regular">
          {username} is typing
        </Text>
        <View style={styles.dotsContainer}>
          <Animated.View
            style={[
              styles.dot,
              { 
                backgroundColor: colors.textSecondary,
                opacity: dot1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1],
                }),
                transform: [{
                  scale: dot1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.2],
                  }),
                }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              { 
                backgroundColor: colors.textSecondary,
                opacity: dot2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1],
                }),
                transform: [{
                  scale: dot2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.2],
                  }),
                }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              { 
                backgroundColor: colors.textSecondary,
                opacity: dot3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1],
                }),
                transform: [{
                  scale: dot3.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.2],
                  }),
                }],
              },
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    fontSize: 14,
    marginRight: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
});

export default TypingIndicator;
