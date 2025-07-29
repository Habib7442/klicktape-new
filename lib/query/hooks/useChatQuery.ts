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
   * Get messages with pagination
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
    const MESSAGES_PER_PAGE = 25;
    const offset = pageParam * MESSAGES_PER_PAGE;

    try {
      const { data: messages, error } = await supabase
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
          message_type
        `)
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${currentUserId})`)
        .order("created_at", { ascending: false })
        .range(offset, offset + MESSAGES_PER_PAGE - 1);

      if (error) throw error;

      return {
        messages: (messages || []).reverse(), // Reverse to show oldest first
        nextCursor: messages && messages.length === MESSAGES_PER_PAGE ? pageParam + 1 : undefined,
        hasMore: messages && messages.length === MESSAGES_PER_PAGE,
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
 * Get messages with infinite pagination
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
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime)
    initialPageParam: 0,
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
      // Invalidate conversations list
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations() });

      // Add new message to the messages cache
      queryClient.setQueryData(
        chatQueryKeys.messages(variables.receiverId),
        (oldData: any) => {
          if (!oldData) return oldData;

          const newMessage = data;
          const firstPage = oldData.pages[0];

          return {
            ...oldData,
            pages: [
              {
                ...firstPage,
                messages: [...firstPage.messages, newMessage],
              },
              ...oldData.pages.slice(1),
            ],
          };
        }
      );
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
      // Invalidate messages queries to show new reply
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(variables.receiverId) });

      // Also invalidate conversations to update last message
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations() });
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
