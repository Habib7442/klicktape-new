import { supabase } from '@/lib/supabase';
import { messagesAPI } from '@/lib/messagesApi';

export class MessageStatusManager {
  private static instance: MessageStatusManager;
  private userId: string | null = null;
  private deliveryCheckInterval: NodeJS.Timeout | null = null;
  private pendingDeliveries = new Set<string>();

  private constructor() {}

  static getInstance(): MessageStatusManager {
    if (!MessageStatusManager.instance) {
      MessageStatusManager.instance = new MessageStatusManager();
    }
    return MessageStatusManager.instance;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  // Mark messages as delivered when user opens the chat
  async markMessagesAsDelivered(senderId: string, receiverId: string) {
    if (!this.userId || this.userId !== receiverId) return null;

    try {
      // Get undelivered messages from the sender
      const { data: messages, error } = await supabase
        .from('messages')
        .select('id, status')
        .eq('sender_id', senderId)
        .eq('receiver_id', receiverId)
        .eq('status', 'sent');

      if (error) throw error;

      const updatedMessages = [];

      // Mark each message as delivered
      for (const message of messages) {
        if (!this.pendingDeliveries.has(message.id)) {
          this.pendingDeliveries.add(message.id);
          const updatedMessage = await messagesAPI.markAsDelivered(message.id);
          if (updatedMessage) {
            updatedMessages.push(updatedMessage);
          }
          this.pendingDeliveries.delete(message.id);
        }
      }

      return updatedMessages;
    } catch (error) {
      console.error('Error marking messages as delivered:', error);
      return null;
    }
  }

  // Mark messages as read when user views them
  async markMessagesAsRead(senderId: string, receiverId: string) {
    if (!this.userId || this.userId !== receiverId) return null;

    try {
      const data = await messagesAPI.markConversationAsRead(receiverId, senderId);
      console.log(`Marked ${data?.length || 0} messages as read`);
      return data;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return null;
    }
  }

  // Auto-mark single message as read
  async markSingleMessageAsRead(messageId: string) {
    if (!this.userId) return;

    try {
      return await messagesAPI.markAsRead(messageId, this.userId);
    } catch (error) {
      console.error('Error marking single message as read:', error);
    }
  }

  // Start periodic delivery check for active chats
  startDeliveryTracking() {
    if (this.deliveryCheckInterval) return;

    this.deliveryCheckInterval = setInterval(async () => {
      if (!this.userId) return;

      try {
        // Check for messages that should be marked as delivered
        const { data: undeliveredMessages, error } = await supabase
          .from('messages')
          .select('id, sender_id')
          .eq('receiver_id', this.userId)
          .eq('status', 'sent')
          .limit(50);

        if (error) throw error;

        // Mark them as delivered
        for (const message of undeliveredMessages) {
          if (!this.pendingDeliveries.has(message.id)) {
            this.pendingDeliveries.add(message.id);
            await messagesAPI.markAsDelivered(message.id);
            this.pendingDeliveries.delete(message.id);
          }
        }
      } catch (error) {
        console.error('Error in delivery tracking:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  stopDeliveryTracking() {
    if (this.deliveryCheckInterval) {
      clearInterval(this.deliveryCheckInterval);
      this.deliveryCheckInterval = null;
    }
  }

  // Clean up
  cleanup() {
    this.stopDeliveryTracking();
    this.pendingDeliveries.clear();
    this.userId = null;
  }
}

export const messageStatusManager = MessageStatusManager.getInstance();
