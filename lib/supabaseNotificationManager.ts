import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useDispatch } from 'react-redux';
import { supabase } from './supabase';
import { notificationsAPI } from './notificationsApi';

interface NotificationData {
  id: string;
  recipient_id: string;
  sender_id: string;
  type: 'like' | 'comment' | 'follow' | 'mention';
  post_id?: string;
  reel_id?: string;
  comment_id?: string;
  message?: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    username: string;
    avatar_url?: string;
  };
}

// Singleton to prevent multiple notification managers
let activeNotificationManagerUserId: string | null = null;

interface SupabaseNotificationManagerConfig {
  userId: string | null;
  enableRealtime: boolean;
  fallbackPollingInterval: number; // milliseconds
  maxRetries: number;
}

interface SupabaseNotificationManagerReturn {
  isConnected: boolean;
  subscriptionStatus: 'idle' | 'subscribing' | 'subscribed' | 'error';
  lastSyncTime: Date | null;
  syncNotifications: () => Promise<void>;
  forceReconnect: () => void;
  unreadCount: number;
}

export const useSupabaseNotificationManager = (
  config: SupabaseNotificationManagerConfig
): SupabaseNotificationManagerReturn => {
  const dispatch = useDispatch();

  // Create action creators to avoid import issues
  const createSetNotificationsAction = (notifications: any[]) => ({
    type: 'notifications/setNotifications',
    payload: notifications
  });

  const createSetUnreadCountAction = (count: number) => ({
    type: 'notifications/setUnreadCount',
    payload: count
  });

  const createAddNotificationAction = (notification: any) => ({
    type: 'notifications/addNotification',
    payload: notification
  });

  const createUpdateNotificationAction = (notification: any) => ({
    type: 'notifications/updateNotification',
    payload: notification
  });
  const [isConnected, setIsConnected] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'idle' | 'subscribing' | 'subscribed' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const subscriptionRef = useRef<any>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const appState = useRef(AppState.currentState);

  // Sync notifications from Supabase with rate limiting
  const syncNotifications = useCallback(async () => {
    if (!config.userId) return;

    // Rate limiting: prevent sync if called within last 5 seconds
    const now = Date.now();
    const timeSinceLastSync = lastSyncTime ? now - lastSyncTime.getTime() : Infinity;
    if (timeSinceLastSync < 5000) {
      console.log('⏱️ Rate limited: Skipping sync (last sync was', timeSinceLastSync, 'ms ago)');
      return;
    }

    try {
      console.log('🔄 Syncing notifications from Supabase...');
      const notifications = await notificationsAPI.getNotifications(config.userId);

      if (notifications) {
        console.log('🔍 Debug: dispatch =', typeof dispatch);
        console.log('🔍 Debug: setNotifications =', typeof setNotifications);
        console.log('🔍 Debug: setUnreadCount =', typeof setUnreadCount);

        // Safely dispatch Redux actions with error handling
        try {
          if (typeof dispatch === 'function') {
            dispatch(createSetNotificationsAction(notifications));
          } else {
            console.error('❌ Redux dispatch is not available');
          }
        } catch (dispatchError) {
          console.error('❌ Error dispatching setNotifications:', dispatchError);
        }

        setLastSyncTime(new Date());
        retryCountRef.current = 0;

        // Count unread notifications
        const unread = notifications.filter(n => !n.is_read).length;
        setUnreadCount(unread);

        // Also update Redux store to keep it in sync
        try {
          if (typeof dispatch === 'function') {
            dispatch(createSetUnreadCountAction(unread));
          } else {
            console.error('❌ Redux dispatch is not available');
          }
        } catch (dispatchError) {
          console.error('❌ Error dispatching setUnreadCount:', dispatchError);
        }

        console.log(`✅ Synced ${notifications.length} notifications (${unread} unread)`);
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
  }, [config.userId, config.maxRetries, dispatch, lastSyncTime]);

  // Setup real-time subscription
  const setupRealtimeSubscription = useCallback(() => {
    if (!config.userId || !config.enableRealtime) {
      console.log('⚠️ Skipping real-time subscription setup:', {
        userId: config.userId,
        enableRealtime: config.enableRealtime
      });
      return;
    }

    console.log('🔔 Setting up Supabase real-time notification subscription for user:', config.userId);
    setSubscriptionStatus('subscribing');

    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    subscriptionRef.current = supabase
      .channel(`notifications_realtime_${config.userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${config.userId}`,
        },
        async (payload) => {
          console.log('🔔 New notification received:', payload.new);
          
          try {
            // Fetch the complete notification with sender info
            const { data: fullNotification, error } = await supabase
              .from('notifications')
              .select(`
                id,
                type,
                sender_id,
                post_id,
                reel_id,
                comment_id,
                created_at,
                is_read,
                sender:profiles!sender_id (
                  username,
                  avatar_url
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (error) {
              console.error('Error fetching full notification:', error);
              return;
            }

            if (fullNotification) {
              // Add to Redux store
              dispatch(createAddNotificationAction(fullNotification));
              setUnreadCount(prev => {
                const newCount = prev + 1;
                console.log(`🔔 Real-time: Incrementing unread count from ${prev} to ${newCount}`);
                // Keep Redux store in sync
                dispatch(createSetUnreadCountAction(newCount));
                return newCount;
              });

              console.log('✅ Notification added to store');
            }
          } catch (error) {
            console.error('Error processing new notification:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${config.userId}`,
        },
        (payload) => {
          console.log('🔔 Notification updated:', payload.new);
          
          // Update notification in Redux store
          dispatch(createUpdateNotificationAction(payload.new));

          // If notification was marked as read, decrease unread count
          if (payload.new.is_read && !payload.old?.is_read) {
            setUnreadCount(prev => {
              const newCount = Math.max(0, prev - 1);
              // Keep Redux store in sync
              dispatch(createSetUnreadCountAction(newCount));
              return newCount;
            });
          }
        }
      )
      .subscribe((status, error) => {
        console.log('🔔 Notification subscription status:', status);
        
        if (error) {
          console.error('❌ Notification subscription error:', error);
          setSubscriptionStatus('error');
          setIsConnected(false);
        } else if (status === 'SUBSCRIBED') {
          console.log('✅ Notifications real-time subscription active');
          setSubscriptionStatus('subscribed');
          setIsConnected(true);
          retryCountRef.current = 0;
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Notification subscription channel error');
          setSubscriptionStatus('error');
          setIsConnected(false);
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Notification subscription timed out');
          setSubscriptionStatus('error');
          setIsConnected(false);
        }
      });

  }, [config.userId, config.enableRealtime, dispatch]);

  // Force reconnection
  const forceReconnect = useCallback(() => {
    console.log('🔄 Force reconnecting notification subscription...');
    setIsConnected(false);
    setSubscriptionStatus('idle');
    setupRealtimeSubscription();
  }, [setupRealtimeSubscription]);

  // Setup fallback polling
  const setupFallbackPolling = useCallback(() => {
    if (!config.enableRealtime || !config.fallbackPollingInterval) return;

    console.log(`⏰ Setting up fallback polling every ${config.fallbackPollingInterval}ms`);
    
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
    }

    fallbackIntervalRef.current = setInterval(() => {
      if (!isConnected) {
        console.log('📡 Fallback polling: syncing notifications...');
        syncNotifications();
      }
    }, config.fallbackPollingInterval);

  }, [config.enableRealtime, config.fallbackPollingInterval, isConnected, syncNotifications]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('📱 App state changed:', appState.current, '->', nextAppState);
      
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - sync notifications and reconnect if needed
        console.log('📱 App became active - syncing notifications');
        syncNotifications();
        
        if (!isConnected && config.enableRealtime) {
          forceReconnect();
        }
      }
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isConnected, config.enableRealtime, syncNotifications, forceReconnect]);

  // Initialize
  useEffect(() => {
    console.log('🚀 Initializing notification manager:', {
      userId: config.userId,
      enableRealtime: config.enableRealtime
    });

    if (config.userId) {
      // Check for singleton - prevent multiple managers for the same user
      if (activeNotificationManagerUserId === config.userId) {
        console.log('⚠️ Notification manager already active for this user, skipping initialization');
        return;
      }

      // Set this as the active manager
      activeNotificationManagerUserId = config.userId;
      console.log('✅ Set as active notification manager for user:', config.userId);

      // Initial sync
      console.log('📥 Starting initial notification sync...');
      syncNotifications();

      // Setup real-time subscription
      if (config.enableRealtime) {
        console.log('🔔 Setting up real-time subscription...');
        setupRealtimeSubscription();
      }

      // Setup fallback polling
      setupFallbackPolling();
    } else {
      console.log('⚠️ No userId provided, skipping notification manager initialization');
    }

    return () => {
      // Cleanup
      console.log('🧹 Cleaning up notification manager for user:', config.userId);

      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }

      // Reset singleton if this was the active manager
      if (activeNotificationManagerUserId === config.userId) {
        activeNotificationManagerUserId = null;
        console.log('✅ Reset active notification manager');
      }
    };
  }, [config.userId, config.enableRealtime, syncNotifications, setupRealtimeSubscription, setupFallbackPolling]);

  return {
    isConnected,
    subscriptionStatus,
    lastSyncTime,
    syncNotifications,
    forceReconnect,
    unreadCount,
  };
};

