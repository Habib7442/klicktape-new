import socketService from '@/lib/socketService';

export const testSocketConnection = () => {
  console.log('🧪 Testing Socket.IO connection...');

  // Test connection status
  const isConnected = socketService.isSocketConnected();
  console.log('🔗 Socket connected:', isConnected);

  if (isConnected) {
    console.log('✅ Socket.IO is working!');
    console.log('🆔 Socket ID:', socketService.getSocketId());
  } else {
    console.log('❌ Socket.IO not connected');
    console.log('🔄 Attempting manual reconnection...');
    socketService.reconnect();
  }

  // Force connection check
  setTimeout(() => {
    const connectionStatus = socketService.checkConnection();
    console.log('🔍 Connection check result:', connectionStatus);
  }, 2000);

  // Test message listener
  const unsubscribe = socketService.onMessage((message) => {
    console.log('🧪 Test: Received message:', message);
  });

  // Test connection listener
  const unsubscribeConnection = socketService.onConnectionChange((connected) => {
    console.log('🧪 Test: Connection changed:', connected);
    if (connected) {
      console.log('✅ Socket.IO connection restored!');
    }
  });
  
  // Cleanup function
  return () => {
    unsubscribe();
    unsubscribeConnection();
  };
};

export const sendTestMessage = (senderId: string, receiverId: string) => {
  const testMessage = {
    id: `test_${Date.now()}`,
    sender_id: senderId,
    receiver_id: receiverId,
    content: `Test message at ${new Date().toLocaleTimeString()}`,
    created_at: new Date().toISOString(),
    is_read: false,
    status: 'sent' as const,
  };
  
  try {
    socketService.sendMessage(testMessage);
    console.log('🧪 Test message sent:', testMessage.id);
    return testMessage;
  } catch (error) {
    console.error('🧪 Test message failed:', error);
    throw error;
  }
};
