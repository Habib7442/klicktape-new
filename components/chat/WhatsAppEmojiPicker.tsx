import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { BlurView } from 'expo-blur';

interface MessagePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WhatsAppEmojiPickerProps {
  visible: boolean;
  messagePosition: MessagePosition | null;
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
  currentReaction?: string;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];
const EMOJI_SIZE = 44;
const PICKER_PADDING = 8;
const PICKER_HEIGHT = EMOJI_SIZE + (PICKER_PADDING * 2);

const WhatsAppEmojiPicker: React.FC<WhatsAppEmojiPickerProps> = ({
  visible,
  messagePosition,
  onEmojiSelect,
  onClose,
  currentReaction,
}) => {
  const { colors, isDarkMode } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      // Super fast entrance animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 300, // Higher tension for faster animation
          friction: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150, // Faster opacity
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Super fast exit animation
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 100, // Very fast exit
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 20,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible || !messagePosition) return null;

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const pickerWidth = COMMON_EMOJIS.length * EMOJI_SIZE + (PICKER_PADDING * 2);
  
  // Calculate position above the message
  let pickerX = messagePosition.x + (messagePosition.width / 2) - (pickerWidth / 2);
  let pickerY = messagePosition.y - PICKER_HEIGHT - 10; // 10px gap above message
  
  // Keep picker on screen horizontally
  if (pickerX < 10) pickerX = 10;
  if (pickerX + pickerWidth > screenWidth - 10) {
    pickerX = screenWidth - pickerWidth - 10;
  }
  
  // If picker would go above screen, show below message
  if (pickerY < 50) {
    pickerY = messagePosition.y + messagePosition.height + 10;
  }

  const handleEmojiPress = (emoji: string) => {
    // Instant feedback - no delay
    onEmojiSelect(emoji);
  };

  return (
    <>
      {/* Backdrop with blur effect */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.3)' }]} />
        )}
      </TouchableOpacity>
      
      {/* Emoji Picker */}
      <Animated.View
        style={[
          styles.picker,
          {
            backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF',
            left: pickerX,
            top: pickerY,
            opacity: opacityAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim }
            ],
          },
        ]}
      >
        {/* Shadow for iOS */}
        {Platform.OS === 'ios' && (
          <View style={styles.shadow} />
        )}
        
        <View style={styles.emojiContainer}>
          {COMMON_EMOJIS.map((emoji, index) => (
            <TouchableOpacity
              key={emoji}
              style={[
                styles.emojiButton,
                currentReaction === emoji && {
                  backgroundColor: '#25D366', // WhatsApp green
                  transform: [{ scale: 1.1 }],
                },
              ]}
              onPress={() => handleEmojiPress(emoji)}
              activeOpacity={0.7}
            >
              <Animated.Text 
                style={[
                  styles.emoji,
                  currentReaction === emoji && { transform: [{ scale: 1.1 }] }
                ]}
              >
                {emoji}
              </Animated.Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  picker: {
    position: 'absolute',
    borderRadius: 25,
    paddingHorizontal: PICKER_PADDING,
    paddingVertical: PICKER_PADDING,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  shadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  emojiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emojiButton: {
    width: EMOJI_SIZE,
    height: EMOJI_SIZE,
    borderRadius: EMOJI_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  emoji: {
    fontSize: 24,
    textAlign: 'center',
  },
});

export default WhatsAppEmojiPicker;
