/**
 * Debug Comments Screen
 * Use this screen to test and debug comments loading issues
 * Navigate to this screen to run diagnostics
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import CommentsDebugger from '@/components/CommentsDebugger';
import { useTheme } from '@/src/context/ThemeContext';

const DebugCommentsScreen = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CommentsDebugger />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default DebugCommentsScreen;
