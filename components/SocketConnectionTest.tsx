import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import socketService from '@/lib/socketService';
import { testConnection, getSocketUrls, getCurrentNetworkInfo } from '@/utils/networkHelper';

export const SocketConnectionTest = () => {
  const [connectionStatus, setConnectionStatus] = useState<string>('Checking...');
  const [socketId, setSocketId] = useState<string>('');
  const [testResults, setTestResults] = useState<Array<{url: string, status: boolean}>>([]);
  const [networkInfo, setNetworkInfo] = useState<any>(null);

  useEffect(() => {
    // Get network info
    setNetworkInfo(getCurrentNetworkInfo());

    // Listen for connection changes
    const unsubscribe = socketService.onConnectionChange((connected) => {
      setConnectionStatus(connected ? 'Connected' : 'Disconnected');
      setSocketId(connected ? socketService.getSocketId() || '' : '');
    });

    // Initial status check
    const isConnected = socketService.isSocketConnected();
    setConnectionStatus(isConnected ? 'Connected' : 'Disconnected');
    setSocketId(isConnected ? socketService.getSocketId() || '' : '');

    return unsubscribe;
  }, []);

  const testAllUrls = async () => {
    setTestResults([]);
    const urls = getSocketUrls();
    const results = [];

    for (const url of urls) {
      console.log(`Testing ${url}...`);
      const isWorking = await testConnection(url);
      results.push({ url, status: isWorking });
      setTestResults([...results]);
    }
  };

  const reconnectSocket = () => {
    socketService.reconnect();
  };

  const sendTestMessage = () => {
    try {
      const testMessage = {
        id: `test_${Date.now()}`,
        sender_id: 'test_user_1',
        receiver_id: 'test_user_2',
        content: `Test message at ${new Date().toLocaleTimeString()}`,
        created_at: new Date().toISOString(),
        is_read: false,
        status: 'sent' as const,
      };
      
      socketService.sendMessage(testMessage);
      console.log('✅ Test message sent successfully');
    } catch (error) {
      console.error('❌ Failed to send test message:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Socket.IO Connection Test</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connection Status</Text>
        <Text style={[styles.status, connectionStatus === 'Connected' ? styles.connected : styles.disconnected]}>
          {connectionStatus}
        </Text>
        {socketId && <Text style={styles.socketId}>Socket ID: {socketId}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Network Info</Text>
        <Text style={styles.info}>Platform: {networkInfo?.platform}</Text>
        <Text style={styles.info}>Android Emulator: {networkInfo?.isAndroidEmulator ? 'Yes' : 'No'}</Text>
        <Text style={styles.info}>iOS Simulator: {networkInfo?.isIOSSimulator ? 'Yes' : 'No'}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testAllUrls}>
          <Text style={styles.buttonText}>Test All URLs</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={reconnectSocket}>
          <Text style={styles.buttonText}>Reconnect Socket</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, connectionStatus !== 'Connected' && styles.buttonDisabled]} 
          onPress={sendTestMessage}
          disabled={connectionStatus !== 'Connected'}
        >
          <Text style={styles.buttonText}>Send Test Message</Text>
        </TouchableOpacity>
      </View>

      {testResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>URL Test Results</Text>
          {testResults.map((result, index) => (
            <View key={index} style={styles.testResult}>
              <Text style={[styles.testUrl, result.status ? styles.success : styles.error]}>
                {result.url}
              </Text>
              <Text style={[styles.testStatus, result.status ? styles.success : styles.error]}>
                {result.status ? '✅ Working' : '❌ Failed'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 10,
    borderRadius: 5,
  },
  connected: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  disconnected: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  socketId: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  testUrl: {
    flex: 1,
    fontSize: 12,
  },
  testStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  success: {
    color: '#28a745',
  },
  error: {
    color: '#dc3545',
  },
});

export default SocketConnectionTest;
