/**
 * TanStack Query hooks for Chat functionality
 * Provides optimized data fetching with caching and pagination
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { messagesAPI } from '@/lib/messagesApi';
import { usersApi } from '@/lib/usersApi';
import { queryKeys } from '../queryKeys';

// Types
interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  is_read: boolean;
  status: "sent" | "delivered" | "read";
  delivered_at?: string;
  read_at?: string;
  message_type: 'text' | 'shared_post' | 'shared_reel';
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
}

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
}

interface Conversation {
  userId: string;
  username: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  isRead: boolean;
}

// Use centralized query keys
const chatQueryKeys = queryKeys.messages;

// Query Functions
const chatQueryFunctions = {
  /**
   * Get user profile for chat header
   */
  getUserProfile: async (userId: string): Promise<UserProfile> => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      throw new Error(`User profile not found: ${error?.message || 'No data'}`);
    }

    return profile;
  },

  /**
   * Get conversations list
   */
  getConversations: async (currentUserId: string): Promise<Conversation[]> => {
    try {
      // Get all messages where user is sender or receiver
      const { data: messages, error } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          sender_id,
          receiver_id,
          created_at,
          is_read,
          message_type
        `)
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!messages || messages.length === 0) {
        return [];
      }

      // Group messages by conversation partner
      const conversationMap = new Map<string, any>();

      for (const message of messages) {
        const otherId = message.sender_id === currentUserId ? message.receiver_id : message.sender_id;
        
        if (!conversationMap.has(otherId)) {
          conversationMap.set(otherId, message);
        }
      }

      // Get user details for each conversation partner
      const conversationUsers = await Promise.all(
        Array.from(conversationMap.entries()).map(async ([otherId, lastMessage]) => {
          const { data: userDoc, error: userError } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", otherId)
            .single();

          if (userError || !userDoc) {
            console.warn(`User not found for conversation: ${otherId}`);
            return null;
          }

          return {
            userId: otherId,
            username: userDoc.username,
            avatar: userDoc.avatar_url || "https://via.placeholder.com/50",
            lastMessage: messagesAPI.getMessagePreview(lastMessage.content, lastMessage.message_type),
            timestamp: lastMessage.created_at,
            isRead: lastMessage.is_read,
          };
        })
      );

      const validConversations = conversationUsers.filter(Boolean) as Conversation[];
      
      return validConversations.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error("Error loading conversations:", error);
      throw error;
    }
  },

  /**
   * Get messages with pagination (Instagram/WhatsApp style)
   * First page: Most recent messages
   * Next pages: Older messages when scrolling up
   * Respects cleared chat status - only shows messages after clear time
   */
  getMessages: async ({
    pageParam = 0,
    currentUserId,
    recipientId
  }: {
    pageParam?: number;
    currentUserId: string;
    recipientId: string;
  }) => {
    const MESSAGES_PER_PAGE = 30; // Increased for better UX
    const offset = pageParam * MESSAGES_PER_PAGE;

    console.log(`📱 Fetching messages page ${pageParam}, offset: ${offset}`);

    try {
      // First check if the user has cleared this chat
      const { data: clearedChat, error: clearedError } = await supabase
        .from("cleared_chats")
        .select("cleared_at")
        .eq("user_id", currentUserId)
        .eq("other_user_id", recipientId)
        .single();

      if (clearedError && clearedError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error("❌ Error checking cleared chat status:", clearedError);
        // Continue with normal query if there's an error
      }

      let query = supabase
        .from("messages")
        .select(`
          id,
          content,
          sender_id,
          receiver_id,
          created_at,
          is_read,
          status,
          delivered_at,
          read_at,
          message_type,
          reply_to_message_id,
          reply_to_message:messages!reply_to_message_id(
            id,
            content,
            sender_id,
            message_type,
            sender:profiles!sender_id(username)
          )
        `)
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${currentUserId})`);

      // If chat was cleared, only show messages sent after the clear time
      if (clearedChat?.cleared_at) {
        console.log(`📅 Chat was cleared at: ${clearedChat.cleared_at}, filtering messages`);
        query = query.gt("created_at", clearedChat.cleared_at);
      }

      const { data: messages, error } = await query
        .order("created_at", { ascending: false }) // Newest first from DB
        .range(offset, offset + MESSAGES_PER_PAGE - 1);

      if (error) throw error;

      const messageCount = messages?.length || 0;
      const hasMore = messageCount === MESSAGES_PER_PAGE;

      const statusMessage = clearedChat?.cleared_at
        ? `📱 Fetched ${messageCount} messages (after clear), hasMore: ${hasMore}`
        : `📱 Fetched ${messageCount} messages, hasMore: ${hasMore}`;

      console.log(statusMessage);

      return {
        messages: messages || [], // Keep DB order (newest first)
        nextCursor: hasMore ? pageParam + 1 : undefined,
        hasMore,
        pageParam,
      };
    } catch (error) {
      console.error("Error fetching messages:", error);
      throw error;
    }
  },
};

