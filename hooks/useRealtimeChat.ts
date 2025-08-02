import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { productionRealtimeOptimizer } from '@/lib/utils/productionRealtimeOptimizer';

interface Message {
  id: string;
  sender_id: string;
  receiver_id?: string;
  room_id?: string;
  content?: string;
  encrypted_content?: string;
  created_at: string;
  is_read?: boolean;
  status?: string;
}

interface UseRealtimeChatProps {
  userId: string;
  chatId?: string; // For 1-on-1 chat
  roomId?: string; // For room chat
  onNewMessage: (message: Message) => void;
  onMessageUpdate?: (message: Message) => void;
  onMessageDelete?: (messageId: string) => void;
  onTypingUpdate?: (data: { userId: string; isTyping: boolean }) => void;
  onMessageStatusUpdate?: (data: { messageId: string; status: string; isRead: boolean }) => void;
}

export const useRealtimeChat = ({
  userId,
  chatId,
  roomId,
  onNewMessage,
  onMessageUpdate,
  onMessageDelete,
  onTypingUpdate,
  onMessageStatusUpdate,
}: UseRealtimeChatProps) => {
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const typingSubscriptionRef = useRef<RealtimeChannel | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const isSubscribedRef = useRef(false);

  const setupMessageSubscription = useCallback(() => {
    if (!supabase || !userId || isSubscribedRef.current) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    let channelName: string;
    let filter: string;
    let tableName: string;
    let priority: 'critical' | 'high' | 'medium' | 'low' = 'high'; // Chat is high priority

    if (roomId) {
      // Room chat subscription
      channelName = `room_messages:${roomId}`;
      filter = `room_id=eq.${roomId}`;
      tableName = 'room_messages';
      priority = 'medium'; // Room messages are medium priority
    } else if (chatId) {
      // 1-on-1 chat subscription
      channelName = `messages:${chatId}`;
      // Listen to messages between these two users specifically
      const [user1, user2] = chatId.split('-');
      filter = `or(and(sender_id.eq.${user1},receiver_id.eq.${user2}),and(sender_id.eq.${user2},receiver_id.eq.${user1}))`;
      tableName = 'messages';
      priority = 'high'; // Direct messages are high priority
    } else {
      return;
    }

    console.log(`📡 Setting up PRODUCTION real-time subscription (${priority})`);

    // Use production optimizer for INSERT events
    const cleanupInsert = productionRealtimeOptimizer.createOptimizedSubscription(
      `${channelName}:insert`,
      {
        table: tableName,
        filter,
        event: 'INSERT',
        priority,
      },
      (payload) => {
        if (payload.type === 'batch') {
          // Handle batched messages
          payload.messages.forEach((msg: any) => {
            console.log('📨 Production Real-time: New message received (batched)');
            onNewMessage(msg.new as Message);
          });
        } else {
          console.log('📨 Production Real-time: New message received');
          onNewMessage(payload.new as Message);
        }
      }
    );

    // Use production optimizer for UPDATE events
    const cleanupUpdate = productionRealtimeOptimizer.createOptimizedSubscription(
      `${channelName}:update`,
      {
        table: tableName,
        filter,
        event: 'UPDATE',
        priority,
      },
      (payload) => {
        const handleUpdate = (updatePayload: any) => {
          console.log('Message updated:', updatePayload.new);
          const updatedMessage = updatePayload.new as Message;

          if (onMessageUpdate) {
            onMessageUpdate(updatedMessage);
          }

          // Handle status updates specifically
          if (onMessageStatusUpdate && updatedMessage.sender_id !== userId) {
            onMessageStatusUpdate({
              messageId: updatedMessage.id,
              status: updatedMessage.status || 'sent',
              isRead: updatedMessage.is_read || false
            });
          }
        };

        if (payload.type === 'batch') {
          // Handle batched updates
          payload.messages.forEach((msg: any) => handleUpdate(msg));
        } else {
          handleUpdate(payload);
        }
      }
    );

    // Use production optimizer for DELETE events
    const cleanupDelete = productionRealtimeOptimizer.createOptimizedSubscription(
      `${channelName}:delete`,
      {
        table: tableName,
        filter,
        event: 'DELETE',
        priority,
      },
      (payload) => {
        console.log('Message deleted:', payload.old);
        if (onMessageDelete) {
          onMessageDelete(payload.old.id);
        }
      }
    );

    // Store cleanup functions
    subscriptionRef.current = {
      unsubscribe: () => {
        cleanupInsert();
        cleanupUpdate();
        cleanupDelete();
      }
    } as RealtimeChannel;

    // Set connection status
    setConnectionStatus('connected');
    isSubscribedRef.current = true;
  }, [userId, chatId, roomId, onNewMessage, onMessageUpdate, onMessageDelete]);

  const setupTypingSubscription = useCallback(() => {
    if (!supabase || !userId || !onTypingUpdate) return;

    // Clean up existing typing subscription
    if (typingSubscriptionRef.current) {
      typingSubscriptionRef.current.unsubscribe();
      typingSubscriptionRef.current = null;
    }

    const typingChannelName = `typing:${chatId || roomId}`;
    const typingFilter = `chat_id=eq.${chatId || roomId}`;

    console.log(`Setting up typing subscription for ${typingChannelName}`);

    typingSubscriptionRef.current = supabase
      .channel(typingChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_status',
          filter: typingFilter,
        },
        (payload) => {
          console.log('Typing status update:', payload.new);
          const typingData = payload.new as any;
          if (typingData && typingData.user_id !== userId) {
            onTypingUpdate({
              userId: typingData.user_id,
              isTyping: typingData.is_typing,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`${typingChannelName} subscription status:`, status);
      });
  }, [userId, chatId, roomId, onTypingUpdate]);

  const sendTypingStatus = useCallback(async (isTyping: boolean) => {
    if (!supabase || !userId || (!chatId && !roomId)) return;

    try {
      const { error } = await supabase
        .from('typing_status')
        .upsert(
          {
            user_id: userId,
            chat_id: chatId || roomId,
            is_typing: isTyping,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: 'user_id,chat_id' }
        );

      if (error) {
        console.error('Error updating typing status:', error);
      }
    } catch (error) {
      console.error('Error sending typing status:', error);
    }
  }, [userId, chatId, roomId]);

  const cleanup = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    if (typingSubscriptionRef.current) {
      typingSubscriptionRef.current.unsubscribe();
      typingSubscriptionRef.current = null;
    }
    isSubscribedRef.current = false;
  }, []);

  useEffect(() => {
    if (!userId || (!chatId && !roomId)) return;

    setupMessageSubscription();
    if (onTypingUpdate) {
      setupTypingSubscription();
    }

    return cleanup;
  }, [userId, chatId, roomId]); // Only depend on stable values

  return {
    sendTypingStatus,
    cleanup,
    connectionStatus,
  };
};
