import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';

interface DateHeaderProps {
  dateLabel: string;
}

const DateHeader: React.FC<DateHeaderProps> = ({ dateLabel }) => {
  const { colors, isDarkMode } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.dateContainer, {
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
      }]}>
        <Text style={[styles.dateText, { 
          color: colors.textSecondary 
        }]}>
          {dateLabel}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default DateHeader;
