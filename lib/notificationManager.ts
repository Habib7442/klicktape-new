import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useDispatch } from 'react-redux';
import { notificationsAPI } from './notificationsApi';
import { socketNotificationBroadcaster } from './socketNotificationBroadcaster';
import { useSocketNotifications } from '@/hooks/useSocketNotifications';
import { setNotifications, incrementUnreadCount } from '@/src/store/slices/notificationSlice';

interface NotificationManagerConfig {
  userId: string | null;
  enableRealtime: boolean;
  fallbackPollingInterval: number; // milliseconds
  maxRetries: number;
}

interface NotificationManagerReturn {
  isOnline: boolean;
  isSocketConnected: boolean;
  lastSyncTime: Date | null;
  syncNotifications: () => Promise<void>;
  forceReconnect: () => void;
}

export const useNotificationManager = (config: NotificationManagerConfig): NotificationManagerReturn => {
  const dispatch = useDispatch();
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  // Socket.IO real-time notifications
  const {
    isConnected: isSocketConnected,
    connectionError,
    subscriptionStatus,
    reconnect: reconnectSocket,
  } = useSocketNotifications(config.userId);

  // Simple network state monitoring (assume online by default)
  // In a production app, you could add proper network detection here
  useEffect(() => {
    // For now, assume we're always online
    // You can add proper network detection later if needed
    setIsOnline(true);
  }, []);

  // Sync notifications from Supabase (fallback mechanism with throttling)
  const syncNotifications = useCallback(async () => {
    if (!config.userId || !isOnline) {
      console.log('⚠️ Cannot sync notifications: no user or offline');
      return;
    }

    // Throttle API calls - don't sync if we synced recently (within 30 seconds)
    const timeSinceLastSync = lastSyncTime ? Date.now() - lastSyncTime.getTime() : Infinity;
    if (timeSinceLastSync < 30000) {
      console.log('⏱️ Skipping sync - too recent (throttled)');
      return;
    }

    try {
      console.log('🔄 Syncing notifications from Supabase...');
      const notifications = await notificationsAPI.getNotifications(config.userId);

      if (notifications) {
        dispatch(setNotifications(notifications));
        setLastSyncTime(new Date());
        retryCountRef.current = 0; // Reset retry count on success
        console.log(`✅ Synced ${notifications.length} notifications`);
      }
    } catch (error) {
      console.error('❌ Error syncing notifications:', error);
      retryCountRef.current++;

      // Exponential backoff for retries
      if (retryCountRef.current < config.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        console.log(`🔄 Retrying sync in ${delay}ms (attempt ${retryCountRef.current})`);
        setTimeout(syncNotifications, delay);
      }
    }
  }, [config.userId, config.maxRetries, isOnline, dispatch, lastSyncTime]);

  // Optimized fallback polling - only when Socket.IO is not connected
  useEffect(() => {
    if (!config.enableRealtime || !config.userId) {
      return;
    }

    // Only start polling if Socket.IO is disconnected AND we haven't synced recently
    const timeSinceLastSync = lastSyncTime ? Date.now() - lastSyncTime.getTime() : Infinity;
    const shouldStartPolling = !isSocketConnected && isOnline && timeSinceLastSync > config.fallbackPollingInterval;

    if (shouldStartPolling) {
      console.log('🔄 Socket.IO not connected, starting optimized fallback polling...');

      // Start fallback polling with longer intervals
      fallbackIntervalRef.current = setInterval(() => {
        // Only sync if Socket.IO is still not connected
        if (!isSocketConnected) {
          syncNotifications();
        }
      }, config.fallbackPollingInterval);
    } else {
      // Stop fallback polling when Socket.IO is connected or we synced recently
      if (fallbackIntervalRef.current) {
        console.log('✅ Stopping fallback polling - Socket.IO connected or recent sync');
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
    }

    return () => {
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
    };
  }, [isSocketConnected, isOnline, config.enableRealtime, config.userId, config.fallbackPollingInterval, lastSyncTime]);

  // App state change handling
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground - sync notifications
        console.log('📱 App became active, syncing notifications...');
        syncNotifications();
        
        // Try to reconnect Socket.IO if needed
        if (!isSocketConnected && isOnline) {
          console.log('📱 Attempting to reconnect Socket.IO...');
          reconnectSocket();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isSocketConnected, isOnline, syncNotifications, reconnectSocket]);

  // Initial sync when user changes (only once per user session)
  useEffect(() => {
    if (config.userId && isOnline && !lastSyncTime) {
      console.log('🔄 Initial notification sync for user:', config.userId);
      syncNotifications();
    }
  }, [config.userId, isOnline, lastSyncTime]);

  // Force reconnect function
  const forceReconnect = useCallback(() => {
    console.log('🔄 Force reconnecting Socket.IO...');
    reconnectSocket();
    
    // Also sync notifications
    if (isOnline) {
      syncNotifications();
    }
  }, [reconnectSocket, isOnline, syncNotifications]);

  return {
    isOnline,
    isSocketConnected,
    lastSyncTime,
    syncNotifications,
    forceReconnect,
  };
};

// Notification creation with dual system (Supabase + Socket.IO)
export class DualNotificationSystem {
  static async createAndBroadcastNotification(
    recipientId: string,
    senderId: string,
    type: 'like' | 'comment' | 'follow' | 'mention',
    postId?: string,
    reelId?: string,
    commentId?: string,
    senderInfo?: { username: string; avatar_url?: string }
  ): Promise<boolean> {
    try {
      // 1. Save to Supabase (primary storage)
      await notificationsAPI.createNotification(
        recipientId,
        type,
        senderId,
        postId,
        reelId,
        commentId
      );

      // 2. Broadcast via Socket.IO (real-time delivery)
      let broadcastSuccess = false;
      try {
        switch (type) {
          case 'like':
            broadcastSuccess = await socketNotificationBroadcaster.broadcastLike(
              recipientId, senderId, postId, reelId, senderInfo
            );
            break;
          case 'comment':
            if (commentId) {
              broadcastSuccess = await socketNotificationBroadcaster.broadcastComment(
                recipientId, senderId, commentId, postId, reelId, senderInfo
              );
            }
            break;
          case 'mention':
            broadcastSuccess = await socketNotificationBroadcaster.broadcastMention(
              recipientId, senderId, postId, reelId, senderInfo
            );
            break;
          case 'follow':
            broadcastSuccess = await socketNotificationBroadcaster.broadcastFollow(
              recipientId, senderId, senderInfo
            );
            break;
        }
      } catch (broadcastError) {
        console.error('❌ Socket.IO broadcast failed:', broadcastError);
        // Don't fail the entire operation if broadcasting fails
      }

      console.log(`✅ Notification created: ${type} | Broadcast: ${broadcastSuccess ? 'Success' : 'Failed'}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to create notification:', error);
      return false;
    }
  }
}
