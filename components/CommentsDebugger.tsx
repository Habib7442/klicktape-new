/**
 * Comments Debugger Component
 * Use this to test and debug comments loading issues
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';

interface DebugResult {
  test: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  data?: any;
}

const CommentsDebugger: React.FC = () => {
  const [results, setResults] = useState<DebugResult[]>([]);
  const [testing, setTesting] = useState(false);

  const addResult = (result: DebugResult) => {
    setResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const runAllTests = async () => {
    setTesting(true);
    clearResults();

    // Test 1: Basic Supabase Connection
    addResult({ test: 'Supabase Connection', status: 'pending', message: 'Testing...' });
    try {
      const { data, error } = await supabase.from('posts').select('id').limit(1);
      if (error) throw error;
      addResult({ 
        test: 'Supabase Connection', 
        status: 'success', 
        message: 'Connected successfully',
        data: { postsFound: data?.length || 0 }
      });
    } catch (error: any) {
      addResult({ 
        test: 'Supabase Connection', 
        status: 'error', 
        message: error.message || 'Connection failed'
      });
    }

    // Test 2: Get Comments Optimized Function
    addResult({ test: 'Comments Function', status: 'pending', message: 'Testing optimized function...' });
    try {
      // Use a known post ID for testing
      const testPostId = '34e3c528-7af2-4fa9-8c5e-1de6be28dfac';
      const { data, error } = await supabase.rpc('get_comments_optimized', {
        entity_type: 'post',
        entity_id: testPostId
      });
      
      if (error) throw error;
      addResult({ 
        test: 'Comments Function', 
        status: 'success', 
        message: `Function returned ${data?.length || 0} comments`,
        data: data?.slice(0, 2) // Show first 2 comments
      });
    } catch (error: any) {
      addResult({ 
        test: 'Comments Function', 
        status: 'error', 
        message: error.message || 'Function failed'
      });
    }

    // Test 3: Direct Comments Query
    addResult({ test: 'Direct Comments Query', status: 'pending', message: 'Testing direct query...' });
    try {
      const testPostId = '34e3c528-7af2-4fa9-8c5e-1de6be28dfac';
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:profiles!comments_user_id_fkey (username, avatar_url)
        `)
        .eq('post_id', testPostId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      addResult({ 
        test: 'Direct Comments Query', 
        status: 'success', 
        message: `Direct query returned ${data?.length || 0} comments`,
        data: data?.slice(0, 2)
      });
    } catch (error: any) {
      addResult({ 
        test: 'Direct Comments Query', 
        status: 'error', 
        message: error.message || 'Direct query failed'
      });
    }

    // Test 4: User Authentication
    addResult({ test: 'User Authentication', status: 'pending', message: 'Checking auth...' });
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      addResult({ 
        test: 'User Authentication', 
        status: 'success', 
        message: user ? `Authenticated as ${user.email}` : 'No user authenticated',
        data: { userId: user?.id, email: user?.email }
      });
    } catch (error: any) {
      addResult({ 
        test: 'User Authentication', 
        status: 'error', 
        message: error.message || 'Auth check failed'
      });
    }

    // Test 5: Profile Data
    addResult({ test: 'Profile Data', status: 'pending', message: 'Checking profile...' });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        addResult({ 
          test: 'Profile Data', 
          status: 'success', 
          message: `Profile found: ${profile?.username}`,
          data: profile
        });
      } else {
        addResult({ 
          test: 'Profile Data', 
          status: 'error', 
          message: 'No authenticated user for profile check'
        });
      }
    } catch (error: any) {
      addResult({ 
        test: 'Profile Data', 
        status: 'error', 
        message: error.message || 'Profile check failed'
      });
    }

    setTesting(false);
  };

  const getStatusColor = (status: DebugResult['status']) => {
    switch (status) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'pending': return '#FF9800';
      default: return '#666';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comments Debugger</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, { opacity: testing ? 0.5 : 1 }]} 
          onPress={runAllTests}
          disabled={testing}
        >
          <Text style={styles.buttonText}>
            {testing ? 'Running Tests...' : 'Run All Tests'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.clearButton} onPress={clearResults}>
          <Text style={styles.clearButtonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultsContainer}>
        {results.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <View style={styles.resultHeader}>
              <Text style={styles.testName}>{result.test}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(result.status) }]}>
                <Text style={styles.statusText}>{result.status.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.message}>{result.message}</Text>
            {result.data && (
              <Text style={styles.data}>
                Data: {JSON.stringify(result.data, null, 2)}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
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
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#666',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: 'white',
    fontSize: 16,
  },
  resultsContainer: {
    flex: 1,
  },
  resultItem: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  testName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  message: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  data: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
  },
});

export default CommentsDebugger;
