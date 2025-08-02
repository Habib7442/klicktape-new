
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import CachedImage from '@/components/CachedImage';

interface AppUser {
  id: string;
  username: string;
  avatar_url: string;
}

const ChatHeader: React.FC<{
  recipientProfile?: AppUser;
  isLoading: boolean;
  onBackPress: () => void;
  onClearChat?: () => void;
}> = ({ recipientProfile, isLoading, onBackPress, onClearChat }) => {
  const { colors, isDarkMode } = useTheme();

  const handleClearChat = () => {
    Alert.alert(
      'Clear Chat',
      'This will:\n• Delete all messages you sent (permanently)\n• Clear this chat from your interface\n\nThe other person will still see their messages. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: onClearChat,
        },
      ]
    );
  };

  return (
    <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.cardBorder }]}>
      <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
        <Feather name="arrow-left" size={24} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.headerContent}>
        {isLoading ? (
          <View style={styles.headerLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>Loading...</Text>
          </View>
        ) : recipientProfile ? (
          <View style={styles.headerInfo}>
            <CachedImage
              uri={recipientProfile.avatar_url || ''}
              style={[styles.headerAvatar, { borderColor: colors.cardBorder }]}
            />
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                {recipientProfile.username}
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Active now
              </Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.headerTitle, { color: colors.text }]}>Chat</Text>
        )}
      </View>

      <View style={styles.headerActions}>
        {onClearChat && (
          <TouchableOpacity
            onPress={handleClearChat}
            style={[styles.actionButton, {
              backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
              borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)'
            }]}
          >
            <Feather name="trash-2" size={20} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    marginLeft: 8,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginLeft: 8,
  },
});

export default ChatHeader;
