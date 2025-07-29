import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useChatUserProfile } from '@/lib/query/hooks/useChatQuery';
import CustomChatContainer from '@/components/chat/CustomChatContainer';
import ChatHeader from './ChatHeader';
import { ActivityIndicator, Text, View, TouchableOpacity, StyleSheet } from 'react-native';

interface AppUser {
  id: string;
  username: string;
  avatar_url: string;
}

const ChatScreenContent = () => {
  const { id: recipientId } = useLocalSearchParams();
  const recipientIdString = Array.isArray(recipientId) ? recipientId[0] : recipientId;
  const [userId, setUserId] = useState<string | null>(null);
  const { colors } = useTheme();

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };

    getCurrentUser();
  }, []);

  // Get recipient profile data
  const { data: recipientData, isLoading: profileLoading, error: profileError } = useChatUserProfile(recipientIdString || '');

  // Handle back navigation
  const handleBackPress = () => {
    router.back();
  };

  // Create user profiles object for CustomChat
  const userProfiles: Record<string, AppUser> = {};
  if (userId) {
    userProfiles[userId] = {
      id: userId,
      username: 'You',
      avatar_url: '',
    };
  }
  if (recipientData) {
    userProfiles[recipientData.id] = {
      id: recipientData.id,
      username: recipientData.username || 'User',
      avatar_url: recipientData.avatar_url || '',
    };
  }

  // Show loading state
  if (profileLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ChatHeader
          recipientProfile={undefined}
          isLoading={true}
          onBackPress={handleBackPress}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading chat...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (profileError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ChatHeader
          recipientProfile={undefined}
          isLoading={false}
          onBackPress={handleBackPress}
        />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Failed to load chat
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => window.location.reload()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main chat interface
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ChatHeader
        recipientProfile={recipientData ? {
          id: recipientData.id,
          username: recipientData.username || 'User',
          avatar_url: recipientData.avatar_url || ''
        } : undefined}
        isLoading={false}
        onBackPress={handleBackPress}
      />

      {userId && recipientIdString && (
        <CustomChatContainer
          userId={userId}
          recipientId={recipientIdString}
          userProfiles={userProfiles}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatScreenContent;