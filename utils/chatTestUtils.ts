import { supabase } from '@/lib/supabase';
import { messagesAPI } from '@/lib/messagesApi';
import { chatDebug } from './chatDebug';

/**
 * Chat Testing Utilities
 * Comprehensive testing tools for chat functionality
 */
export const chatTestUtils = {
  /**
   * Test 1: Basic Connection Test
   * Verify Socket.IO connection and basic setup
   */
  testSocketConnection: async () => {
    console.log('🧪 TEST 1: Socket Connection Test');
    console.log('================================');
    
    // Import socketService dynamically to avoid circular dependencies
    const { socketService } = await import('@/lib/socketService');
    
    const connectionStatus = socketService.checkConnection();
    const socketId = socketService.getSocketId();
    
    console.log('🔍 Socket Status:', {
      isConnected: connectionStatus,
      socketId: socketId,
      serverUrl: 'Check console for server URL'
    });
    
    return {
      isConnected: connectionStatus,
      socketId,
      status: connectionStatus ? 'PASS' : 'FAIL'
    };
  },

  /**
   * Test 2: User Authentication & Profile Test
   * Verify current user and profile setup
   */
  testUserAuth: async () => {
    console.log('🧪 TEST 2: User Authentication Test');
    console.log('===================================');
    
    const authResult = await chatDebug.checkCurrentUser();
    const profileExists = authResult.user ? await chatDebug.checkUserExists(authResult.user.id) : null;
    
    console.log('🔍 Auth Result:', {
      hasUser: !!authResult.user,
      userId: authResult.user?.id,
      email: authResult.user?.email,
      profileExists: profileExists?.exists
    });
    
    return {
      user: authResult.user,
      profileExists: profileExists?.exists,
      status: (authResult.user && profileExists?.exists) ? 'PASS' : 'FAIL'
    };
  },

  /**
   * Test 3: Database Message Operations
   * Test sending and retrieving messages via API
   */
  testDatabaseOperations: async (senderId: string, receiverId: string) => {
    console.log('🧪 TEST 3: Database Operations Test');
    console.log('===================================');
    
    try {
      // Test sending a message
      const testMessage = `Test message ${Date.now()}`;
      console.log('📤 Sending test message:', testMessage);
      
      const sentMessage = await messagesAPI.sendMessage(senderId, receiverId, testMessage);
      console.log('✅ Message sent:', sentMessage.id);
      
      // Test retrieving messages
      console.log('📥 Retrieving messages...');
      const messages = await messagesAPI.getMessages(senderId, receiverId, 1, 10);
      console.log('✅ Messages retrieved:', messages.length);
      
      // Find our test message
      const foundMessage = messages.find(m => m.content === testMessage);
      console.log('🔍 Test message found:', !!foundMessage);
      
      return {
        messageSent: !!sentMessage,
        messageRetrieved: !!foundMessage,
        messageId: sentMessage?.id,
        status: (sentMessage && foundMessage) ? 'PASS' : 'FAIL'
      };
    } catch (error) {
      console.error('❌ Database test failed:', error);
      return {
        messageSent: false,
        messageRetrieved: false,
        error: error.message,
        status: 'FAIL'
      };
    }
  },

  /**
   * Test 4: Socket.IO Message Sending
   * Test real-time message sending via Socket.IO
   */
  testSocketMessaging: async (senderId: string, receiverId: string) => {
    console.log('🧪 TEST 4: Socket.IO Messaging Test');
    console.log('===================================');
    
    try {
      const { socketService } = await import('@/lib/socketService');
      
      // Check connection first
      if (!socketService.isSocketConnected()) {
        console.log('❌ Socket not connected, attempting to connect...');
        socketService.reconnect();
        
        // Wait a bit for connection
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (!socketService.isSocketConnected()) {
          throw new Error('Socket connection failed');
        }
      }
      
      // Create test message
      const testMessage = {
        id: `test_${Date.now()}`,
        content: `Socket test message ${Date.now()}`,
        sender_id: senderId,
        receiver_id: receiverId,
        created_at: new Date().toISOString(),
        status: 'sent' as const,
        message_type: 'text' as const
      };
      
      console.log('📤 Sending via Socket.IO:', testMessage.id);
      socketService.sendMessage(testMessage);
      
      console.log('✅ Socket message sent successfully');
      
      return {
        messageSent: true,
        messageId: testMessage.id,
        status: 'PASS'
      };
    } catch (error) {
      console.error('❌ Socket messaging test failed:', error);
      return {
        messageSent: false,
        error: error.message,
        status: 'FAIL'
      };
    }
  },

  /**
   * Test 5: Chat Room Operations
   * Test joining/leaving chat rooms
   */
  testChatRooms: async (userId: string, recipientId: string) => {
    console.log('🧪 TEST 5: Chat Room Operations Test');
    console.log('====================================');
    
    try {
      const { socketService } = await import('@/lib/socketService');
      
      const chatId = [userId, recipientId].sort().join('-');
      console.log('🏠 Chat ID:', chatId);
      
      // Test joining room
      console.log('🚪 Joining chat room...');
      socketService.joinChat(userId, chatId);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test leaving room
      console.log('🚪 Leaving chat room...');
      socketService.leaveChat(chatId);
      
      console.log('✅ Chat room operations completed');
      
      return {
        roomJoined: true,
        roomLeft: true,
        chatId,
        status: 'PASS'
      };
    } catch (error) {
      console.error('❌ Chat room test failed:', error);
      return {
        roomJoined: false,
        roomLeft: false,
        error: error.message,
        status: 'FAIL'
      };
    }
  },

  /**
   * Test 6: Comprehensive Chat Flow
   * End-to-end test of complete chat functionality
   */
  testCompleteFlow: async (senderId: string, receiverId: string) => {
    console.log('🧪 TEST 6: Complete Chat Flow Test');
    console.log('==================================');
    
    const results = {
      connection: await chatTestUtils.testSocketConnection(),
      auth: await chatTestUtils.testUserAuth(),
      database: await chatTestUtils.testDatabaseOperations(senderId, receiverId),
      socket: await chatTestUtils.testSocketMessaging(senderId, receiverId),
      rooms: await chatTestUtils.testChatRooms(senderId, receiverId)
    };
    
    const allPassed = Object.values(results).every(r => r.status === 'PASS');
    
    console.log('📊 COMPLETE TEST RESULTS:');
    console.log('=========================');
    Object.entries(results).forEach(([test, result]) => {
      console.log(`${result.status === 'PASS' ? '✅' : '❌'} ${test.toUpperCase()}: ${result.status}`);
    });
    console.log(`\n🎯 OVERALL: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
    
    return {
      results,
      allPassed,
      summary: allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'
    };
  },

  /**
   * Quick Test Helper
   * Run basic tests with current user
   */
  quickTest: async () => {
    console.log('🚀 QUICK CHAT TEST');
    console.log('==================');
    
    // Get current user
    const authResult = await chatDebug.checkCurrentUser();
    if (!authResult.user) {
      console.log('❌ No authenticated user found');
      return { status: 'FAIL', reason: 'No authenticated user' };
    }
    
    // Get some users to test with
    const usersList = await chatDebug.listAllUsers(5);
    if (!usersList.data || usersList.data.length < 2) {
      console.log('❌ Not enough users in database for testing');
      return { status: 'FAIL', reason: 'Need at least 2 users for testing' };
    }
    
    // Find a different user to chat with
    const otherUser = usersList.data.find(u => u.id !== authResult.user.id);
    if (!otherUser) {
      console.log('❌ No other user found for testing');
      return { status: 'FAIL', reason: 'No other user available' };
    }
    
    console.log(`🎯 Testing chat between ${authResult.user.id} and ${otherUser.id}`);
    
    // Run basic tests
    const connectionTest = await chatTestUtils.testSocketConnection();
    const databaseTest = await chatTestUtils.testDatabaseOperations(authResult.user.id, otherUser.id);
    
    return {
      status: (connectionTest.status === 'PASS' && databaseTest.status === 'PASS') ? 'PASS' : 'FAIL',
      connection: connectionTest,
      database: databaseTest,
      users: {
        sender: authResult.user.id,
        receiver: otherUser.id
      }
    };
  }
};

// Export for easy access in console
if (typeof window !== 'undefined') {
  (window as any).chatTestUtils = chatTestUtils;
}
