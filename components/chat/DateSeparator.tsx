import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';

interface DateSeparatorProps {
  date: string;
}

const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  const { colors } = useTheme();

  const formatDate = (dateString: string) => {
    const messageDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time to compare dates only
    const messageDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (messageDateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (messageDateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Yesterday';
    } else {
      // Check if it's within the current week
      const daysDiff = Math.floor((todayOnly.getTime() - messageDateOnly.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff < 7) {
        return messageDate.toLocaleDateString('en-US', { weekday: 'long' });
      } else if (messageDate.getFullYear() === today.getFullYear()) {
        // Same year, show month and day (WhatsApp style)
        return messageDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      } else {
        // Different year, show compact date
        return messageDate.toLocaleDateString('en-US', {
          year: '2-digit',
          month: 'short',
          day: 'numeric'
        });
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.separator, { backgroundColor: colors.border }]} />
      <View style={[styles.dateContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.dateText, { color: colors.textSecondary }]} className="font-rubik-medium">
          {formatDate(date)}
        </Text>
      </View>
      <View style={[styles.separator, { backgroundColor: colors.border }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  separator: {
    flex: 1,
    height: 0.5,
    opacity: 0.2,
  },
  dateContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default DateSeparator;
