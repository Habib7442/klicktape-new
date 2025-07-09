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
import { LinearGradient } from "expo-linear-gradient";
import { messagesAPI } from "@/lib/messagesApi";
import { useDispatch } from "react-redux";
import { setUnreadMessageCount } from "@/src/store/slices/messageSlice";
import { useTheme } from "@/src/context/ThemeContext";
import { messageStatusManager } from "@/lib/messageStatusManager";
import { useSocketChat } from "@/hooks/useSocketChat";

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
  const chatId = userId && recipientId ? [userId, recipientId].sort().join("-") : "";



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
    onNewMessage: (message) => {
      console.log('🔥 Socket.IO: New message received!', message.id);

      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === message.id)) {
          return prev;
        }

        const newMessages = [...prev, message].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Update cache
        if (chatId) {
          setCachedMessages(chatId, newMessages);
        }

        return newMessages;
      });

      // Auto-scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Mark as delivered if user is receiver
      if (message.receiver_id === userId && message.sender_id !== userId) {
        markAsDelivered(message.id);
      }
    },
    onMessageStatusUpdate: ({ messageId, status, isRead }) => {
      console.log('🔥 Socket.IO: Message status update!', { messageId, status, isRead });

      setMessages(prev => {
        const updated = prev.map(m =>
          m.id === messageId
            ? { ...m, status, is_read: isRead }
            : m
        );

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

  // Define gradient colors based on theme
  const gradientColors = isDarkMode
    ? ["#000000", "#1a1a1a", "#2a2a2a"] as const
    : ["#F8F9FA", "#F0F2F5", "#E9ECEF"] as const;

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
      await messageStatusManager.markMessagesAsDelivered(recipient, currentUserId);
      await messageStatusManager.markMessagesAsRead(recipient, currentUserId);

      const sortedMessages = messages.documents.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setMessages(sortedMessages);
      setCachedMessages(chatId, sortedMessages);

      // Scroll to bottom after messages are loaded
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

    console.log('🔍 Step 1: Checking message content...');
    if (!newMessage.trim()) {
      console.log('❌ No message content, returning early');
      return;
    }

    console.log('🔍 Step 2: Checking user IDs...');
    if (!userId || !recipientId) {
      console.log('❌ Missing user IDs:', { userId, recipientId });
      Alert.alert("Error", "Cannot send message: Missing user or recipient ID");
      return;
    }

    console.log('🔍 Step 3: Stopping typing indicator...');
    // Stop typing indicator
    try {
      setIsTyping(false);
      sendTypingStatus(false);
      console.log('✅ Typing status stopped successfully');
    } catch (typingError) {
      console.error('❌ Error stopping typing status:', typingError);
    }

    console.log('🔍 Step 4: About to enter try block (moving setSending later)...');

    console.log('🔍 Step 5: Entering try block...');

    try {
      console.log('🔍 Step 6: Inside try block, preparing message data...');

      const messageData = {
        sender_id: userId,
        receiver_id: recipientId,
        content: newMessage.trim(),
        is_read: false,
      };

      console.log('📤 About to send via Socket.IO:', messageData);

      // Send via Socket.IO for real-time delivery
      let socketMessage;

      console.log('🔍 sendSocketMessage function:', typeof sendSocketMessage);
      console.log('🔍 sendSocketMessage exists:', !!sendSocketMessage);

      if (!sendSocketMessage) {
        throw new Error('sendSocketMessage function is not available');
      }

      // Set sending state here, after we know we're going to attempt sending
      setSending(true);

      try {
        console.log('🚀 Calling sendSocketMessage...');
        socketMessage = sendSocketMessage({
          sender_id: userId,
          receiver_id: recipientId,
          content: newMessage.trim(),
          is_read: false,
        });
        console.log('✅ Socket message sent, returned:', socketMessage);
      } catch (socketError) {
        console.error('❌ Socket message sending failed:', socketError);
        Alert.alert("Error", "Failed to send message via Socket.IO: " + socketError.message);
        setSending(false);
        return;
      }

      // Also save to Supabase database for persistence
      try {
        await messagesAPI.sendMessage(userId, recipientId, newMessage.trim());
        console.log('💾 Message saved to database');
      } catch (dbError) {
        console.error("Database save error:", dbError);
        // Continue even if DB save fails - Socket.IO handles real-time
      }

      // Optimistic update (Socket.IO will also trigger onNewMessage)
      const optimisticMessage: Message = {
        ...socketMessage,
        encrypted_content: newMessage.trim(),
        delivered_at: null,
        read_at: null,
      };

      setMessages(prev => {
        if (prev.some(m => m.id === optimisticMessage.id)) return prev;

        const updated = [...prev, optimisticMessage].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        if (chatId) {
          setCachedMessages(chatId, updated);
        }

        return updated;
      });

      setNewMessage("");
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.log('🔍 Step X: Caught error in sendMessage:', error);
      console.error("Send message error:", error);
      Alert.alert("Error", error.message || "Failed to send message");
    } finally {
      console.log('🔍 Step Final: Setting sending to false...');
      setSending(false);
    }
  };

  const handleTyping = useCallback(async () => {
    if (!userId || !recipientId) return;

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
  }, [userId, recipientId, isTyping, sendTypingStatus]);

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

        if (!recipientId || typeof recipientId !== "string") {
          Alert.alert("Error", "Invalid recipient ID");
          router.back();
          return;
        }

        setUserId(user.id);
        await loadMessages(user.id, recipientId);

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
  }, [recipientId, loadMessages]);

  // Socket.IO real-time is now handled by useSocketChat hook above
  // No need for Supabase real-time subscriptions




  // Effect to scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && !loading && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 200);
    }
  }, [messages, loading]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        if (flatListRef.current) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    );

    const keyboardWillShowListener = Platform.OS === 'ios'
      ? Keyboard.addListener("keyboardWillShow", () => {
          if (textInputRef.current) {
            textInputRef.current.focus();
          }
        })
      : { remove: () => {} };

    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        // We don't want to automatically blur the input when keyboard hides
        // This allows users to continue typing after dismissing keyboard
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? "#000000" : "#F8F9FA" }]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
          style={styles.keyboardAvoidingView}
          enabled
        >
          <View style={styles.content}>
            <View style={[styles.header, {
              borderBottomColor: `rgba(${isDarkMode ? '255, 229, 92' : '184, 134, 11'}, 0.2)`,
              backgroundColor: isDarkMode ? "rgba(40, 50, 50, 0.5)" : "rgba(248, 249, 250, 0.8)"
            }]}>
              <TouchableOpacity onPress={() => router.back()}>
                <Feather name="arrow-left" size={24} color={colors.primary} />
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
                  onContentSizeChange={() => {
                    flatListRef.current?.scrollToEnd({ animated: false });
                  }}
                  onLayout={() => {
                    // Scroll to bottom when the layout is first calculated
                    flatListRef.current?.scrollToEnd({ animated: false });
                  }}
                />
              </TouchableWithoutFeedback>
            )}

            {recipientTyping && (
              <View style={[styles.typingIndicator, {
                backgroundColor: isDarkMode ? 'rgba(40, 50, 50, 0.7)' : 'rgba(248, 249, 250, 0.7)'
              }]}>
                <Text style={[styles.typingText, { color: colors.textSecondary }]}>User is typing...</Text>
              </View>
            )}

            <View style={[styles.inputContainer, {
              borderTopColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)',
              backgroundColor: colors.backgroundSecondary
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
      </LinearGradient>
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
  content: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
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
    padding: 8,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    position: 'relative',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    minHeight: 60,
    justifyContent: 'flex-end',
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
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    marginRight: 12,
    maxHeight: 100,
    borderWidth: 1,
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