import React, { useRef } from 'react';
import { View, Animated } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';

interface SwipeableMessageProps {
  children: React.ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  enabled?: boolean;
  isOwnMessage: boolean; // Determines swipe direction
}

const SwipeableMessage: React.FC<SwipeableMessageProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
  isOwnMessage,
}) => {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const replyIconOpacity = useRef(new Animated.Value(0)).current;
  const replyIconScale = useRef(new Animated.Value(0.8)).current;

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (!enabled) return;

    const { state, translationX } = event.nativeEvent;

    if (state === State.ACTIVE) {
      // For own messages: swipe left to reply
      // For other messages: swipe right to reply
      const shouldShowIcon = isOwnMessage ? translationX < -20 : translationX > 20;

      if (shouldShowIcon) {
        // Show reply icon when swiping in correct direction
        const progress = Math.min(Math.abs(translationX) / 80, 1);

        Animated.parallel([
          Animated.timing(replyIconOpacity, {
            toValue: progress,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(replyIconScale, {
            toValue: 0.8 + (progress * 0.2),
            duration: 0,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        // Reset icon if swiping in wrong direction
        Animated.parallel([
          Animated.timing(replyIconOpacity, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(replyIconScale, {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }

    if (state === State.END) {
      // Trigger reply based on message type and swipe direction
      if (isOwnMessage && translationX < -80) {
        // Own message: swipe left to reply
        onSwipeLeft();
      } else if (!isOwnMessage && translationX > 80) {
        // Other's message: swipe right to reply
        onSwipeRight();
      }

      // Reset position and icon
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(replyIconOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(replyIconScale, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  if (!enabled) {
    return <View>{children}</View>;
  }

  return (
    <View style={{ position: 'relative' }}>
      {/* Reply icon background */}
      <Animated.View
        style={{
          position: 'absolute',
          ...(isOwnMessage ? { right: 20 } : { left: 20 }),
          top: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: replyIconOpacity,
          transform: [{ scale: replyIconScale }],
          zIndex: 1,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="return-up-forward" size={18} color="white" />
        </View>
      </Animated.View>

      {/* Swipeable message */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-10, 10]}
        failOffsetY={[-20, 20]}
      >
        <Animated.View
          style={{
            transform: [
              {
                translateX: translateX.interpolate({
                  inputRange: [-200, 0, 200],
                  outputRange: [-100, 0, 100],
                  extrapolate: 'clamp',
                }),
              },
            ],
          }}
        >
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

export default SwipeableMessage;