// Notification creation and broadcasting using Supabase real-time
export class SupabaseNotificationBroadcaster {
  /**
   * Create and broadcast a notification using Supabase real-time
   */
  static async createAndBroadcastNotification(
    recipientId: string,
    senderId: string,
    type: 'like' | 'comment' | 'follow' | 'mention',
    postId?: string,
    reelId?: string,
    commentId?: string
  ): Promise<boolean> {
    try {
      console.log('📢 Creating notification via Supabase:', {
        type,
        recipient: recipientId,
        sender: senderId
      });

      // Determine if this is a post comment or reel comment
      const isPostComment = postId && commentId;
      const isReelComment = reelId && commentId;

      // Create notification in Supabase - this will trigger real-time updates automatically
      const notification = await notificationsAPI.createNotification(
        recipientId,
        type,
        senderId,
        postId,
        reelId,
        isPostComment ? commentId : undefined,
        isReelComment ? commentId : undefined
      );

      if (notification) {
        console.log('✅ Notification created successfully - real-time broadcast automatic');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      return false;
    }
  }

  /**
   * Broadcast a like notification
   */
  static async broadcastLike(
    recipientId: string, 
    senderId: string, 
    postId?: string, 
    reelId?: string
  ): Promise<boolean> {
    return this.createAndBroadcastNotification(
      recipientId,
      senderId,
      'like',
      postId,
      reelId
    );
  }

  /**
   * Broadcast a comment notification
   */
  static async broadcastComment(
    recipientId: string,
    senderId: string,
    commentId: string,
    postId?: string,
    reelId?: string
  ): Promise<boolean> {
    return this.createAndBroadcastNotification(
      recipientId,
      senderId,
      'comment',
      postId,
      reelId,
      commentId
    );
  }

  /**
   * Broadcast a mention notification
   */
  static async broadcastMention(
    recipientId: string, 
    senderId: string, 
    postId?: string, 
    reelId?: string
  ): Promise<boolean> {
    return this.createAndBroadcastNotification(
      recipientId,
      senderId,
      'mention',
      postId,
      reelId
    );
  }

  /**
   * Broadcast a follow notification
   */
  static async broadcastFollow(
    recipientId: string, 
    senderId: string
  ): Promise<boolean> {
    return this.createAndBroadcastNotification(
      recipientId,
      senderId,
      'follow'
    );
  }
}

// Export singleton instance
export const supabaseNotificationBroadcaster = new SupabaseNotificationBroadcaster();
