import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';

interface TypingIndicatorProps {
  isVisible: boolean;
  username?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  isVisible,
  username = 'Someone',
}) => {
  const { colors } = useTheme();

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.bubble, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.typingText, { color: colors.textSecondary }]} className="font-rubik-regular">
          {username} is typing...
        </Text>
      </View>
    </View>
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
    paddingVertical: 6,
    borderRadius: 12,
  },
  typingText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});

export default TypingIndicator;
