import { getServerUrl } from './socketConfig';

interface NotificationData {
  recipient_id: string;
  sender_id: string;
  type: 'like' | 'comment' | 'follow' | 'mention';
  post_id?: string;
  reel_id?: string;
  comment_id?: string;
  message?: string;
  sender?: {
    username: string;
    avatar_url?: string;
  };
}

class SocketNotificationBroadcaster {
  private serverUrl: string;

  constructor() {
    this.serverUrl = getServerUrl();
  }

  /**
   * Broadcast a notification via Socket.IO server
   * This is called after saving the notification to Supabase
   */
  async broadcastNotification(notificationData: NotificationData): Promise<boolean> {
    try {
      console.log('📢 Broadcasting notification via Socket.IO:', {
        type: notificationData.type,
        recipient: notificationData.recipient_id,
        sender: notificationData.sender_id
      });

      const response = await fetch(`${this.serverUrl}/broadcast-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Notification broadcasted successfully:', result);
      return true;

    } catch (error) {
      console.error('❌ Error broadcasting notification:', error);
      // Don't throw - this is a fallback system
      return false;
    }
  }

  /**
   * Broadcast a like notification
   */
  async broadcastLike(
    recipientId: string, 
    senderId: string, 
    postId?: string, 
    reelId?: string,
    senderInfo?: { username: string; avatar_url?: string }
  ): Promise<boolean> {
    return this.broadcastNotification({
      recipient_id: recipientId,
      sender_id: senderId,
      type: 'like',
      post_id: postId,
      reel_id: reelId,
      sender: senderInfo,
    });
  }

  /**
   * Broadcast a comment notification
   */
  async broadcastComment(
    recipientId: string, 
    senderId: string, 
    commentId: string,
    postId?: string, 
    reelId?: string,
    senderInfo?: { username: string; avatar_url?: string }
  ): Promise<boolean> {
    return this.broadcastNotification({
      recipient_id: recipientId,
      sender_id: senderId,
      type: 'comment',
      comment_id: commentId,
      post_id: postId,
      reel_id: reelId,
      sender: senderInfo,
    });
  }

  /**
   * Broadcast a mention notification
   */
  async broadcastMention(
    recipientId: string, 
    senderId: string, 
    postId?: string, 
    reelId?: string,
    senderInfo?: { username: string; avatar_url?: string }
  ): Promise<boolean> {
    return this.broadcastNotification({
      recipient_id: recipientId,
      sender_id: senderId,
      type: 'mention',
      post_id: postId,
      reel_id: reelId,
      sender: senderInfo,
    });
  }

  /**
   * Broadcast a follow notification
   */
  async broadcastFollow(
    recipientId: string, 
    senderId: string,
    senderInfo?: { username: string; avatar_url?: string }
  ): Promise<boolean> {
    return this.broadcastNotification({
      recipient_id: recipientId,
      sender_id: senderId,
      type: 'follow',
      sender: senderInfo,
    });
  }

  /**
   * Check if the Socket.IO server is available
   */
  async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/health`, {
        method: 'GET',
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Socket.IO server health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const socketNotificationBroadcaster = new SocketNotificationBroadcaster();
