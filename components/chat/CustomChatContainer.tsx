import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/src/context/ThemeContext';
import { RootState } from '@/src/store/store';
import { useSocketChat } from '@/hooks/useSocketChat';
import { 
  useChatMessages, 
  useSendMessage, 
  useSendReply,
  useReactionMutation 
} from '@/lib/query/hooks/useChatQuery';
import { queryKeys } from '@/lib/query/queryKeys';
import { 
  selectSelectedMessage,
  clearMessageSelection,
  addOptimisticReaction,
  removeOptimisticReaction 
} from '@/src/store/slices/chatUISlice';

import MessageList from './MessageList';
import MessageInput from './MessageInput';
import EmojiReactionPicker from './EmojiReactionPicker';
import MessageOverlay from './MessageOverlay';
import { chatDebug } from '@/utils/chatDebug';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  status?: 'sent' | 'delivered' | 'read';
  message_type?: 'text' | 'image' | 'shared_post' | 'shared_reel';
  reply_to_message_id?: string;
  reply_to_message?: {
    id: string;
    content: string;
    sender_id: string;
    message_type?: string;
  };
  image_url?: string;
  post_id?: string;
  reel_id?: string;
}

interface CustomChatContainerProps {
  userId: string;
  recipientId: string;
  userProfiles: Record<string, any>;
}

