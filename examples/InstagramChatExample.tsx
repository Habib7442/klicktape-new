import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { groupMessagesByDate, formatMessageTime, GroupedMessage } from '../utils/dateUtils';
import DateHeader from '../components/DateHeader';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface InstagramChatExampleProps {
  userId: string;
  recipientId: string;
}

const InstagramChatExample: React.FC<InstagramChatExampleProps> = ({
  userId,
  recipientId,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender_id: recipientId,
      receiver_id: userId,
      content: 'Hey! How are you doing?',
      created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    },
    {
      id: '2',
      sender_id: userId,
      receiver_id: recipientId,
      content: 'I\'m doing great! Thanks for asking 😊',
      created_at: new Date(Date.now() - 86400000 + 300000).toISOString(), // Yesterday
    },
    {
      id: '3',
      sender_id: recipientId,
      receiver_id: userId,
      content: 'That\'s awesome to hear!',
      created_at: new Date(Date.now() - 86400000 + 600000).toISOString(), // Yesterday
    },
    {
      id: '4',
      sender_id: userId,
      receiver_id: recipientId,
      content: 'What are you up to today?',
      created_at: new Date().toISOString(), // Today
    },
    {
      id: '5',
      sender_id: recipientId,
      receiver_id: userId,
      content: 'Just working on some projects. You?',
      created_at: new Date(Date.now() + 300000).toISOString(), // Today
    },
  ]);
  
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Group messages by date
  const groupedMessages = groupMessagesByDate(messages);

  // Send message
  const sendMessage = () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      sender_id: userId,
      receiver_id: recipientId,
      content: inputText.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Render item (date header or message)
  const renderItem = ({ item }: { item: GroupedMessage }) => {
    if (item.type === 'date') {
      return <DateHeader dateLabel={item.dateLabel!} />;
    }

    const message = item.message!;
    const isOwnMessage = message.sender_id === userId;

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.messageRight : styles.messageLeft,
      ]}>
        <View style={[
          styles.messageBubble,
          {
            backgroundColor: isOwnMessage ? '#0084FF' : '#F0F0F0',
          }
        ]}>
          <Text style={[
            styles.messageText,
            { color: isOwnMessage ? '#FFFFFF' : '#000000' }
          ]}>
            {message.content}
          </Text>
          <Text style={[
            styles.timestamp,
            { 
              color: isOwnMessage 
                ? 'rgba(255, 255, 255, 0.7)' 
                : 'rgba(0, 0, 0, 0.5)' 
            }
          ]}>
            {formatMessageTime(message.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Instagram-Style Chat</Text>
        <Text style={styles.subtitle}>Sender: Right (Blue) • Receiver: Left (Gray)</Text>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={flatListRef}
          data={groupedMessages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message..."
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { opacity: inputText.trim() ? 1 : 0.5 }
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <AntDesign name="arrowup" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageContainer: {
    marginVertical: 2,
    maxWidth: '80%',
  },
  messageLeft: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    minWidth: 60,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E1E8ED',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#0084FF',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default InstagramChatExample;
