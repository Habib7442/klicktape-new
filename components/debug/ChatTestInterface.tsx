import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { chatTestUtils } from '@/utils/chatTestUtils';
import { chatDebug } from '@/utils/chatDebug';

interface TestResult {
  status: 'PASS' | 'FAIL' | 'RUNNING';
  message?: string;
  details?: any;
}

export default function ChatTestInterface() {
  const { colors } = useTheme();
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [customUserId, setCustomUserId] = useState('');
  const [customRecipientId, setCustomRecipientId] = useState('');

  const updateTestResult = (testName: string, result: TestResult) => {
    setTestResults(prev => ({
      ...prev,
      [testName]: result
    }));
  };

  const runTest = async (testName: string, testFunction: () => Promise<any>) => {
    updateTestResult(testName, { status: 'RUNNING' });
    
    try {
      const result = await testFunction();
      updateTestResult(testName, {
        status: result.status || (result.error ? 'FAIL' : 'PASS'),
        message: result.error || result.summary || 'Test completed',
        details: result
      });
    } catch (error) {
      updateTestResult(testName, {
        status: 'FAIL',
        message: error.message,
        details: error
      });
    }
  };

  const runQuickTest = async () => {
    setIsRunning(true);
    await runTest('Quick Test', chatTestUtils.quickTest);
    setIsRunning(false);
  };

  const runConnectionTest = async () => {
    await runTest('Connection', chatTestUtils.testSocketConnection);
  };

  const runAuthTest = async () => {
    await runTest('Authentication', chatTestUtils.testUserAuth);
  };

  const runDatabaseTest = async () => {
    if (!customUserId || !customRecipientId) {
      Alert.alert('Error', 'Please enter both User ID and Recipient ID');
      return;
    }
    await runTest('Database', () => 
      chatTestUtils.testDatabaseOperations(customUserId, customRecipientId)
    );
  };

  const runSocketTest = async () => {
    if (!customUserId || !customRecipientId) {
      Alert.alert('Error', 'Please enter both User ID and Recipient ID');
      return;
    }
    await runTest('Socket Messaging', () => 
      chatTestUtils.testSocketMessaging(customUserId, customRecipientId)
    );
  };

  const runCompleteTest = async () => {
    if (!customUserId || !customRecipientId) {
      Alert.alert('Error', 'Please enter both User ID and Recipient ID');
      return;
    }
    setIsRunning(true);
    await runTest('Complete Flow', () => 
      chatTestUtils.testCompleteFlow(customUserId, customRecipientId)
    );
    setIsRunning(false);
  };

  const runDebugDiagnostic = async () => {
    if (!customRecipientId) {
      Alert.alert('Error', 'Please enter Recipient ID');
      return;
    }
    await runTest('Debug Diagnostic', () => 
      chatDebug.runFullDiagnostic(customRecipientId)
    );
  };

  const clearResults = () => {
    setTestResults({});
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS': return '#4CAF50';
      case 'FAIL': return '#F44336';
      case 'RUNNING': return '#FF9800';
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS': return '✅';
      case 'FAIL': return '❌';
      case 'RUNNING': return '⏳';
      default: return '⚪';
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Chat Test Interface
      </Text>
      
      {/* User Input Section */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Test Configuration
        </Text>
        
        <TextInput
          style={[styles.input, { 
            backgroundColor: colors.background, 
            color: colors.text,
            borderColor: colors.cardBorder 
          }]}
          placeholder="Sender User ID"
          placeholderTextColor={colors.textSecondary}
          value={customUserId}
          onChangeText={setCustomUserId}
        />
        
        <TextInput
          style={[styles.input, { 
            backgroundColor: colors.background, 
            color: colors.text,
            borderColor: colors.cardBorder 
          }]}
          placeholder="Recipient User ID"
          placeholderTextColor={colors.textSecondary}
          value={customRecipientId}
          onChangeText={setCustomRecipientId}
        />
      </View>

      {/* Quick Tests */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Quick Tests
        </Text>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={runQuickTest}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            🚀 Run Quick Test
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#2196F3' }]}
          onPress={runCompleteTest}
          disabled={isRunning || !customUserId || !customRecipientId}
        >
          <Text style={styles.buttonText}>
            🎯 Run Complete Flow Test
          </Text>
        </TouchableOpacity>
      </View>

      {/* Individual Tests */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Individual Tests
        </Text>
        
        <TouchableOpacity
          style={[styles.smallButton, { backgroundColor: '#4CAF50' }]}
          onPress={runConnectionTest}
        >
          <Text style={styles.buttonText}>🔗 Connection</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.smallButton, { backgroundColor: '#FF9800' }]}
          onPress={runAuthTest}
        >
          <Text style={styles.buttonText}>👤 Auth</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.smallButton, { backgroundColor: '#9C27B0' }]}
          onPress={runDatabaseTest}
          disabled={!customUserId || !customRecipientId}
        >
          <Text style={styles.buttonText}>💾 Database</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.smallButton, { backgroundColor: '#00BCD4' }]}
          onPress={runSocketTest}
          disabled={!customUserId || !customRecipientId}
        >
          <Text style={styles.buttonText}>📡 Socket</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.smallButton, { backgroundColor: '#795548' }]}
          onPress={runDebugDiagnostic}
          disabled={!customRecipientId}
        >
          <Text style={styles.buttonText}>🔍 Debug</Text>
        </TouchableOpacity>
      </View>

      {/* Results Section */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.resultsHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Test Results
          </Text>
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: colors.textSecondary }]}
            onPress={clearResults}
          >
            <Text style={styles.buttonText}>Clear</Text>
          </TouchableOpacity>
        </View>
        
        {Object.entries(testResults).map(([testName, result]) => (
          <View key={testName} style={[styles.resultItem, { borderColor: colors.cardBorder }]}>
            <View style={styles.resultHeader}>
              <Text style={[styles.resultTitle, { color: colors.text }]}>
                {getStatusIcon(result.status)} {testName}
              </Text>
              <Text style={[styles.resultStatus, { color: getStatusColor(result.status) }]}>
                {result.status}
              </Text>
            </View>
            {result.message && (
              <Text style={[styles.resultMessage, { color: colors.textSecondary }]}>
                {result.message}
              </Text>
            )}
          </View>
        ))}
        
        {Object.keys(testResults).length === 0 && (
          <Text style={[styles.noResults, { color: colors.textSecondary }]}>
            No test results yet. Run a test to see results here.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    fontSize: 16,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  smallButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
    marginRight: 8,
    flex: 1,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resultItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultMessage: {
    fontSize: 14,
    marginTop: 4,
  },
  noResults: {
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
});