// Hooks
/**
 * Get user profile for chat header
 */
export const useChatUserProfile = (userId: string) => {
  return useQuery({
    queryKey: chatQueryKeys.userProfile(userId),
    queryFn: () => chatQueryFunctions.getUserProfile(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
  });
};

/**
 * Get conversations list
 */
export const useConversations = (currentUserId: string) => {
  return useQuery({
    queryKey: chatQueryKeys.conversations(),
    queryFn: () => chatQueryFunctions.getConversations(currentUserId),
    enabled: !!currentUserId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes (renamed from cacheTime)
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
};

/**
 * Get messages with infinite pagination (Instagram/WhatsApp style)
 */
export const useChatMessages = (currentUserId: string, recipientId: string) => {
  return useInfiniteQuery({
    queryKey: chatQueryKeys.messages(recipientId),
    queryFn: ({ pageParam }) => chatQueryFunctions.getMessages({
      pageParam,
      currentUserId,
      recipientId
    }),
    enabled: !!currentUserId && !!recipientId,
    getNextPageParam: (lastPage) => {
      console.log('📱 getNextPageParam:', { hasMore: lastPage.hasMore, nextCursor: lastPage.nextCursor });
      return lastPage.nextCursor;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - Longer for infinite scroll stability
    gcTime: 60 * 60 * 1000, // 1 hour - Keep pages in memory longer
    initialPageParam: 0,
    refetchOnWindowFocus: false, // Don't refetch when returning to app
    refetchOnMount: false, // Use cached data when reopening chat
    refetchOnReconnect: true, // Only refetch on network reconnect
    // Infinite scroll optimizations
    maxPages: 20, // Limit to prevent memory issues
    getPreviousPageParam: () => undefined, // Only forward pagination
  });
};

/**
 * Send message mutation
 */
export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      senderId,
      receiverId,
      content,
      messageType = 'text'
    }: {
      senderId: string;
      receiverId: string;
      content: string;
      messageType?: 'text' | 'shared_post' | 'shared_reel';
    }) => {
      return await messagesAPI.sendMessage(senderId, receiverId, content, messageType);
    },
    onSuccess: (data, variables) => {
      // Only invalidate conversations list - don't add message to cache
      // The optimistic update and real-time subscription handle cache updates
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations() });

      console.log('✅ Message sent successfully via API:', data.id);
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
    },
  });
};

/**
 * Mark messages as read mutation
 */
export const useMarkMessagesAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ senderId, receiverId }: { senderId: string; receiverId: string }) => {
      return await messagesAPI.markMessagesAsRead(senderId, receiverId);
    },
    onSuccess: (data, variables) => {
      // Invalidate conversations to update read status
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations() });

      // Update messages cache to mark as read
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(variables.senderId) });
    },
  });
};

/**
 * Send reply mutation
 */
export const useSendReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      senderId,
      receiverId,
      content,
      replyToMessageId,
      messageType = 'text'
    }: {
      senderId: string;
      receiverId: string;
      content: string;
      replyToMessageId: string;
      messageType?: 'text' | 'shared_post' | 'shared_reel';
    }) => {
      return await messagesAPI.sendReply(senderId, receiverId, content, replyToMessageId, messageType);
    },
    onSuccess: (data, variables) => {
      // Only invalidate conversations list - don't invalidate messages cache
      // The optimistic update and real-time subscription handle cache updates
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations() });

      console.log('✅ Reply sent successfully via API:', data.id);
    },
    onError: (error) => {
      console.error('Reply mutation error:', error);
    },
  });
};

