import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import socketService from '@/lib/socketService';
import { testServerConnection } from '@/utils/testServerConnection';

export const SocketTestButton = () => {
  const [testResult, setTestResult] = useState<string>('');

  const testConnection = async () => {
    setTestResult('Testing...');

    try {
      // Test server connectivity first
      console.log('🧪 Starting connection test...');
      const workingUrl = await testServerConnection();

      if (workingUrl) {
        setTestResult(`✅ Server accessible at: ${workingUrl}`);
      } else {
        setTestResult('❌ No server URLs accessible');
      }

      // Test Socket.IO connection
      const isConnected = socketService.isSocketConnected();
      console.log('🔗 Socket.IO connected:', isConnected);

      if (!isConnected) {
        console.log('🔄 Attempting manual reconnection...');
        socketService.reconnect();
      }

    } catch (error) {
      console.error('Test error:', error);
      setTestResult(`❌ Test failed: ${error.message}`);
    }
  };

  const testMessageSending = () => {
    console.log('🧪 Testing message sending...');

    try {
      // Check connection first
      const isConnected = socketService.isSocketConnected();
      console.log('🔍 Socket connected before test:', isConnected);

      if (!isConnected) {
        setTestResult('❌ Socket not connected');
        return;
      }

      const testMessage = {
        sender_id: 'd921e417-53ff-4b33-8272-d145fb1fbf31', // Use real user ID
        receiver_id: 'd7e70738-b255-46e1-ad0b-55bdf48b8cac', // Use real recipient ID
        content: 'Test message from debug button',
        is_read: false,
      };

      console.log('📤 Attempting to send test message...');
      console.log('📤 Test message data:', testMessage);

      socketService.sendMessage({
        ...testMessage,
        id: `test_${Date.now()}`,
        created_at: new Date().toISOString(),
        status: 'sent' as const,
      });

      setTestResult('✅ Test message sent successfully');
    } catch (error) {
      console.error('❌ Test message failed:', error);
      setTestResult(`❌ Test message failed: ${error.message}`);
    }
  };

  const forceReconnect = () => {
    console.log('🔄 Force reconnecting Socket.IO...');
    socketService.reconnect();
    setTestResult('🔄 Reconnection triggered');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={testConnection}>
        <Text style={styles.buttonText}>Test Connection</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={testMessageSending}>
        <Text style={styles.buttonText}>Test Message</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={forceReconnect}>
        <Text style={styles.buttonText}>Force Reconnect</Text>
      </TouchableOpacity>

      {testResult ? (
        <Text style={styles.result}>{testResult}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  result: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    textAlign: 'center',
  },
});
