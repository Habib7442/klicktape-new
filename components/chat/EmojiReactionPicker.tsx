import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';

interface EmojiReactionPickerProps {
  visible: boolean;
  position: { x: number; y: number };
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
  currentReaction?: string;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const EmojiReactionPicker: React.FC<EmojiReactionPickerProps> = ({
  visible,
  position,
  onEmojiSelect,
  onClose,
  currentReaction,
}) => {
  const { colors, isDarkMode } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const screenWidth = Dimensions.get('window').width;
  const pickerWidth = COMMON_EMOJIS.length * 50 + 20; // 50px per emoji + padding
  
  // Adjust position to keep picker on screen
  let adjustedX = position.x - pickerWidth / 2;
  if (adjustedX < 10) adjustedX = 10;
  if (adjustedX + pickerWidth > screenWidth - 10) {
    adjustedX = screenWidth - pickerWidth - 10;
  }

  return (
    <>
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      
      {/* Picker */}
      <Animated.View
        style={[
          styles.picker,
          {
            backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF',
            borderColor: isDarkMode ? '#3C3C3E' : '#E5E5E7',
            left: adjustedX,
            top: position.y - 70, // Position above the message
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Arrow pointing down */}
        <View
          style={[
            styles.arrow,
            {
              backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF',
              borderColor: isDarkMode ? '#3C3C3E' : '#E5E5E7',
              left: pickerWidth / 2 - 8,
            },
          ]}
        />
        
        <View style={styles.emojiContainer}>
          {COMMON_EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={[
                styles.emojiButton,
                currentReaction === emoji && {
                  backgroundColor: colors.primary + '20',
                  borderColor: colors.primary,
                  borderWidth: 2,
                },
              ]}
              onPress={() => onEmojiSelect(emoji)}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{emoji}</Text>
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
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  arrow: {
    position: 'absolute',
    bottom: -8,
    width: 16,
    height: 16,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  emojiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  emoji: {
    fontSize: 24,
  },
});

export default EmojiReactionPicker;
