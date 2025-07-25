import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { messagesAPI } from "@/lib/messagesApi";
import { useDispatch } from "react-redux";
import { setUnreadMessageCount } from "@/src/store/slices/messageSlice";
import { useTheme } from "@/src/context/ThemeContext";
import { messageStatusManager } from "@/lib/messageStatusManager";
import { useSocketChat } from "@/hooks/useSocketChat";
import { useFocusEffect } from '@react-navigation/native';

interface Message {
  id: string;
  encrypted_content: string;
  content?: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  is_read: boolean;
  status: "sent" | "delivered" | "read";
  delivered_at?: string;
  read_at?: string;
}

interface MessageCache {
  [key: string]: {
    messages: Message[];
    lastUpdated: number;
  };
}

export default function ChatScreen() {
  const { id: recipientId } = useLocalSearchParams();
  const recipientIdString = Array.isArray(recipientId) ? recipientId[0] : recipientId;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [recipientTyping, setRecipientTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("connecting");
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);
  const messageCache = useRef<MessageCache>({});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscriptionRef = useRef<any>(null);
  const retryCountRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds
  const isUnmountedRef = useRef(false);
  const dispatch = useDispatch();
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  const { isDarkMode, colors } = useTheme();

  // Generate chat ID for real-time subscription
  const chatId = userId && recipientIdString ? [userId, recipientIdString].sort().join("-") : "";



  // Socket.IO real-time chat
  const {
    isConnected,
    connectionStatus: realtimeStatus,
    sendMessage: sendSocketMessage,
    sendTypingStatus,
    markAsDelivered,
    markAsRead,
  } = useSocketChat({
    userId: userId || "",
    chatId,
    onNewMessage: (message: any) => {
      console.log('🔥 Socket.IO: New message received!', message.id);

      setMessages(prev => {
        // Ensure message has encrypted_content
        const messageWithEncrypted: Message = {
          ...message,
          encrypted_content: message.encrypted_content || message.content || '',
        };

        // Check for duplicates by ID or by content + timestamp (for optimistic updates)
        const isDuplicate = prev.some(m =>
          m.id === messageWithEncrypted.id ||
          (m.sender_id === messageWithEncrypted.sender_id &&
           m.receiver_id === messageWithEncrypted.receiver_id &&
           m.content === messageWithEncrypted.content &&
           Math.abs(new Date(m.created_at).getTime() - new Date(messageWithEncrypted.created_at).getTime()) < 5000) // Within 5 seconds
        );

        if (isDuplicate) {
          console.log('🔄 Duplicate message detected, skipping:', messageWithEncrypted.id);
          return prev;
        }

        // Only add messages from other users (not our own sent messages)
        if (messageWithEncrypted.sender_id === userId) {
          console.log('🔄 Ignoring our own message from Socket.IO:', messageWithEncrypted.id);
          return prev;
        }

        const newMessages = [...prev, messageWithEncrypted].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Update cache
        if (chatId) {
          setCachedMessages(chatId, newMessages);
        }

        return newMessages;
      });

      // Auto-scroll to bottom only for messages from others and only if user is near bottom
      if (message.sender_id !== userId) {
        // Don't auto-scroll to prevent interrupting manual scrolling
        // User can manually scroll to see new messages
      }

      // Mark as delivered and read if user is receiver
      if (message.receiver_id === userId && message.sender_id !== userId) {
        // Mark as delivered immediately
        markAsDelivered(message.id);

        // Mark as read after a short delay (simulating user seeing the message)
        setTimeout(() => {
          markAsRead(message.id);
        }, 1000);
      }
    },
    onMessageStatusUpdate: ({ messageId, status, isRead }) => {
      console.log('🔥 Socket.IO: Message status update!', { messageId, status, isRead });

      setMessages(prev => {
        const messageFound = prev.find(m => m.id === messageId);
        console.log('📊 Message found for status update:', messageFound ? 'YES' : 'NO');

        if (!messageFound) {
          console.log('📊 Available message IDs:', prev.map(m => m.id));
          return prev;
        }

        const updated = prev.map(m =>
          m.id === messageId
            ? {
                ...m,
                status: status as "sent" | "delivered" | "read",
                is_read: isRead,
                delivered_at: status === 'delivered' ? new Date().toISOString() : m.delivered_at,
                read_at: status === 'read' ? new Date().toISOString() : m.read_at
              }
            : m
        );

        console.log('📊 Updated message status:', updated.find(m => m.id === messageId)?.status);

        // Update cache
        if (chatId) {
          setCachedMessages(chatId, updated);
        }

        return updated;
      });
    },
    onTypingUpdate: ({ userId: typingUserId, isTyping }) => {
      if (typingUserId !== userId) {
        setRecipientTyping(isTyping);
      }
    },
  });

  // Define solid colors based on theme (no gradients)
  const backgroundColor = isDarkMode ? "#000000" : "#FFFFFF";

  // Memoized functions
  const getCachedMessages = useCallback((chatId: string) => {
    const cache = messageCache.current[chatId];
    if (!cache) return null;

    const now = Date.now();
    if (now - cache.lastUpdated > CACHE_DURATION) {
      delete messageCache.current[chatId];
      return null;
    }

    return cache.messages;
  }, []);

  const setCachedMessages = useCallback((chatId: string, messages: Message[]) => {
    messageCache.current[chatId] = {
      messages,
      lastUpdated: Date.now(),
    };
  }, []);

  const loadMessages = useCallback(async (currentUserId: string, recipient: string) => {
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const { data: recipientData, error: recipientError } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", recipient)
        .single();

      if (recipientError || !recipientData) {
        throw new Error("Recipient does not exist");
      }

      const chatId = [currentUserId, recipient].sort().join("-");
      const cachedMessages = getCachedMessages(chatId);

      if (cachedMessages) {
        setMessages(cachedMessages);
        setLoading(false);
        return;
      }

      const messages = await messagesAPI.getConversationBetweenUsers(
        currentUserId,
        recipient
      );

      // Initialize message status manager
      messageStatusManager.setUserId(currentUserId);

      // Mark messages as delivered and read
      const deliveredMessages = await messageStatusManager.markMessagesAsDelivered(recipient, currentUserId);
      const readMessages = await messageStatusManager.markMessagesAsRead(recipient, currentUserId);

      // Send real-time status updates via Socket.IO
      if (deliveredMessages) {
        deliveredMessages.forEach(msg => {
          if (markAsDelivered) {
            markAsDelivered(msg.id);
          }
        });
      }

      if (readMessages) {
        readMessages.forEach(msg => {
          if (markAsRead) {
            markAsRead(msg.id);
          }
        });
      }

      const sortedMessages = messages.documents.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setMessages(sortedMessages);
      setCachedMessages(chatId, sortedMessages);

      // Scroll to bottom only on initial load
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 300);
    } catch (error) {
      console.error("Failed to load messages:", error);
      Alert.alert("Error", "Failed to load messages: " + (error as Error).message);
      router.back();
    } finally {
      setLoading(false);
    }
  }, [getCachedMessages, setCachedMessages]);

  const sendMessage = async () => {
    console.log('🔍 Chat sendMessage called:', {
      hasMessage: !!newMessage.trim(),
      userId,
      recipientId,
      isConnected,
      realtimeStatus
    });

    if (!newMessage.trim()) {
      console.log('❌ No message content, returning early');
      return;
    }

    if (!userId || !recipientIdString) {
      console.log('❌ Missing user IDs:', { userId, recipientId: recipientIdString });
      Alert.alert("Error", "Cannot send message: Missing user or recipient ID");
      return;
    }

    if (!isConnected) {
      console.log('❌ Socket not connected, status:', realtimeStatus);
      Alert.alert("Error", "Not connected to chat server. Please check your connection.");
      return;
    }

    if (sending) {
      console.log('❌ Already sending a message, ignoring...');
      return;
    }

    if (!sendSocketMessage) {
      Alert.alert("Error", "Chat service not available");
      return;
    }

    // Stop typing indicator
    try {
      setIsTyping(false);
      sendTypingStatus(false);
    } catch (typingError) {
      console.error('❌ Error stopping typing status:', typingError);
    }

    const messageContent = newMessage.trim();

    // Clear input immediately for instant feedback
    setNewMessage("");
    setSending(true);

    try {
      // Create optimistic message for instant UI update
      const optimisticMessage: Message = {
        id: `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sender_id: userId,
        receiver_id: recipientIdString,
        content: messageContent,
        encrypted_content: messageContent,
        created_at: new Date().toISOString(),
        is_read: false,
        status: 'sent',
        delivered_at: undefined,
        read_at: undefined,
      };

      // Instant UI update - show message immediately
      setMessages(prev => {
        // Check if we already have this message (avoid duplicates)
        const isDuplicate = prev.some(m =>
          (m.sender_id === userId &&
           m.receiver_id === recipientIdString &&
           m.content === messageContent &&
           Math.abs(new Date(m.created_at).getTime() - new Date(optimisticMessage.created_at).getTime()) < 2000)
        );

        if (isDuplicate) {
          console.log('🔄 Optimistic message already exists, skipping');
          return prev;
        }

        const updated = [...prev, optimisticMessage].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        if (chatId) {
          setCachedMessages(chatId, updated);
        }

        return updated;
      });

      // Scroll to bottom immediately when sending our own message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);

      // Send via Socket.IO (async, don't wait)
      const socketMessage = sendSocketMessage({
        sender_id: userId,
        receiver_id: recipientIdString,
        content: messageContent,
        is_read: false,
      });

      console.log('✅ Socket message sent:', socketMessage.id);

      // Update the optimistic message with the real Socket.IO message ID
      setMessages(prev => prev.map(m =>
        m.id === optimisticMessage.id
          ? { ...m, id: socketMessage.id }
          : m
      ));

      // Save to database in background (don't wait)
      messagesAPI.sendMessage(userId, recipientIdString, messageContent)
        .then(() => console.log('💾 Message saved to database'))
        .catch(dbError => console.error("Database save error:", dbError));

    } catch (error: any) {
      console.error("Send message error:", error);
      Alert.alert("Error", error.message || "Failed to send message");

      // Restore message content if sending failed
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = useCallback(async () => {
    if (!userId || !recipientIdString) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (!isTyping) {
      setIsTyping(true);
      // Send typing status via Socket.IO
      sendTypingStatus(true);
    }

    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false);
      sendTypingStatus(false);
    }, 3000);
  }, [userId, recipientIdString, isTyping, sendTypingStatus]);

  useEffect(() => {
    const setupChat = async () => {
      try {
        if (!supabase) {
          Alert.alert("Error", "Supabase client not initialized");
          router.replace("/sign-in");
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert("Error", "User not authenticated. Please log in.");
          router.replace("/sign-in");
          return;
        }

        if (!recipientIdString || typeof recipientIdString !== "string") {
          Alert.alert("Error", "Invalid recipient ID");
          router.back();
          return;
        }

        setUserId(user.id);
        await loadMessages(user.id, recipientIdString);

        // Start delivery tracking for this chat
        messageStatusManager.startDeliveryTracking();
      } catch (error) {
        console.error("Chat setup error:", error);
        Alert.alert("Error", "Failed to set up chat: " + (error as Error).message);
        router.back();
      }
    };

    isUnmountedRef.current = false;
    setupChat();

    return () => {
      isUnmountedRef.current = true;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // Cleanup message status manager
      messageStatusManager.cleanup();
    };
  }, [recipientIdString, loadMessages]);

  // Periodic status check to ensure real-time updates are working
  useEffect(() => {
    if (!userId || !recipientIdString) return;

    const statusCheckInterval = setInterval(async () => {
      try {
        // Refresh messages to get latest status from database
        const freshMessages = await messagesAPI.getConversationBetweenUsers(userId, recipientIdString);
        if (freshMessages && freshMessages.documents) {
          const sortedMessages = freshMessages.documents.sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          // Only update if there are actual status changes
          setMessages(prev => {
            const hasChanges = prev.some(prevMsg => {
              const freshMsg = sortedMessages.find(fm => fm.id === prevMsg.id);
              return freshMsg && (freshMsg.status !== prevMsg.status || freshMsg.is_read !== prevMsg.is_read);
            });

            if (hasChanges) {
              console.log('📊 Status changes detected, updating messages');
              if (chatId) {
                setCachedMessages(chatId, sortedMessages);
              }
              return sortedMessages;
            }

            return prev;
          });
        }
      } catch (error) {
        console.error('Error in periodic status check:', error);
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(statusCheckInterval);
  }, [userId, recipientIdString, chatId, setCachedMessages]);

  // Auto-mark messages as read when chat is focused
  useFocusEffect(
    useCallback(() => {
      if (userId && recipientIdString && markAsRead) {
        const markMessagesAsReadOnFocus = async () => {
          try {
            // Mark all unread messages from the other user as read
            const readMessages = await messageStatusManager.markMessagesAsRead(recipientIdString, userId);

            // Send real-time status updates via Socket.IO
            if (readMessages && readMessages.length > 0) {
              readMessages.forEach(msg => {
                markAsRead(msg.id);
              });

              // Update local state to reflect read status
              setMessages(prev => prev.map(m =>
                readMessages.some(rm => rm.id === m.id)
                  ? { ...m, is_read: true, status: 'read' as const }
                  : m
              ));
            }
          } catch (error) {
            console.error('Error marking messages as read on focus:', error);
          }
        };

        markMessagesAsReadOnFocus();
      }
    }, [userId, recipientIdString, markAsRead])
  );

  // Socket.IO real-time is now handled by useSocketChat hook above
  // No need for Supabase real-time subscriptions




  // Effect to scroll to bottom only when new messages are added (not on every change)
  const previousMessageCount = useRef(0);
  useEffect(() => {
    if (messages.length > previousMessageCount.current && !loading && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    previousMessageCount.current = messages.length;
  }, [messages.length, loading]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        // Only scroll to bottom if user is already at the bottom
        // This prevents interrupting manual scrolling
      }
    );

    const keyboardWillShowListener = Platform.OS === 'ios'
      ? Keyboard.addListener("keyboardWillShow", () => {
          // Ensure input stays focused and visible
          if (textInputRef.current) {
            setTimeout(() => {
              textInputRef.current?.focus();
            }, 100);
          }
        })
      : { remove: () => {} };

    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        // Keep input focused but don't auto-scroll
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardWillShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const bubbleStyle = {
      ...styles.messageBubble,
      backgroundColor:
        item.sender_id === userId
          ? isDarkMode
            ? "rgba(128, 128, 128, 0.2)"
            : "rgba(128, 128, 128, 0.1)"
          : isDarkMode
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.05)",
      borderColor:
        item.sender_id === userId
          ? isDarkMode
            ? "rgba(128, 128, 128, 0.3)"
            : "rgba(128, 128, 128, 0.2)"
          : isDarkMode
            ? "rgba(255, 255, 255, 0.2)"
            : "rgba(0, 0, 0, 0.1)",
      borderWidth: 1,
    };

    return (
      <View
        style={[
          styles.messageContainer,
          item.sender_id === userId ? styles.messageRight : styles.messageLeft,
        ]}
      >
        <View style={bubbleStyle}>
          <View style={styles.messageHeader}>
            <Text
              style={[
                styles.username,
                item.sender_id === userId
                  ? { color: isDarkMode ? '#808080' : '#606060' }
                  : { color: colors.textSecondary },
              ]}
            >
              {item.sender_id === userId ? "You" : "Other User"}
            </Text>
          </View>
          <Text
            style={[
              item.sender_id === userId
                ? styles.userMessageText
                : styles.otherMessageText,
              { color: colors.text }
            ]}
          >
            {item.content || item.encrypted_content}
          </Text>
          <View style={styles.messageFooter}>
            <Text
              style={[
                item.sender_id === userId
                  ? styles.userTimestamp
                  : styles.otherTimestamp,
                { color: colors.textTertiary }
              ]}
            >
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            {item.sender_id === userId && (
              <View style={styles.statusIconContainer}>
                {item.status === "read" ? (
                  <Feather
                    name="check-circle"
                    size={14}
                    color={isDarkMode ? '#4CAF50' : '#2196F3'}
                    style={styles.statusIcon}
                  />
                ) : item.status === "delivered" ? (
                  <View style={styles.doubleCheck}>
                    <Feather
                      name="check"
                      size={12}
                      color={colors.textSecondary}
                      style={[styles.statusIcon, { marginRight: -8 }]}
                    />
                    <Feather
                      name="check"
                      size={12}
                      color={colors.textSecondary}
                      style={styles.statusIcon}
                    />
                  </View>
                ) : (
                  <Feather
                    name="clock"
                    size={12}
                    color={colors.textSecondary}
                    style={styles.statusIcon}
                  />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }, [userId, isDarkMode, colors]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: backgroundColor }]}>
      <View style={[styles.container, { backgroundColor: backgroundColor }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          style={styles.keyboardAvoidingView}
          enabled
        >
          <View style={styles.content}>
            <View style={[styles.header, {
              borderBottomColor: `rgba(${isDarkMode ? '255, 255, 255' : '0, 0, 0'}, 0.1)`,
              backgroundColor: backgroundColor
            }]}>
              <TouchableOpacity onPress={() => router.back()}>
                <Feather name="arrow-left" size={24} color={isDarkMode ? "#808080" : "#606060"} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Chat</Text>
              <View style={styles.connectionStatus}>
                <View style={[
                  styles.connectionDot,
                  {
                    backgroundColor: realtimeStatus === 'connected' ? '#4CAF50' :
                                   realtimeStatus === 'connecting' ? '#FF9800' : '#F44336'
                  }
                ]} />
                <Text style={[styles.connectionText, { color: colors.textSecondary }]}>
                  {realtimeStatus === 'connected' ? 'Online' :
                   realtimeStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                </Text>
              </View>
            </View>

            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  renderItem={renderMessage}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={[styles.messageList, {
                    justifyContent: 'flex-end',
                    flexGrow: 1
                  }]}
                  style={styles.flatList}
                  keyboardShouldPersistTaps="always"
                  inverted={false}
                  initialNumToRender={20}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  removeClippedSubviews={Platform.OS === "android"}
                  maintainVisibleContentPosition={{
                    minIndexForVisible: 0,
                    autoscrollToTopThreshold: 10
                  }}
                />
              </TouchableWithoutFeedback>
            )}

            {recipientTyping && (
              <View style={[styles.typingIndicator, {
                backgroundColor: backgroundColor
              }]}>
                <Text style={[styles.typingText, { color: colors.textSecondary }]}>User is typing...</Text>
              </View>
            )}

            <View style={[styles.inputContainer, {
              borderTopColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)',
              backgroundColor: backgroundColor
            }]}>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={textInputRef}
                  style={[styles.textInput, {
                    backgroundColor: colors.input,
                    borderColor: colors.inputBorder,
                    color: colors.text
                  }]}
                  placeholder="Type a message..."
                  placeholderTextColor={colors.textTertiary}
                  value={newMessage}
                  onChangeText={(text) => {
                    setNewMessage(text);
                    handleTyping();
                  }}
                  multiline
                />
                <TouchableOpacity
                  onPress={sendMessage}
                  style={[styles.sendButton, {
                    backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
                    borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.4)' : 'rgba(128, 128, 128, 0.3)'
                  }]}
                >
                  <Feather name="send" size={20} color={isDarkMode ? '#808080' : '#606060'} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
  },
  messagesContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Rubik-Bold",
    flex: 1,
    marginLeft: 16,
  },
  connectionWarning: {
    fontSize: 14,
    fontFamily: "Rubik-Medium",
    color: "rgba(255, 85, 85, 0.8)",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  flatList: {
    flex: 1,
  },
  messageList: {
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 12, // Increased horizontal padding for equal spacing
    flexGrow: 1,
    justifyContent: 'flex-end', // This pushes content to the bottom
  },
  messageContainer: {
    marginBottom: 8,
    marginHorizontal: 1, // Reduced margin to 1px on both sides
    maxWidth: "100%", // Slightly reduced max width
    borderRadius: 16,
  },
  messageLeft: {
    alignItems: "flex-start",
  },
  messageRight: {
    alignItems: "flex-end",
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  username: {
    fontSize: 12,
    fontFamily: "Rubik-Medium",
  },
  userUsername: {
    // Color will be set dynamically
  },
  otherUsername: {
    // Color will be set dynamically
  },
  userMessageText: {
    fontSize: 16,
    fontFamily: "Rubik-Medium",
  },
  otherMessageText: {
    fontSize: 16,
    fontFamily: "Rubik-Medium",
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  userTimestamp: {
    fontSize: 12,
    fontFamily: "Rubik-Regular",
    marginRight: 8,
  },
  otherTimestamp: {
    fontSize: 12,
    fontFamily: "Rubik-Regular",
    marginRight: 8,
  },
  statusIcon: {
    marginLeft: 4,
  },
  statusIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  doubleCheck: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    padding: 16,
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 24,
    paddingTop: 16,
    borderTopWidth: 1,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'stretch',
    backgroundColor: 'transparent',
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  textInput: {
    flex: 1,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    marginRight: 12,
    maxHeight: 120,
    minHeight: 44,
    borderWidth: 1,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  typingIndicator: {
    padding: 10,
    alignItems: "flex-start",
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  typingText: {
    fontSize: 14,
    fontFamily: "Rubik-Medium",
    fontStyle: "italic",
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '500',
  },
});