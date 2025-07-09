// Import polyfill for React Native
import 'react-native-get-random-values';
import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  status: 'sent' | 'delivered' | 'read';
}

interface TypingData {
  userId: string;
  chatId: string;
  isTyping: boolean;
}

interface MessageStatusUpdate {
  messageId: string;
  status: 'sent' | 'delivered' | 'read';
  isRead: boolean;
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private currentServerUrl: string = '';
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;

  // Event listeners
  private messageListeners: ((message: Message) => void)[] = [];
  private typingListeners: ((data: TypingData) => void)[] = [];
  private statusListeners: ((data: MessageStatusUpdate) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];

  constructor() {
    this.connect();
  }

  private connect(customUrl?: string) {
    try {
      // Get all possible URLs
      const getAllUrls = () => {
        const urls = [];

        // Check for environment variable first
        const SERVER_URL = process.env.EXPO_PUBLIC_SOCKET_SERVER_URL;
        if (SERVER_URL) {
          urls.push(SERVER_URL);
        }

        if (Platform.OS === 'android') {
          urls.push('http://10.0.2.2:3000');
          urls.push('http://192.168.52.201:3000');
          urls.push('http://localhost:3000');
        } else if (Platform.OS === 'ios') {
          urls.push('http://localhost:3000');
          urls.push('http://10.0.2.2:3000');
          urls.push('http://192.168.52.201:3000');
        } else {
          urls.push('http://localhost:3000');
          urls.push('http://192.168.52.201:3000');
        }

        return urls;
      };

      const allUrls = getAllUrls();
      const serverUrl = customUrl || allUrls[this.connectionAttempts] || allUrls[0];
      this.currentServerUrl = serverUrl;

      console.log(`🔗 Connecting to Socket.IO server: ${serverUrl} (Attempt ${this.connectionAttempts + 1}/${this.maxConnectionAttempts})`);

      // Disconnect existing socket if any
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      // React Native compatible Socket.IO configuration
      this.socket = io(serverUrl, {
        transports: ['polling', 'websocket'], // Allow both transports
        autoConnect: true,
        reconnection: false, // We'll handle reconnection manually
        timeout: 8000, // Reduced timeout for faster failover
        forceNew: true, // Force new connection for each attempt
        upgrade: true, // Allow transport upgrades
        rememberUpgrade: false, // Don't remember upgrade for React Native
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('Socket connection error:', error);
      this.tryNextUrl();
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', this.socket?.id);
      console.log('🌐 Connected to server:', this.currentServerUrl);
      this.isConnected = true;
      this.connectionAttempts = 0; // Reset attempts on successful connection
      this.notifyConnectionListeners(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      this.isConnected = false;
      this.notifyConnectionListeners(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      this.isConnected = false;
      this.notifyConnectionListeners(false);

      // Log specific error details for debugging
      if (error.message) {
        console.error('Error message:', error.message);
      }
      if (error.description) {
        console.error('Error description:', error.description);
      }
      if (error.context) {
        console.error('Error context:', error.context);
      }

      // Try next URL after a short delay
      setTimeout(() => {
        this.tryNextUrl();
      }, 1000);
    });

    // Listen for new messages
    this.socket.on('new_message', (message: Message) => {
      console.log('📨 New message received via Socket.IO:', message.id);
      this.notifyMessageListeners(message);
    });

    // Listen for message status updates
    this.socket.on('message_status_update', (data: MessageStatusUpdate) => {
      console.log('📊 Message status update:', data);
      this.notifyStatusListeners(data);
    });

    // Listen for typing indicators
    this.socket.on('typing_update', (data: TypingData) => {
      console.log('⌨️ Typing update:', data);
      this.notifyTypingListeners(data);
    });
  }

  private tryNextUrl() {
    this.connectionAttempts++;

    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      console.error('❌ All connection attempts failed. Resetting...');
      this.connectionAttempts = 0;

      // Wait longer before trying again
      setTimeout(() => {
        console.log('🔄 Restarting connection attempts...');
        this.connect();
      }, 5000);
      return;
    }

    console.log(`🔄 Trying next URL (${this.connectionAttempts + 1}/${this.maxConnectionAttempts})`);
    this.connect();
  }

  // Join a chat room
  joinChat(userId: string, chatId: string) {
    if (this.socket && this.isConnected) {
      console.log(`🏠 Joining chat room: ${chatId}`);
      this.socket.emit('join_chat', { userId, chatId });
    } else {
      console.log('⏳ Socket not connected, will join chat when connected');
      // Retry when connected
      setTimeout(() => {
        if (this.socket && this.isConnected) {
          this.joinChat(userId, chatId);
        }
      }, 1000);
    }
  }

  // Leave a chat room
  leaveChat(chatId: string) {
    if (this.socket && this.isConnected) {
      console.log(`🚪 Leaving chat room: ${chatId}`);
      this.socket.emit('leave_chat', { chatId });
    }
  }

  // Send a message
  sendMessage(message: Message) {
    console.log('🔍 sendMessage called with:', {
      messageId: message.id,
      hasSocket: !!this.socket,
      isConnected: this.isConnected,
      socketConnected: this.socket?.connected,
      currentUrl: this.currentServerUrl
    });

    if (this.socket && this.isConnected) {
      console.log('📤 Sending message via Socket.IO:', message.id);
      console.log('📤 Message content:', message.content);
      this.socket.emit('send_message', message);
    } else {
      console.error('❌ Cannot send message: Socket not connected');
      console.error('❌ Debug info:', {
        hasSocket: !!this.socket,
        isConnected: this.isConnected,
        socketConnected: this.socket?.connected
      });
      throw new Error('Socket not connected');
    }
  }

  // Send typing status
  sendTypingStatus(data: TypingData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing_status', data);
    }
  }

  // Update message status (delivered/read)
  updateMessageStatus(data: MessageStatusUpdate) {
    if (this.socket && this.isConnected) {
      this.socket.emit('message_status', data);
    }
  }

  // Event listener management
  onMessage(callback: (message: Message) => void) {
    this.messageListeners.push(callback);
    return () => {
      this.messageListeners = this.messageListeners.filter(cb => cb !== callback);
    };
  }

  onTyping(callback: (data: TypingData) => void) {
    this.typingListeners.push(callback);
    return () => {
      this.typingListeners = this.typingListeners.filter(cb => cb !== callback);
    };
  }

  onStatusUpdate(callback: (data: MessageStatusUpdate) => void) {
    this.statusListeners.push(callback);
    return () => {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    };
  }

  onConnectionChange(callback: (connected: boolean) => void) {
    this.connectionListeners.push(callback);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(cb => cb !== callback);
    };
  }

  // Notify listeners
  private notifyMessageListeners(message: Message) {
    this.messageListeners.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in message listener:', error);
      }
    });
  }

  private notifyTypingListeners(data: TypingData) {
    this.typingListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in typing listener:', error);
      }
    });
  }

  private notifyStatusListeners(data: MessageStatusUpdate) {
    this.statusListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in status listener:', error);
      }
    });
  }

  private notifyConnectionListeners(connected: boolean) {
    this.connectionListeners.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  // Utility methods
  isSocketConnected(): boolean {
    const result = this.isConnected && this.socket?.connected === true;
    console.log('🔍 isSocketConnected check:', {
      isConnected: this.isConnected,
      socketConnected: this.socket?.connected,
      result
    });
    return result;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Manual reconnection
  reconnect() {
    console.log('🔄 Manual reconnection triggered');
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.connectionAttempts = 0; // Reset attempts
    this.connect();
  }

  // Force connection check
  checkConnection() {
    if (this.socket) {
      console.log('🔍 Connection check - Socket connected:', this.socket.connected);
      console.log('🔍 Connection check - Internal connected:', this.isConnected);
      return this.socket.connected;
    }
    return false;
  }

  // Cleanup
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting Socket.IO');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
