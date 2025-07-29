import { useEffect, useState, useCallback, useRef } from 'react';
import socketService from '@/lib/socketService';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  status: 'sent' | 'delivered' | 'read';
  message_type?: 'text' | 'shared_post' | 'shared_reel';
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

interface UseSocketChatProps {
  userId: string;
  chatId: string;
  onNewMessage?: (message: Message) => void;
  onMessageStatusUpdate?: (data: { messageId: string; status: string; isRead: boolean }) => void;
  onTypingUpdate?: (data: { userId: string; isTyping: boolean }) => void;
  onNewReaction?: (data: { messageId: string; reaction: Reaction }) => void;
  onReactionRemoved?: (data: { messageId: string; reactionId: string; userId: string }) => void;
}

export const useSocketChat = ({
  userId,
  chatId,
  onNewMessage,
  onMessageStatusUpdate,
  onTypingUpdate,
  onNewReaction,
  onReactionRemoved,
}: UseSocketChatProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const hasJoinedRoom = useRef(false);

  // Join chat room when component mounts and socket connects
  useEffect(() => {
    if (userId && chatId && isConnected && !hasJoinedRoom.current) {
      console.log(`🏠 Joining chat room: ${chatId}`);
      socketService.joinChat(userId, chatId);
      hasJoinedRoom.current = true;
    }

    return () => {
      if (chatId && hasJoinedRoom.current) {
        console.log(`🚪 Leaving chat room: ${chatId}`);
        socketService.leaveChat(chatId);
        hasJoinedRoom.current = false;
      }
    };
  }, [userId, chatId, isConnected]);

  // Set up message listener
  useEffect(() => {
    if (!onNewMessage) return;

    const unsubscribe = socketService.onMessage((message: Message) => {
      // Only handle messages for this chat
      const messageChatId = [message.sender_id, message.receiver_id].sort().join('-');
      if (messageChatId === chatId) {
        console.log('📨 Received message for this chat:', message.id);
        onNewMessage(message);
      }
    });

    return unsubscribe;
  }, [chatId, onNewMessage]);

  // Set up status update listener
  useEffect(() => {
    if (!onMessageStatusUpdate) return;

    const unsubscribe = socketService.onStatusUpdate((data) => {
      console.log('📊 Status update received:', data);
      onMessageStatusUpdate(data);
    });

    return unsubscribe;
  }, [onMessageStatusUpdate]);

  // Set up typing listener
  useEffect(() => {
    if (!onTypingUpdate) return;

    const unsubscribe = socketService.onTyping((data) => {
      // Only handle typing for this chat
      if (data.chatId === chatId && data.userId !== userId) {
        console.log('⌨️ Typing update for this chat:', data);
        onTypingUpdate({
          userId: data.userId,
          isTyping: data.isTyping,
        });
      }
    });

    return unsubscribe;
  }, [chatId, userId, onTypingUpdate]);

  // Set up reaction listeners
  useEffect(() => {
    if (!onNewReaction) return;

    const unsubscribe = socketService.onReaction((data) => {
      console.log('😀 Reaction received:', data);
      onNewReaction(data);
    });

    return unsubscribe;
  }, [onNewReaction]);

  useEffect(() => {
    if (!onReactionRemoved) return;

    const unsubscribe = socketService.onReactionRemoved((data) => {
      console.log('😐 Reaction removed:', data);
      onReactionRemoved(data);
    });

    return unsubscribe;
  }, [onReactionRemoved]);

  // Set up connection status listener
  useEffect(() => {
    const unsubscribe = socketService.onConnectionChange((connected) => {
      console.log('🔗 Connection status changed:', connected);
      setIsConnected(connected);
      setConnectionStatus(connected ? 'connected' : 'disconnected');
      
      // Reset room join status when disconnected
      if (!connected) {
        hasJoinedRoom.current = false;
      }
    });

    // Set initial connection status
    const initiallyConnected = socketService.isSocketConnected();
    setIsConnected(initiallyConnected);
    setConnectionStatus(initiallyConnected ? 'connected' : 'connecting');

    return unsubscribe;
  }, []);

  // Send message function
  const sendMessage = useCallback((message: Omit<Message, 'id' | 'created_at' | 'status'>) => {
    console.log('🔍 useSocketChat sendMessage called with:', {
      sender_id: message.sender_id,
      receiver_id: message.receiver_id,
      content: message.content,
      isConnected,
      connectionStatus
    });

    const fullMessage: Message = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      status: 'sent',
    };

    try {
      console.log('📤 Sending message via Socket.IO:', fullMessage.id);
      console.log('📤 Full message object:', fullMessage);
      socketService.sendMessage(fullMessage);
      return fullMessage;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }, [isConnected, connectionStatus]);

  // Send typing status function
  const sendTypingStatus = useCallback((isTyping: boolean) => {
    try {
      socketService.sendTypingStatus({
        userId,
        chatId,
        isTyping,
      });
    } catch (error) {
      console.error('❌ Failed to send typing status:', error);
    }
  }, [userId, chatId]);

  // Mark message as delivered
  const markAsDelivered = useCallback((messageId: string) => {
    try {
      socketService.updateMessageStatus({
        messageId,
        status: 'delivered',
        isRead: false,
      });
    } catch (error) {
      console.error('❌ Failed to mark as delivered:', error);
    }
  }, []);

  // Mark message as read
  const markAsRead = useCallback((messageId: string) => {
    try {
      socketService.updateMessageStatus({
        messageId,
        status: 'read',
        isRead: true,
      });
    } catch (error) {
      console.error('❌ Failed to mark as read:', error);
    }
  }, []);

  return {
    isConnected,
    connectionStatus,
    sendMessage,
    sendTypingStatus,
    markAsDelivered,
    markAsRead,
    socketId: socketService.getSocketId(),
  };
};
