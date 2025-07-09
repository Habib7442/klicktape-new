import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

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

    if (roomId) {
      // Room chat subscription
      channelName = `room_messages:${roomId}`;
      filter = `room_id=eq.${roomId}`;
      tableName = 'room_messages';
    } else if (chatId) {
      // 1-on-1 chat subscription
      channelName = `messages:${chatId}`;
      // Listen to messages between these two users specifically
      const [user1, user2] = chatId.split('-');
      filter = `or(and(sender_id.eq.${user1},receiver_id.eq.${user2}),and(sender_id.eq.${user2},receiver_id.eq.${user1}))`;
      tableName = 'messages';
    } else {
      return;
    }

    console.log(`📡 Setting up real-time subscription`);

    subscriptionRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: tableName,
          filter,
        },
        (payload) => {
          console.log('📨 Real-time: New message received');
          onNewMessage(payload.new as Message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tableName,
          filter,
        },
        (payload) => {
          console.log('Message updated:', payload.new);
          const updatedMessage = payload.new as Message;

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
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: tableName,
          filter,
        },
        (payload) => {
          console.log('Message deleted:', payload.old);
          if (onMessageDelete) {
            onMessageDelete(payload.old.id);
          }
        }
      )
      .subscribe((status, error) => {
        if (error) {
          console.error(`❌ Subscription error:`, error);
        }
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Real-time connected`);
          setConnectionStatus('connected');
          isSubscribedRef.current = true;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`❌ Subscription failed:`, status);
          setConnectionStatus('disconnected');
          isSubscribedRef.current = false;
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
          isSubscribedRef.current = false;
        }
      });
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
          if (payload.new && payload.new.user_id !== userId) {
            onTypingUpdate({
              userId: payload.new.user_id,
              isTyping: payload.new.is_typing,
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
          },
          { onConflict: ['user_id', 'chat_id'] }
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
