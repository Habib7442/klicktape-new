import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSmartScroll } from '../hooks/useSmartScroll';
import ScrollToBottomButton from '../components/ScrollToBottomButton';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface SmartScrollChatExampleProps {
  userId: string;
  recipientId: string;
}

const SmartScrollChatExample: React.FC<SmartScrollChatExampleProps> = ({
  userId,
  recipientId,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  // Use the smart scroll hook
  const {
    flatListRef,
    isUserScrolling,
    isNearBottom,
    handleScroll,
    smartScrollToBottom,
    scrollToBottomButtonVisible,
  } = useSmartScroll({
    messages,
    userId,
    loading,
  });

  // Send message function
  const sendMessage = () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender_id: userId,
      receiver_id: recipientId,
      content: inputText.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // Force scroll to bottom when sending
    setTimeout(() => {
      smartScrollToBottom(true, true);
    }, 50);
  };

  // Simulate receiving a message
  const simulateReceivedMessage = () => {
    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender_id: recipientId,
      receiver_id: userId,
      content: `Received message ${messages.length + 1}`,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMessage]);
  };

  // Add multiple messages for testing
  const addTestMessages = () => {
    const testMessages: Message[] = [];
    for (let i = 1; i <= 20; i++) {
      testMessages.push({
        id: `test_${Date.now()}_${i}`,
        sender_id: i % 2 === 0 ? userId : recipientId,
        receiver_id: i % 2 === 0 ? recipientId : userId,
        content: `Test message ${i} - This is a longer message to test scrolling behavior`,
        created_at: new Date(Date.now() - (20 - i) * 60000).toISOString(),
      });
    }
    setMessages(prev => [...prev, ...testMessages]);
  };

  // Render message item
  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === userId;
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <Text style={[
          styles.messageText,
          isOwnMessage ? styles.ownMessageText : styles.otherMessageText
        ]}>
          {item.content}
        </Text>
        <Text style={styles.messageTime}>
          {new Date(item.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with scroll status */}
      <View style={styles.header}>
        <Text style={styles.title}>Smart Scroll Chat Demo</Text>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            Scrolling: {isUserScrolling ? '🔄 Yes' : '⏸️ No'}
          </Text>
          <Text style={styles.statusText}>
            Near Bottom: {isNearBottom ? '✅ Yes' : '❌ No'}
          </Text>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.messagesList,
              { justifyContent: 'flex-end', flexGrow: 1 }
            ]}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="always"
            onContentSizeChange={() => {
              // Only scroll on initial load or when user is near bottom
              if (loading || isNearBottom) {
                smartScrollToBottom(false);
              }
            }}
            onLayout={() => {
              // Only scroll to bottom on initial layout
              if (messages.length > 0) {
                smartScrollToBottom(false);
              }
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No messages yet</Text>
                <TouchableOpacity onPress={addTestMessages} style={styles.testButton}>
                  <Text style={styles.testButtonText}>Add Test Messages</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </TouchableWithoutFeedback>

        {/* Scroll to bottom button */}
        <ScrollToBottomButton
          visible={scrollToBottomButtonVisible}
          onPress={() => smartScrollToBottom(true, true)}
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, { opacity: inputText.trim() ? 1 : 0.5 }]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Test Controls */}
      <View style={styles.testControls}>
        <TouchableOpacity onPress={simulateReceivedMessage} style={styles.testButton}>
          <Text style={styles.testButtonText}>Simulate Received</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={addTestMessages} style={styles.testButton}>
          <Text style={styles.testButtonText}>Add 20 Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMessages([])} style={styles.testButton}>
          <Text style={styles.testButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 10,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  testControls: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'space-around',
  },
  testButton: {
    backgroundColor: '#666',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 12,
  },
});

export default SmartScrollChatExample;
