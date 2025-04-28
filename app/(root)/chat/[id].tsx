import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Alert
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { messagesAPI } from '@/lib/messagesApi';

interface Message {
  id: string;
  encrypted_content: string;
  content?: string;
  sender_id: string;
  created_at: string;
}

interface MessageCache {
  [key: string]: {
    messages: Message[];
    lastUpdated: number;
  };
}

export default function ChatScreen() {
  const { id: recipientId } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const messageCache = useRef<MessageCache>({});
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  const getCachedMessages = useCallback((chatId: string) => {
    const cache = messageCache.current[chatId];
    if (!cache) return null;
    
    const now = Date.now();
    if (now - cache.lastUpdated > CACHE_DURATION) {
      // Cache expired
      delete messageCache.current[chatId];
      return null;
    }
    
    return cache.messages;
  }, []);

  const setCachedMessages = useCallback((chatId: string, messages: Message[]) => {
    messageCache.current[chatId] = {
      messages,
      lastUpdated: Date.now()
    };
  }, []);

  const loadMessages = async (currentUserId: string, recipient: string) => {
    try {
      const chatId = [currentUserId, recipient].sort().join('-');
      const cachedMessages = getCachedMessages(chatId);
      
      if (cachedMessages) {
        console.log('Using cached messages');
        setMessages(cachedMessages);
        setLoading(false);
        return;
      }
  
      console.log('Fetching messages from database');
      const messages = await messagesAPI.getConversationBetweenUsers(
        currentUserId,
        recipient
      );
  
      // Mark unread messages as read immediately when they are loaded
      const unreadMessages = messages.documents.filter(
        msg => msg.sender_id === recipient && !msg.is_read
      );
  
      if (unreadMessages.length > 0) {
        console.log('Marking messages as read:', unreadMessages.length);
        await Promise.all(
          unreadMessages.map(async (msg) => {
            await messagesAPI.markAsRead(msg.id);
            // Update the message in the current set
            msg.is_read = true;
          })
        );
      }
      
      setMessages(messages.documents);
      setCachedMessages(chatId, messages.documents);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load messages:", error);
      Alert.alert("Error", "Failed to load messages: " + (error as Error).message);
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!userId || !recipientId) {
      Alert.alert("Error", "Cannot send message: Missing user or recipient ID");
      return;
    }

    try {
      await messagesAPI.sendMessage(
        userId,
        recipientId as string,
        newMessage
      );
      
      const newMessageObj = {
        id: Date.now().toString(),
        encrypted_content: newMessage,
        sender_id: userId,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [newMessageObj, ...prev]);
      
      // Update cache with new message
      const chatId = [userId, recipientId].sort().join('-');
      const cachedMessages = getCachedMessages(chatId) || [];
      setCachedMessages(chatId, [newMessageObj, ...cachedMessages]);
      
      setNewMessage('');
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (error) {
      Alert.alert("Error", "Failed to send message: " + (error as Error).message);
      console.error(error);
    }
  };

  useEffect(() => {
    const setupChat = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert("Error", "User not authenticated. Please log in.");
          router.replace("/sign-in"); // Redirect to login if user is not authenticated
          return;
        }

        if (!recipientId || typeof recipientId !== 'string') {
          Alert.alert("Error", "Invalid recipient ID");
          router.back();
          return;
        }

        setUserId(user.id);
        setLoading(true);

        // Ensure userId is set before proceeding
        if (!user.id || !recipientId) {
          throw new Error("Missing userId or recipientId");
        }

        await loadMessages(user.id, recipientId);
      } catch (error) {
        console.error("Chat setup error:", error);
        Alert.alert("Error", "Failed to set up chat: " + (error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    setupChat();
  }, [recipientId]);

  // Add cache cleanup on unmount
  useEffect(() => {
    return () => {
      messageCache.current = {};
    };
  }, []);

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.message,
      item.sender_id === userId ? styles.myMessage : styles.theirMessage
    ]}>
      <Text style={styles.messageText}>{item.encrypted_content || item.content}</Text>
      <Text style={styles.time}>
        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <LinearGradient colors={['#000000', '#1a1a1a']} style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFD700" />
          </TouchableOpacity>
          <Text style={styles.title}>Chat</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#FFD700" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            inverted
            contentContainerStyle={styles.messages}
          />
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
            <Ionicons name="send" size={20} color="#FFD700" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  flex: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333'
  },
  title: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  messages: {
    padding: 15
  },
  message: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderBottomRightRadius: 0
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomLeftRadius: 0
  },
  messageText: {
    color: 'white',
    fontSize: 16
  },
  time: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 4,
    alignSelf: 'flex-end'
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#333'
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: 'white',
    marginRight: 10,
    maxHeight: 100
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  }
});