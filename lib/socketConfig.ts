import { io, Socket } from 'socket.io-client';
import { Platform, AppState } from 'react-native';

// Mobile-optimized Socket.IO configuration
const SOCKET_CONFIG = {
  transports: ['polling', 'websocket'], // Start with polling for React Native
  timeout: 20000, // Increased timeout for better connectivity
  forceNew: false, // Reuse connections for better performance
  reconnection: true,
  reconnectionDelay: 3000, // Increased delay to save battery
  reconnectionDelayMax: 15000,
  reconnectionAttempts: 5, // More attempts for better reliability
  maxReconnectionAttempts: 5,
  autoConnect: true, // Auto connect for better UX

  // Mobile performance optimizations
  compression: false, // Disable compression for debugging
  upgrade: true,
  rememberUpgrade: false, // Don't remember for debugging
  multiplex: true, // Share connections

  // Additional debugging options
  forceBase64: false,
  enablesXDR: false,
};

const SERVER_URL = process.env.EXPO_PUBLIC_SOCKET_SERVER_URL;
// Get the appropriate server URL based on platform
const getServerUrl = (): string => {
  if (__DEV__) {
    // Development URLs
    if (Platform.OS === 'android') {
      // Try multiple Android connection options
      // For physical device, use your computer's IP address
      // For emulator, use 10.0.2.2
      return 'http://192.168.31.241:3001'; // Use the Wi-Fi IP from your server log
    } else {
      return 'http://localhost:3001'; // iOS simulator
    }
  } else {
    // Production URL - replace with your actual server URL
    return SERVER_URL;
  }
};

// Singleton socket instance and connection tracking
let socketInstance: Socket | null = null;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

export const getSocketInstance = (): Socket => {
  if (!socketInstance) {
    const serverUrl = getServerUrl();
    console.log('🔌 Creating Socket.IO instance:', serverUrl);
    console.log('🔧 Socket config:', SOCKET_CONFIG);

    socketInstance = io(serverUrl, SOCKET_CONFIG);
    
    // Mobile-optimized event handling
    socketInstance.on('connect', () => {
      connectionAttempts = 0; // Reset on successful connection
      console.log('📱 Socket connected (mobile optimized):', socketInstance?.id);
    });

    socketInstance.on('connect_error', (error) => {
      connectionAttempts++;
      console.log(`📱 Socket connection error (attempt ${connectionAttempts}):`, error.message);

      // Stop trying after max attempts to save battery
      if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
        console.log('📱 Max connection attempts reached, stopping reconnection');
        socketInstance?.disconnect();
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('📱 Socket disconnected:', reason);

      // Don't auto-reconnect if app is in background to save battery
      if (AppState.currentState !== 'active' && reason === 'transport close') {
        console.log('📱 App in background, not reconnecting to save battery');
        socketInstance?.disconnect();
      }
    });
  }
  
  return socketInstance;
};

export const disconnectSocket = (): void => {
  if (socketInstance) {
    console.log('🔌 Disconnecting socket');
    socketInstance.disconnect();
    socketInstance = null;
    connectionAttempts = 0;
  }
};

// Battery-optimized reconnection
export const smartReconnect = (): void => {
  if (AppState.currentState === 'active') {
    connectionAttempts = 0; // Reset attempts for manual reconnection
    if (socketInstance) {
      socketInstance.connect();
    } else {
      getSocketInstance();
    }
  } else {
    console.log('📱 App not active, skipping reconnection to save battery');
  }
};

export { SOCKET_CONFIG, getServerUrl };