const CustomChatContainer: React.FC<CustomChatContainerProps> = ({
  userId,
  recipientId,
  userProfiles,
}) => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  
  // Local state
  const [replyToMessage, setReplyToMessage] = useState<Message | undefined>();
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsername, setTypingUsername] = useState<string>();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Redux selectors
  const selectedMessage = useSelector((state: RootState) => selectSelectedMessage(state));

  // Create chat ID for Socket.IO
  const chatId = [userId, recipientId].sort().join('-');

  // TanStack Query hooks
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useChatMessages(userId, recipientId);

  const sendMessageMutation = useSendMessage();
  const sendReplyMutation = useSendReply();
  const reactionMutation = useReactionMutation();

  // Flatten messages from pages
  const messages = messagesData?.pages.flatMap(page => page.messages) || [];

  // Socket.IO real-time chat
  const {
    isConnected,
    sendMessage: sendSocketMessage,
    sendTypingStatus,
    markAsDelivered,
    markAsRead,
  } = useSocketChat({
    userId,
    chatId,
    onNewMessage: (message: any) => {
      console.log('🔥 New message received:', message.id);
      
      // Invalidate messages query to refetch latest messages
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.messages(recipientId)
      });
      
      // Mark as delivered if it's not our message
      if (message.sender_id !== userId) {
        markAsDelivered(message.id);
        // Auto-mark as read after a short delay
        setTimeout(() => markAsRead(message.id), 1000);
      }
    },
    onTypingUpdate: (data: { userId: string; isTyping: boolean }) => {
      if (data.userId !== userId) {
        setIsTyping(data.isTyping);
        setTypingUsername(data.isTyping ? userProfiles[data.userId]?.username : undefined);
      }
    },
  });

  // Keyboard event listeners for better UX
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Handle sending messages
  const handleSendMessage = useCallback(async (content: string, replyToMessageId?: string) => {
    if (!content.trim()) return;

    try {
      // Create optimistic message for instant UI update
      const optimisticMessage: Message = {
        id: `temp_${Date.now()}`,
        content,
        sender_id: userId,
        receiver_id: recipientId,
        created_at: new Date().toISOString(),
        status: 'sent',
        message_type: 'text',
        reply_to_message_id: replyToMessageId,
      };

      // Add optimistic message to cache
      queryClient.setQueryData(
        queryKeys.messages.messages(recipientId),
        (oldData: any) => {
          if (!oldData) return oldData;
          
          const newPages = [...oldData.pages];
          if (newPages.length > 0) {
            newPages[newPages.length - 1] = {
              ...newPages[newPages.length - 1],
              messages: [...newPages[newPages.length - 1].messages, optimisticMessage],
            };
          }
          
          return { ...oldData, pages: newPages };
        }
      );

      // Send via Socket.IO for real-time delivery
      const socketMessage = sendSocketMessage({
        sender_id: userId,
        receiver_id: recipientId,
        content,
        is_read: false,
      });

      // Send reply or regular message via API
      if (replyToMessageId) {
        await sendReplyMutation.mutateAsync({
          senderId: userId,
          receiverId: recipientId,
          content,
          replyToMessageId,
        });
      } else {
        await sendMessageMutation.mutateAsync({
          senderId: userId,
          receiverId: recipientId,
          content,
        });
      }

      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Failed to send message:', error);

      // Run diagnostic if it's a recipient error
      if (error instanceof Error && error.message.includes('Recipient does not exist')) {
        console.log('🔍 Running diagnostic for recipient error...');
        chatDebug.runFullDiagnostic(recipientId);
      }

      Alert.alert('Error', 'Failed to send message. Please try again.');

      // Remove optimistic message on error
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.messages(recipientId)
      });
    }
  }, [userId, recipientId, sendSocketMessage, sendMessageMutation, sendReplyMutation, queryClient]);

  // Handle typing status
  const handleTypingStatusChange = useCallback((isTyping: boolean) => {
    sendTypingStatus(isTyping);
  }, [sendTypingStatus]);

  // Handle message reply
  const handleReply = useCallback((message: Message) => {
    setReplyToMessage(message);
  }, []);

  // Handle cancel reply
  const handleCancelReply = useCallback(() => {
    setReplyToMessage(undefined);
  }, []);

  // Handle emoji reactions
  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      // Add optimistic reaction
      dispatch(addOptimisticReaction({ messageId, emoji }));
      
      // Send reaction via API
      await reactionMutation.mutateAsync({
        messageId,
        emoji,
        userId,
      });
      
      console.log('✅ Reaction sent successfully');
    } catch (error) {
      console.error('❌ Failed to send reaction:', error);
      
      // Remove optimistic reaction on error
      dispatch(removeOptimisticReaction({ messageId }));
    }
  }, [dispatch, reactionMutation, userId]);

  // Handle emoji picker selection
  const handleEmojiSelect = useCallback((emoji: string) => {
    if (selectedMessage.messageId) {
      handleReaction(selectedMessage.messageId, emoji);
    }
    dispatch(clearMessageSelection());
  }, [selectedMessage.messageId, handleReaction, dispatch]);

  // Handle emoji picker close
  const handleEmojiPickerClose = useCallback(() => {
    dispatch(clearMessageSelection());
  }, [dispatch]);

  // Handle media press (for image viewing, etc.)
  const handleMediaPress = useCallback((message: Message) => {
    // TODO: Implement image viewer or media modal
    console.log('Media pressed:', message);
  }, []);

  // Handle load more messages
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      enabled={true}
    >
      {/* Message List */}
      <MessageList
        messages={messages}
        currentUserId={userId}
        onReply={handleReply}
        onReaction={handleReaction}
        onLoadMore={handleLoadMore}
        onRefresh={handleRefresh}
        isLoading={isFetchingNextPage}
        isRefreshing={isRefetching}
        hasMore={hasNextPage || false}
        isTyping={isTyping}
        typingUsername={typingUsername}
        onMediaPress={handleMediaPress}
      />

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onTypingStatusChange={handleTypingStatusChange}
        replyToMessage={replyToMessage}
        onCancelReply={handleCancelReply}
        currentUserId={userId}
        disabled={!isConnected}
      />

      {/* Emoji Reaction Picker */}
      <EmojiReactionPicker
        visible={selectedMessage.isVisible}
        position={selectedMessage.position || { x: 0, y: 0 }}
        onEmojiSelect={handleEmojiSelect}
        onClose={handleEmojiPickerClose}
      />

      {/* Message Overlay for reactions */}
      <MessageOverlay
        visible={selectedMessage.isVisible}
        messagePosition={selectedMessage.position ? {
          x: selectedMessage.position.x,
          y: selectedMessage.position.y,
          width: 200, // Default width
          height: 50, // Default height
        } : null}
        messageId={selectedMessage.messageId}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CustomChatContainer;