/**
 * Add/remove reaction mutation
 */
export const useReactionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      userId,
      emoji
    }: {
      messageId: string;
      userId: string;
      emoji: string;
    }) => {
      return await messagesAPI.addReaction(messageId, userId, emoji);
    },
    onSuccess: (data, variables) => {
      // Invalidate reactions query for this message
      queryClient.invalidateQueries({
        queryKey: [...chatQueryKeys.messages(''), 'reactions', variables.messageId]
      });
    },
    onError: (error) => {
      console.error('Reaction mutation error:', error);
    },
  });
};

/**
 * Get message reactions query
 */
export const useMessageReactions = (messageId: string) => {
  return useQuery({
    queryKey: [...chatQueryKeys.messages(''), 'reactions', messageId],
    queryFn: () => messagesAPI.getMessageReactions(messageId),
    enabled: !!messageId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Delete message mutation
 */
export const useDeleteMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      console.log('🗑️ Delete mutation called for message:', messageId);
      // Get current user ID from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('🗑️ Calling messagesAPI.deleteMessage with:', { messageId, userId: user.id });
      return await messagesAPI.deleteMessage(messageId, user.id);
    },
    onSuccess: (data, messageId) => {
      // Remove message from all cached queries
      queryClient.setQueriesData(
        { queryKey: chatQueryKeys.all },
        (oldData: any) => {
          if (!oldData) return oldData;

          // Handle infinite query data structure
          if (oldData.pages) {
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                messages: page.messages?.filter((msg: any) => msg.id !== messageId) || []
              }))
            };
          }

          // Handle regular array data
          if (Array.isArray(oldData)) {
            return oldData.filter((msg: any) => msg.id !== messageId);
          }

          return oldData;
        }
      );

      // Invalidate all message-related queries
      queryClient.invalidateQueries({
        queryKey: chatQueryKeys.all
      });

      // Also invalidate conversations list
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations() });

      console.log('✅ Message deleted successfully:', messageId);
    },
    onError: (error, messageId) => {
      console.error('❌ Delete message mutation error:', error);
      console.error('❌ Failed to delete message ID:', messageId);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    },
  });
};

/**
 * Clear entire chat mutation (delete all messages sent by current user)
 */
export const useClearChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recipientId }: { recipientId: string }) => {
      // Get current user ID from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      return await messagesAPI.clearChat(user.id, recipientId);
    },
    onSuccess: (data, variables) => {
      // Get current user ID to filter messages
      const getCurrentUserId = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        return user?.id;
      };

      // Remove user's messages from all cached queries
      getCurrentUserId().then(currentUserId => {
        if (currentUserId) {
          queryClient.setQueriesData(
            { queryKey: chatQueryKeys.all },
            (oldData: any) => {
              if (!oldData) return oldData;

              // Handle infinite query data structure
              if (oldData.pages) {
                return {
                  ...oldData,
                  pages: oldData.pages.map((page: any) => ({
                    ...page,
                    messages: page.messages?.filter((msg: any) =>
                      !(msg.sender_id === currentUserId && msg.receiver_id === variables.recipientId)
                    ) || []
                  }))
                };
              }

              // Handle regular array data
              if (Array.isArray(oldData)) {
                return oldData.filter((msg: any) =>
                  !(msg.sender_id === currentUserId && msg.receiver_id === variables.recipientId)
                );
              }

              return oldData;
            }
          );
        }
      });

      // Invalidate all message-related queries
      queryClient.invalidateQueries({
        queryKey: chatQueryKeys.all
      });

      // Also invalidate conversations list
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations() });

      console.log('✅ Chat cleared successfully for recipient:', variables.recipientId);
    },
    onError: (error) => {
      console.error('❌ Clear chat mutation error:', error);
    },
  });
};
