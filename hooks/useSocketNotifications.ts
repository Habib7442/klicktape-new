import { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState, AppStateStatus } from 'react-native';
import { Socket } from 'socket.io-client';
import { getSocketInstance, disconnectSocket, smartReconnect } from '@/lib/socketConfig';
import { RootState } from '@/src/store/store';
import { incrementUnreadCount, addNotification } from '@/src/store/slices/notificationSlice';

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

interface UseSocketNotificationsReturn {
  isConnected: boolean;
  connectionError: string | null;
  subscriptionStatus: 'idle' | 'subscribing' | 'subscribed' | 'error';
  reconnect: () => void;
  disconnect: () => void;
}

export const useSocketNotifications = (userId: string | null): UseSocketNotificationsReturn => {
  const dispatch = useDispatch();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'idle' | 'subscribing' | 'subscribed' | 'error'>('idle');
  
  // Get current app state for background/foreground handling
  const appState = useRef(AppState.currentState);

  const handleNewNotification = useCallback((notificationData: NotificationData) => {
    console.log('🔔 Received real-time notification:', notificationData);
    
    // Add to Redux store
    dispatch(addNotification(notificationData));
    dispatch(incrementUnreadCount());
    
    // You can add additional handling here like:
    // - Show local push notification
    // - Play notification sound
    // - Update badge count
    
  }, [dispatch]);

  const connectSocket = useCallback(() => {
    if (!userId) {
      console.log('⚠️ No userId provided, skipping socket connection');
      return;
    }

    try {
      console.log('🔌 Connecting to Socket.IO server...');
      setConnectionError(null);
      
      const socket = getSocketInstance();
      socketRef.current = socket;

      // Connection event handlers
      socket.on('connect', () => {
        console.log('✅ Socket connected:', socket.id);
        setIsConnected(true);
        setConnectionError(null);
        
        // Subscribe to notifications
        setSubscriptionStatus('subscribing');
        socket.emit('subscribe_notifications', { userId });
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        setIsConnected(false);
        setSubscriptionStatus('idle');
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        setIsConnected(false);
        setConnectionError(error.message);
        setSubscriptionStatus('error');
      });

      // Notification-specific event handlers
      socket.on('notification_subscription_confirmed', ({ userId: confirmedUserId }) => {
        console.log('✅ Notification subscription confirmed for user:', confirmedUserId);
        setSubscriptionStatus('subscribed');
      });

      socket.on('new_notification', handleNewNotification);

      // Connect the socket
      socket.connect();
      
    } catch (error) {
      console.error('❌ Error setting up socket connection:', error);
      setConnectionError(error instanceof Error ? error.message : 'Unknown error');
      setSubscriptionStatus('error');
    }
  }, [userId, handleNewNotification]);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Disconnecting socket notifications');
      
      // Unsubscribe from notifications
      if (userId) {
        socketRef.current.emit('unsubscribe_notifications', { userId });
      }
      
      // Remove event listeners
      socketRef.current.off('connect');
      socketRef.current.off('disconnect');
      socketRef.current.off('connect_error');
      socketRef.current.off('notification_subscription_confirmed');
      socketRef.current.off('new_notification');
      
      // Disconnect
      socketRef.current.disconnect();
      socketRef.current = null;
      
      setIsConnected(false);
      setSubscriptionStatus('idle');
    }
  }, [userId]);

  const reconnect = useCallback(() => {
    console.log('🔄 Smart reconnecting socket...');
    smartReconnect(); // Use battery-optimized reconnection
  }, []);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('📱 App state changed:', appState.current, '->', nextAppState);
      
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - reconnect if needed
        console.log('📱 App came to foreground, checking socket connection');
        if (!isConnected && userId) {
          reconnect();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background - keep connection but reduce activity
        console.log('📱 App went to background, maintaining socket connection');
      }
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isConnected, userId, reconnect]);

  // Initial connection and cleanup
  useEffect(() => {
    if (userId) {
      connectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [userId, connectSocket, disconnectSocket]);

  return {
    isConnected,
    connectionError,
    subscriptionStatus,
    reconnect,
    disconnect: disconnectSocket,
  };
};
