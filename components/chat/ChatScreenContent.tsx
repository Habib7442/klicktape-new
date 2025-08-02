import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useChatUserProfile, useClearChat } from '@/lib/query/hooks/useChatQuery';
import { useQueryClient } from '@tanstack/react-query';
import CustomChatContainer from '@/components/chat/CustomChatContainer';
import ChatHeader from './ChatHeader';
import { useDispatch } from 'react-redux';
import { messagesAPI } from '@/lib/messagesApi';
import { setUnreadMessageCount } from '@/src/store/slices/messageSlice';
import { ActivityIndicator, Text, View, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Keyboard, Alert } from 'react-native';

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
  const dispatch = useDispatch();
  const clearChatMutation = useClearChat();
  const queryClient = useQueryClient();

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

  // Mark messages as read when chat screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const markMessagesAsReadAndUpdateCount = async () => {
        if (!userId || !recipientIdString) return;

        try {
          console.log('🔍 Chat screen focused, marking messages as read...');

          // Mark all unread messages from this sender as read
          await messagesAPI.markMessagesAsRead(recipientIdString, userId);

          // Update the global unread count
          const newUnreadCount = await messagesAPI.getUnreadMessagesCount(userId);
          console.log(`📊 Updated global unread count: ${newUnreadCount}`);
          dispatch(setUnreadMessageCount(newUnreadCount));

        } catch (error) {
          console.error('❌ Error marking messages as read:', error);
        }
      };

      markMessagesAsReadAndUpdateCount();

      // Dismiss keyboard when entering chat
      Keyboard.dismiss();
    }, [userId, recipientIdString, dispatch])
  );

  // Get recipient profile data
  const { data: recipientData, isLoading: profileLoading, error: profileError } = useChatUserProfile(recipientIdString || '');

  // Handle back navigation
  const handleBackPress = () => {
    router.back();
  };

  // Handle clear chat
  const handleClearChat = async () => {
    if (!recipientIdString || !userId) return;

    try {
      // Immediately clear user's messages from cache for instant UI update
      queryClient.setQueriesData(
        { queryKey: ['messages'] },
        (oldData: any) => {
          if (!oldData) return oldData;

          // Handle infinite query data structure
          if (oldData.pages) {
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                messages: page.messages?.filter((msg: any) =>
                  !(msg.sender_id === userId && msg.receiver_id === recipientIdString)
                ) || []
              }))
            };
          }

          return oldData;
        }
      );

      await clearChatMutation.mutateAsync({ recipientId: recipientIdString });
      Alert.alert('Success', 'Chat cleared successfully!\n• Your sent messages have been deleted\n• This chat interface has been cleared');
    } catch (error) {
      console.error('Failed to clear chat:', error);
      Alert.alert('Error', 'Failed to clear chat. Please try again.');
    }
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
        onClearChat={handleClearChat}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      >
        {userId && recipientIdString && (
          <CustomChatContainer
            userId={userId}
            recipientId={recipientIdString}
            userProfiles={userProfiles}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
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