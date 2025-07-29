import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

interface MessagePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MessageOverlayProps {
  visible: boolean;
  messagePosition: MessagePosition | null;
  messageId: string | null;
}

const MessageOverlay: React.FC<MessageOverlayProps> = ({
  visible,
  messagePosition,
  messageId,
}) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible && messagePosition) {
      // Super fast highlight animation
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 100, // Very fast
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 300,
          friction: 10,
        }),
      ]).start();
    } else {
      // Fast fade out
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, messagePosition]);

  if (!visible || !messagePosition) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          left: messagePosition.x - 4, // Slight padding around message
          top: messagePosition.y - 4,
          width: messagePosition.width + 8,
          height: messagePosition.height + 8,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Highlight background */}
      <View style={styles.highlight} />
      
      {/* Subtle border */}
      <View style={styles.border} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    zIndex: 998, // Below emoji picker but above messages
    borderRadius: 20,
  },
  highlight: {
    flex: 1,
    backgroundColor: 'rgba(37, 211, 102, 0.15)', // WhatsApp green with low opacity
    borderRadius: 20,
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.3)', // WhatsApp green border
  },
});

export default MessageOverlay;
