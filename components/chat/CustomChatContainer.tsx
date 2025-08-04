import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/src/context/ThemeContext';
import { RootState } from '@/src/store/store';
import { useSocketChat } from '@/hooks/useSocketChat';
import {
  useChatMessages,
  useSendMessage,
  useSendReply,
  useReactionMutation,
  useDeleteMessage
} from '@/lib/query/hooks/useChatQuery';
import { messagesAPI } from '@/lib/messagesApi';
import { queryKeys } from '@/lib/query/queryKeys';
import {
  addOptimisticReaction,
  removeOptimisticReaction
} from '@/src/store/slices/chatUISlice';
import { supabase } from '@/lib/supabase';

import MessageList from './MessageList';
import MessageInput from './MessageInput';
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
    sender?: {
      username: string;
    };
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

  const [reactions, setReactions] = useState<Record<string, Array<{ emoji: string; count: number; userReacted: boolean }>>>({});

  // Redux selectors
  const optimisticReactions = useSelector((state: RootState) => state.chatUI.optimisticReactions);

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
    isFetched,
    isStale,
  } = useChatMessages(userId, recipientId);

  // Instagram-like loading: Show cached data immediately, only show loading for first-time loads
  const shouldShowLoading = isLoading && !isFetched;

  // Determine if this is truly a first-time load (no cached data available)
  const isFirstTimeLoad = shouldShowLoading && (!messagesData || messagesData.pages.length === 0);

  const sendMessageMutation = useSendMessage();
  const sendReplyMutation = useSendReply();
  const reactionMutation = useReactionMutation();
  const deleteMessageMutation = useDeleteMessage();

  // Debug mutation state
  console.log('🔍 Delete mutation state:', {
    isLoading: deleteMessageMutation.isPending,
    isError: deleteMessageMutation.isError,
    error: deleteMessageMutation.error
  });

  // Flatten and properly order messages from pages for infinite scroll
  const messages = useMemo(() => {
    if (!messagesData?.pages) return [];

    // Flatten all pages and sort by created_at (oldest to newest for chat display)
    const allMessages = messagesData.pages.flatMap(page => page.messages);

    // Sort by created_at ascending (oldest first) for proper chat order
    const sortedMessages = allMessages.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    console.log(`📱 Total messages loaded: ${sortedMessages.length} across ${messagesData.pages.length} pages`);
    console.log('📱 Sample message IDs:', sortedMessages.slice(0, 5).map(m => ({ id: m.id, content: m.content })));

    return sortedMessages;
  }, [messagesData]);

  // Ref for MessageList to access scroll function
  const messageListRef = useRef<any>(null);

  // Handle scroll to message for reply functionality
  const handleScrollToMessage = useCallback((messageId: string) => {
    console.log('📱 Scroll to message requested:', messageId);

    // Find the message index in the messages array
    const messageIndex = messages.findIndex(msg => msg.id === messageId);

    if (messageIndex !== -1 && messageListRef.current) {
      console.log('📱 Scrolling to message:', messageId, 'at index:', messageIndex);

      // Scroll to the message with some offset to center it
      messageListRef.current.scrollToIndex({
        index: messageIndex,
        animated: true,
        viewPosition: 0.5, // Center the message in view
      });
    } else {
      console.log('❌ Message not found for scrolling:', messageId);
    }
  }, [messages]);

  // Fetch reactions only when message IDs change (not on every message update)
  const messageIds = useMemo(() => {
    const validIds = messages.map(m => m.id).filter(id => !id.startsWith('temp_') && id.length === 36 && id.includes('-'));
    console.log('🔍 Message IDs for reactions:', validIds.length, 'valid IDs from', messages.length, 'total messages');
    console.log('🔍 Valid message IDs:', validIds);
    return validIds;
  }, [messages]);

  const fetchReactions = useCallback(async () => {
    if (messageIds.length === 0) {
      console.log('🔍 No message IDs to fetch reactions for');
      setReactions({});
      return;
    }

    try {
      console.log('🔍 Fetching reactions for messages:', messageIds.length);
      console.log('🔍 Message IDs being sent to API:', messageIds);
      const serverReactions = await messagesAPI.getMessagesReactions(messageIds);
      console.log('🔍 Server reactions received:', Object.keys(serverReactions).length, 'messages');
      console.log('🔍 Raw server reactions:', serverReactions);

      // Process server reactions
      const combinedReactions: Record<string, Array<{ emoji: string; count: number; userReacted: boolean }>> = {};

      Object.entries(serverReactions).forEach(([messageId, messageReactions]) => {
        const groupedByEmoji = messageReactions.reduce((acc, reaction) => {
          if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = [];
          }
          acc[reaction.emoji].push(reaction);
          return acc;
        }, {} as Record<string, any[]>);

        combinedReactions[messageId] = Object.entries(groupedByEmoji).map(([emoji, emojiReactions]) => ({
          emoji,
          count: emojiReactions.length,
          userReacted: emojiReactions.some(r => r.user_id === userId)
        }));

        if (combinedReactions[messageId].length > 0) {
          console.log(`🔍 Message ${messageId} has ${combinedReactions[messageId].length} reaction types`);
        }
      });

      console.log('🔍 Setting reactions state with', Object.keys(combinedReactions).length, 'messages');
      setReactions(combinedReactions);
    } catch (error) {
      console.error('❌ Failed to fetch reactions:', error);
    }
  }, [messageIds, userId]);

  // Only fetch reactions when messageIds change (not continuously)
  useEffect(() => {
    if (messageIds.length > 0) {
      console.log('🔄 Message IDs changed, fetching reactions...');
      fetchReactions();
    } else {
      console.log('⚠️ No message IDs available, skipping reaction fetch');
    }
  }, [messageIds.join(','), userId]);

  // Socket.IO real-time chat
  const {
    isConnected,
    sendMessage: sendSocketMessage,
    sendTypingStatus,
    markAsDelivered,
    markAsRead,
    sendReaction: sendSocketReaction,
  } = useSocketChat({
    userId,
    chatId,
    onNewMessage: (message: any) => {
      console.log('🔥 New message received via Socket.IO:', {
        id: message.id,
        content: message.content,
        sender_id: message.sender_id,
        isTemp: message.id.startsWith('temp_')
      });

      // Add message directly to cache instead of invalidating
      queryClient.setQueryData(
        queryKeys.messages.messages(recipientId),
        (oldData: any) => {
          if (!oldData) return oldData;

          const newPages = [...oldData.pages];
          if (newPages.length > 0) {
            const lastPage = newPages[newPages.length - 1];

            // Check if this exact message already exists in ANY page
            const messageExistsInAnyPage = newPages.some(page =>
              page.messages.some((m: any) =>
                m.id === message.id ||
                // Also check for content/sender/time match (for API messages with new UUIDs)
                (m.content === message.content &&
                 m.sender_id === message.sender_id &&
                 Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) < 5000)
              )
            );

            if (!messageExistsInAnyPage) {
              // Look for optimistic/socket message to replace in the last page
              const tempMessageIndex = lastPage.messages.findIndex((m: any) =>
                (m.id.startsWith('temp_') || m.id.startsWith('msg_')) &&
                m.content === message.content &&
                m.sender_id === message.sender_id &&
                Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) < 10000
              );

              if (tempMessageIndex !== -1) {
                // Replace optimistic/socket message with real API message
                console.log('🔄 Replacing optimistic/socket message with API message:', {
                  oldId: lastPage.messages[tempMessageIndex].id,
                  newId: message.id
                });
                const updatedMessages = [...lastPage.messages];
                updatedMessages[tempMessageIndex] = message;
                newPages[newPages.length - 1] = {
                  ...lastPage,
                  messages: updatedMessages,
                };
              } else {
                // Add new message (from other user)
                console.log('➕ Adding new message to cache:', message.id);
                newPages[newPages.length - 1] = {
                  ...lastPage,
                  messages: [...lastPage.messages, message],
                };
              }
            } else {
              console.log('⚠️ Message already exists in cache, skipping:', message.id);
            }
          }

          // Final deduplication check to ensure no duplicate IDs
          if (newPages.length > 0) {
            const lastPage = newPages[newPages.length - 1];
            const uniqueMessages = lastPage.messages.filter((msg: any, index: number, arr: any[]) =>
              arr.findIndex((m: any) => m.id === msg.id) === index
            );

            if (uniqueMessages.length !== lastPage.messages.length) {
              console.log('🧹 Removed duplicate messages:', lastPage.messages.length - uniqueMessages.length);
              newPages[newPages.length - 1] = {
                ...lastPage,
                messages: uniqueMessages,
              };
            }
          }

          return { ...oldData, pages: newPages };
        }
      );

      // Only mark as read if it's not our message and user is actively viewing chat
      if (message.sender_id !== userId) {
        console.log('📨 Message received from other user:', message.id);

        // Mark as read after a short delay (simulating user seeing the message)
        // Only if the chat is currently active/visible
        setTimeout(() => {
          console.log('👀 Marking message as read (user is viewing chat):', message.id);
          markAsRead(message.id);
        }, 2000);
      }
    },
    onTypingUpdate: (data: { userId: string; isTyping: boolean }) => {
      if (data.userId !== userId) {
        setIsTyping(data.isTyping);
        setTypingUsername(data.isTyping ? userProfiles[data.userId]?.username : undefined);
      }
    },
    onMessageStatusUpdate: (data: { messageId: string; status: string; isRead: boolean }) => {
      console.log('📊 Socket.IO: Message status update received:', data);

      // Update the message status in cache immediately
      queryClient.setQueryData(
        queryKeys.messages.messages(recipientId),
        (oldData: any) => {
          if (!oldData) return oldData;

          console.log('🔍 Looking for message ID:', data.messageId);
          console.log('🔍 Available message IDs:', oldData.pages.flatMap((p: any) => p.messages.map((m: any) => m.id)));

          let messageFound = false;
          let statusChanged = false;
          const newPages = oldData.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((msg: any) => {
              if (msg.id === data.messageId) {
                messageFound = true;

                // Check if status actually needs to change
                if (msg.status === data.status && msg.is_read === data.isRead) {
                  console.log('⚠️ Message already has target status:', msg.id, 'status:', msg.status, 'isRead:', msg.is_read);
                  return msg; // No change needed
                }

                statusChanged = true;
                console.log('✅ Found message to update:', msg.id, 'from', msg.status, 'to', data.status);
                return {
                  ...msg,
                  status: data.status,
                  is_read: data.isRead,
                  delivered_at: data.status === 'delivered' ? new Date().toISOString() : msg.delivered_at,
                  read_at: data.status === 'read' ? new Date().toISOString() : msg.read_at
                };
              }
              return msg;
            })
          }));

          if (!messageFound) {
            console.log('❌ Message not found in cache for status update:', data.messageId);
            return oldData; // No change
          }

          if (!statusChanged) {
            console.log('⚠️ No status change needed, skipping update');
            return oldData; // No change
          }

          console.log('🔄 Status update applied successfully');
          return { ...oldData, pages: newPages };
        }
      );
    },
    onNewReaction: async (data: { messageId: string; userId: string; emoji: string; action: string; oldEmoji?: string }) => {
      console.log('😀 Socket.IO: Reaction update received:', data);

      // Fetch reactions for ONLY this specific message to avoid overwriting others
      try {
        const serverReactions = await messagesAPI.getMessagesReactions([data.messageId]);
        const messageReactions = serverReactions[data.messageId] || [];

        // Process reactions for this specific message
        const groupedByEmoji = messageReactions.reduce((acc, reaction) => {
          if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = [];
          }
          acc[reaction.emoji].push(reaction);
          return acc;
        }, {} as Record<string, any[]>);

        const processedReactions = Object.entries(groupedByEmoji).map(([emoji, emojiReactions]) => ({
          emoji,
          count: emojiReactions.length,
          userReacted: emojiReactions.some(r => r.user_id === userId)
        }));

        // Update ONLY this message's reactions, preserve others
        setReactions(prevReactions => ({
          ...prevReactions,
          [data.messageId]: processedReactions
        }));

        console.log(`✅ Updated reactions for message ${data.messageId}:`, processedReactions.length, 'reaction types');
      } catch (error) {
        console.error('❌ Failed to fetch specific message reactions:', error);
        // Fallback to optimistic update
        setReactions(prevReactions => {
          const messageReactions = prevReactions[data.messageId] || [];

          if (data.action === 'removed') {
            const updatedReactions = messageReactions.filter(r => r.emoji !== data.emoji);
            return {
              ...prevReactions,
              [data.messageId]: updatedReactions
            };
          } else {
            const existingIndex = messageReactions.findIndex(r => r.emoji === data.emoji);
            let updatedReactions;

            if (existingIndex >= 0) {
              updatedReactions = messageReactions.map((reaction, index) =>
                index === existingIndex
                  ? { ...reaction, count: reaction.count + (data.userId === userId ? 0 : 1) }
                  : reaction
              );
            } else {
              updatedReactions = [...messageReactions, {
                emoji: data.emoji,
                count: 1,
                userReacted: data.userId === userId
              }];
            }

            return {
              ...prevReactions,
              [data.messageId]: updatedReactions
            };
          }
        });
      }
    },
  });

  // Supabase real-time subscriptions for message status updates and reactions
  useEffect(() => {
    if (!userId || !recipientId) return;

    console.log('🔔 Setting up Supabase real-time subscriptions for chat:', { userId, recipientId });

    // Subscribe to message status updates
    const messageStatusChannel = supabase
      .channel(`message_status_${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${userId},receiver_id=eq.${recipientId}`,
        },
        (payload) => {
          console.log('📨 Message status updated:', payload.new);

          // Update the message in cache with new status
          queryClient.setQueryData(
            queryKeys.messages.messages(recipientId),
            (oldData: any) => {
              if (!oldData) return oldData;

              const newPages = oldData.pages.map((page: any) => ({
                ...page,
                messages: page.messages.map((msg: any) =>
                  msg.id === payload.new.id
                    ? { ...msg, status: payload.new.status, delivered_at: payload.new.delivered_at, read_at: payload.new.read_at }
                    : msg
                )
              }));

              return { ...oldData, pages: newPages };
            }
          );
        }
      )
      .subscribe();

    // Subscribe to message reactions
    const reactionsChannel = supabase
      .channel(`message_reactions_${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        (payload) => {
          console.log('😀 Message reaction updated:', payload);

          // Refresh reactions for affected message (specific message only)
          if (payload.new?.message_id || payload.old?.message_id) {
            const messageId = payload.new?.message_id || payload.old?.message_id;
            console.log('🔄 Supabase: Reaction change detected for message:', messageId);

            // Fetch reactions for only this specific message
            messagesAPI.getMessagesReactions([messageId]).then(serverReactions => {
              const messageReactions = serverReactions[messageId] || [];

              const groupedByEmoji = messageReactions.reduce((acc, reaction) => {
                if (!acc[reaction.emoji]) {
                  acc[reaction.emoji] = [];
                }
                acc[reaction.emoji].push(reaction);
                return acc;
              }, {} as Record<string, any[]>);

              const processedReactions = Object.entries(groupedByEmoji).map(([emoji, emojiReactions]) => ({
                emoji,
                count: emojiReactions.length,
                userReacted: emojiReactions.some(r => r.user_id === userId)
              }));

              // Update ONLY this message's reactions
              setReactions(prevReactions => ({
                ...prevReactions,
                [messageId]: processedReactions
              }));
            }).catch(error => {
              console.error('❌ Failed to fetch specific message reactions:', error);
            });
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      console.log('🧹 Cleaning up Supabase real-time subscriptions');
      messageStatusChannel.unsubscribe();
      reactionsChannel.unsubscribe();
    };
  }, [userId, recipientId, chatId, queryClient, fetchReactions]);

  // Mark unread messages as read when chat is opened (only once)
  const markedAsReadRef = useRef(new Set<string>());

  useEffect(() => {
    if (!userId || !recipientId || !messages.length) return;

    // Find unread messages from the other user that haven't been marked yet
    const unreadMessages = messages.filter(msg =>
      msg.sender_id === recipientId &&
      msg.status !== 'read' &&
      !msg.is_read &&
      !msg.id.startsWith('temp_') &&
      !markedAsReadRef.current.has(msg.id)
    );

    if (unreadMessages.length > 0) {
      console.log(`👀 Marking ${unreadMessages.length} new messages as read`);

      // Mark each unread message as read (only once)
      unreadMessages.forEach(msg => {
        markedAsReadRef.current.add(msg.id); // Track that we've marked this message
        setTimeout(() => {
          markAsRead(msg.id);
        }, 500); // Small delay to simulate reading
      });
    }
  }, [messages, userId, recipientId, markAsRead]);

  // Handle sending messages
  const handleSendMessage = useCallback(async (content: string, replyToMessageId?: string) => {
    if (!content.trim()) return;

    try {
      // Create optimistic message for instant UI update
      const timestamp = Date.now();
      const optimisticMessage: Message = {
        id: `temp_${timestamp}_${userId}`,
        content,
        sender_id: userId,
        receiver_id: recipientId,
        created_at: new Date(timestamp).toISOString(),
        status: 'sent',
        message_type: 'text',
        reply_to_message_id: replyToMessageId,
      };

      // Add optimistic message to cache
      console.log('🚀 Adding optimistic message to cache:', {
        id: optimisticMessage.id,
        content: optimisticMessage.content,
        sender_id: optimisticMessage.sender_id
      });
      queryClient.setQueryData(
        queryKeys.messages.messages(recipientId),
        (oldData: any) => {
          if (!oldData) return oldData;

          const newPages = [...oldData.pages];
          if (newPages.length > 0) {
            // Add optimistic messages to the last page (same as real-time messages)
            const lastPage = newPages[newPages.length - 1];

            // Check if optimistic message already exists in any page
            const messageExists = newPages.some(page =>
              page.messages.some((m: any) =>
                m.id === optimisticMessage.id ||
                (m.content === optimisticMessage.content &&
                 m.sender_id === optimisticMessage.sender_id &&
                 Math.abs(new Date(m.created_at).getTime() - new Date(optimisticMessage.created_at).getTime()) < 2000)
              )
            );

            if (!messageExists) {
              // Add to last page (same as real-time messages) for consistency
              newPages[newPages.length - 1] = {
                ...lastPage,
                messages: [...lastPage.messages, optimisticMessage],
              };
              console.log('🚀 Added optimistic message to last page');
            } else {
              console.log('⚠️ Optimistic message already exists, skipping');
            }
          }

          return { ...oldData, pages: newPages };
        }
      );

      // Send reply or regular message via API first to get real message ID
      let realMessage;
      if (replyToMessageId) {
        realMessage = await sendReplyMutation.mutateAsync({
          senderId: userId,
          receiverId: recipientId,
          content,
          replyToMessageId,
        });
      } else {
        realMessage = await sendMessageMutation.mutateAsync({
          senderId: userId,
          receiverId: recipientId,
          content,
        });
      }

      // Replace optimistic message with real message in cache
      if (realMessage && realMessage.id) {
        console.log('🔄 Replacing optimistic message with real message:', {
          optimisticId: optimisticMessage.id,
          realId: realMessage.id
        });

        queryClient.setQueryData(
          queryKeys.messages.messages(recipientId),
          (oldData: any) => {
            if (!oldData) return oldData;

            const newPages = oldData.pages.map((page: any) => ({
              ...page,
              messages: page.messages.map((msg: any) =>
                msg.id === optimisticMessage.id
                  ? { ...realMessage, status: 'sent' } // Replace with real message but keep 'sent' status
                  : msg
              )
            }));

            return { ...oldData, pages: newPages };
          }
        );

        // Send via Socket.IO for real-time delivery with REAL message ID
        console.log('📤 Sending Socket.IO message with real ID:', realMessage.id);
        const socketMessage = sendSocketMessage({
          id: realMessage.id, // Use real database ID
          sender_id: userId,
          receiver_id: recipientId,
          content,
          is_read: false,
          created_at: realMessage.created_at,
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

      // Remove specific optimistic message on error
      queryClient.setQueryData(
        queryKeys.messages.messages(recipientId),
        (oldData: any) => {
          if (!oldData) return oldData;

          const newPages = [...oldData.pages];
          if (newPages.length > 0) {
            const lastPage = newPages[newPages.length - 1];
            newPages[newPages.length - 1] = {
              ...lastPage,
              messages: lastPage.messages.filter((m: any) => m.id !== optimisticMessage.id),
            };
          }

          return { ...oldData, pages: newPages };
        }
      );
    }
  }, [userId, recipientId, sendSocketMessage, sendMessageMutation, sendReplyMutation, queryClient]);

  // Handle typing status
  const handleTypingStatusChange = useCallback((isTyping: boolean) => {
    sendTypingStatus(isTyping);
  }, [sendTypingStatus]);

  // TODO: Implement reply functionality later
  // const handleReply = useCallback((message: Message) => {
  //   setReplyToMessage(message);
  // }, []);

  // Handle cancel reply
  const handleCancelReply = useCallback(() => {
    setReplyToMessage(undefined);
  }, []);

  // Handle emoji reactions with Socket.IO for instant real-time updates
  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      console.log('😀 Adding reaction via Socket.IO:', { messageId, emoji, userId });

      // Optimistic update: immediately update local reactions state
      setReactions(prevReactions => {
        const messageReactions = prevReactions[messageId] || [];
        const existingReactionIndex = messageReactions.findIndex(r => r.emoji === emoji);

        let updatedReactions;
        if (existingReactionIndex >= 0) {
          const existingReaction = messageReactions[existingReactionIndex];
          if (existingReaction.userReacted) {
            // User is removing their reaction
            if (existingReaction.count === 1) {
              // Remove the reaction entirely
              updatedReactions = messageReactions.filter((_, index) => index !== existingReactionIndex);
            } else {
              // Decrease count and mark as not reacted
              updatedReactions = messageReactions.map((reaction, index) =>
                index === existingReactionIndex
                  ? { ...reaction, count: reaction.count - 1, userReacted: false }
                  : reaction
              );
            }
          } else {
            // User is adding their reaction to existing emoji
            updatedReactions = messageReactions.map((reaction, index) =>
              index === existingReactionIndex
                ? { ...reaction, count: reaction.count + 1, userReacted: true }
                : reaction
            );
          }
        } else {
          // New emoji reaction
          updatedReactions = [...messageReactions, { emoji, count: 1, userReacted: true }];
        }

        return {
          ...prevReactions,
          [messageId]: updatedReactions
        };
      });

      // Send reaction via Socket.IO for instant real-time updates
      if (!messageId.startsWith('temp_')) {
        console.log('📤 Sending reaction via Socket.IO:', { messageId, emoji });
        sendSocketReaction(messageId, emoji);

        // Also send to API as backup (but don't wait for it)
        reactionMutation.mutateAsync({
          messageId,
          emoji,
          userId,
        }).catch(error => {
          console.error('❌ API reaction failed (Socket.IO already sent):', error);
          // Refresh reactions for this specific message if API fails
          setTimeout(async () => {
            try {
              const serverReactions = await messagesAPI.getMessagesReactions([messageId]);
              const messageReactions = serverReactions[messageId] || [];

              const groupedByEmoji = messageReactions.reduce((acc, reaction) => {
                if (!acc[reaction.emoji]) {
                  acc[reaction.emoji] = [];
                }
                acc[reaction.emoji].push(reaction);
                return acc;
              }, {} as Record<string, any[]>);

              const processedReactions = Object.entries(groupedByEmoji).map(([emoji, emojiReactions]) => ({
                emoji,
                count: emojiReactions.length,
                userReacted: emojiReactions.some(r => r.user_id === userId)
              }));

              setReactions(prevReactions => ({
                ...prevReactions,
                [messageId]: processedReactions
              }));
            } catch (fetchError) {
              console.error('❌ Failed to refresh specific message reactions:', fetchError);
            }
          }, 1000);
        });
      } else {
        console.log('⚠️ Skipping reaction for temporary message:', messageId);
        // Add Redux optimistic reaction for temporary messages
        dispatch(addOptimisticReaction({ messageId, emoji }));
      }
    } catch (error) {
      console.error('❌ Failed to send reaction:', error);

      // Revert optimistic update on error - fetch only this message's reactions
      try {
        const serverReactions = await messagesAPI.getMessagesReactions([messageId]);
        const messageReactions = serverReactions[messageId] || [];

        const groupedByEmoji = messageReactions.reduce((acc, reaction) => {
          if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = [];
          }
          acc[reaction.emoji].push(reaction);
          return acc;
        }, {} as Record<string, any[]>);

        const processedReactions = Object.entries(groupedByEmoji).map(([emoji, emojiReactions]) => ({
          emoji,
          count: emojiReactions.length,
          userReacted: emojiReactions.some(r => r.user_id === userId)
        }));

        setReactions(prevReactions => ({
          ...prevReactions,
          [messageId]: processedReactions
        }));
      } catch (fetchError) {
        console.error('❌ Failed to revert reaction state:', fetchError);
      }

      dispatch(removeOptimisticReaction(messageId));
    }
  }, [dispatch, reactionMutation, userId, fetchReactions, sendSocketReaction]);

  // Handle message deletion - simplified
  const handleDelete = useCallback(async (messageId: string) => {
    console.log('🗑️ Delete handler called for message:', messageId);

    // Check if this is a temporary message (not yet saved to database)
    if (messageId.startsWith('temp_')) {
      console.log('🗑️ Deleting temporary message (not in database):', messageId);
      // Only remove from cache since it's not in the database
      queryClient.setQueryData(
        queryKeys.messages.messages(recipientId),
        (oldData: any) => {
          if (!oldData) return oldData;

          const newPages = [...oldData.pages];
          for (let i = 0; i < newPages.length; i++) {
            const page = newPages[i];
            const filteredMessages = page.messages.filter((msg: any) => msg.id !== messageId);
            if (filteredMessages.length !== page.messages.length) {
              newPages[i] = { ...page, messages: filteredMessages };
              break;
            }
          }

          return { ...oldData, pages: newPages };
        }
      );
      console.log('✅ Temporary message removed from cache');
      return; // Exit early for temporary messages
    }

    try {
      // Skip Redux optimistic deletion due to Immer MapSet issue
      // dispatch(addOptimisticDeletedMessage(messageId));
      console.log('🗑️ Processing database message deletion');

      // Immediately remove from cache for instant UI update
      queryClient.setQueryData(
        queryKeys.messages.messages(recipientId),
        (oldData: any) => {
          if (!oldData) return oldData;

          const newPages = [...oldData.pages];
          for (let i = 0; i < newPages.length; i++) {
            const page = newPages[i];
            const filteredMessages = page.messages.filter((msg: any) => msg.id !== messageId);
            if (filteredMessages.length !== page.messages.length) {
              newPages[i] = { ...page, messages: filteredMessages };
              break;
            }
          }

          return { ...oldData, pages: newPages };
        }
      );

      console.log('🗑️ Optimistically removed message from cache:', messageId);

      // Delete message via API
      console.log('🗑️ Calling deleteMessageMutation.mutateAsync with:', messageId);
      console.log('🗑️ Mutation state before call:', {
        isPending: deleteMessageMutation.isPending,
        isError: deleteMessageMutation.isError,
        error: deleteMessageMutation.error
      });

      try {
        const result = await deleteMessageMutation.mutateAsync(messageId);
        console.log('🗑️ deleteMessageMutation.mutateAsync completed successfully:', result);
        console.log('✅ Message should now be deleted from database');
      } catch (mutationError) {
        console.error('🚨 Mutation error:', mutationError);
        console.error('🚨 Mutation error details:', {
          message: mutationError.message,
          stack: mutationError.stack,
          name: mutationError.name
        });
        throw mutationError; // Re-throw to be caught by outer catch
      }

    } catch (error) {
      console.error('🚨 Error in handleDelete:', error);
      // Skip Redux optimistic deletion removal due to Immer MapSet issue
      // dispatch(removeOptimisticDeletedMessage(messageId));

      // Restore message in cache on error
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.messages(recipientId) });

      console.error('Failed to delete message:', error);
      Alert.alert('Error', `Failed to delete message: ${error.message || error}. Please try again.`);
    }
  }, [dispatch, deleteMessageMutation, queryClient, recipientId]);

  // Handle media press (for image viewing, etc.)
  const handleMediaPress = useCallback((message: Message) => {
    // TODO: Implement image viewer or media modal
    console.log('Media pressed:', message);
  }, []);

  // Handle load more messages
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      console.log('📱 Loading more messages...');
      fetchNextPage();
    } else {
      console.log('📱 No more messages to load or already loading', { hasNextPage, isFetchingNextPage });
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);



  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Message List */}
      <MessageList
        messages={messages}
        currentUserId={userId}
        // {/* onReply={handleReply} */}
        onReaction={handleReaction}
        onDelete={handleDelete}
        onLoadMore={handleLoadMore}
        onRefresh={handleRefresh}
        isLoading={isFetchingNextPage || false}
        isRefreshing={isRefetching || false}
        hasMore={hasNextPage || false}
        isTyping={isTyping || false}
        typingUsername={typingUsername || ''}
        reactions={reactions || {}}
        optimisticReactions={optimisticReactions || {}}
        onMediaPress={handleMediaPress}
        isInitialLoading={isFirstTimeLoad || false}
        onScrollToMessage={handleScrollToMessage}
        messageListRef={messageListRef}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CustomChatContainer;
