import React, { useRef } from 'react';
import { View, Animated } from 'react-native';
import { LongPressGestureHandler, State } from 'react-native-gesture-handler';
import { useDispatch } from 'react-redux';
import { selectMessageForReaction } from '@/src/store/slices/chatUISlice';

interface LongPressableMessageProps {
  children: React.ReactNode;
  onLongPress?: (event: any) => void;
  enabled?: boolean;
  messageId: string;
}

const LongPressableMessage: React.FC<LongPressableMessageProps> = ({
  children,
  onLongPress,
  enabled = true,
  messageId,
}) => {
  const dispatch = useDispatch();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const viewRef = useRef<View>(null);

  const measureMessage = () => {
    if (viewRef.current) {
      viewRef.current.measure((x, y, width, height, pageX, pageY) => {
        dispatch(selectMessageForReaction({
          messageId,
          position: { x: pageX, y: pageY, width, height }
        }));
      });
    }
  };

  const onHandlerStateChange = (event: any) => {
    if (!enabled) return;

    const { state } = event.nativeEvent;

    switch (state) {
      case State.BEGAN:
        // Start scale animation when long press begins
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }).start();
        break;

      case State.ACTIVE:
        // Long press activated - measure and trigger Redux action
        measureMessage();
        // Also trigger legacy callback if provided
        if (onLongPress) {
          onLongPress(event);
        }
        break;

      case State.END:
      case State.CANCELLED:
      case State.FAILED:
        // Reset scale when long press ends
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }).start();
        break;
    }
  };

  if (!enabled) {
    return <View ref={viewRef}>{children}</View>;
  }

  return (
    <LongPressGestureHandler
      onHandlerStateChange={onHandlerStateChange}
      minDurationMs={300} // Faster long press for WhatsApp feel
    >
      <Animated.View
        ref={viewRef}
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
        {children}
      </Animated.View>
    </LongPressGestureHandler>
  );
};

export default LongPressableMessage;
