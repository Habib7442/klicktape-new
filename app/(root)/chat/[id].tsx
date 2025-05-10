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
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { messagesAPI } from "@/lib/messagesApi";
import { useDispatch } from "react-redux";
import { setUnreadMessageCount } from "@/src/store/slices/messageSlice";

interface Message {
  id: string;
  encrypted_content: string;
  content?: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
  status: "sent" | "delivered" | "read";
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

      const unreadMessages = messages.documents.filter(
        (msg) => msg.sender_id === recipient && !msg.is_read
      );

      if (unreadMessages.length > 0) {
        await Promise.all(
          unreadMessages.map(async (msg) => {
            await messagesAPI.markAsRead(msg.id);
            msg.is_read = true;
            msg.status = "read";
          })
        );
      }

      const sortedMessages = messages.documents.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setMessages(sortedMessages);
      setCachedMessages(chatId, sortedMessages);
    } catch (error) {
      console.error("Failed to load messages:", error);
      Alert.alert("Error", "Failed to load messages: " + (error as Error).message);
      router.back();
    } finally {
      setLoading(false);
    }
  }, [getCachedMessages, setCachedMessages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!userId || !recipientId || !supabase) {
      Alert.alert("Error", "Cannot send message: Missing user or recipient ID");
      return;
    }

    try {
      const { data: recipientExists, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", recipientId)
        .single();

      if (checkError || !recipientExists) {
        Alert.alert(
          "Error",
          "Recipient not found. They may have deleted their account."
        );
        return;
      }

      const messageData = await messagesAPI.sendMessage(
        userId,
        recipientId as string,
        newMessage
      );

      const newMessageObj = {
        id: messageData.id,
        encrypted_content: newMessage,
        content: newMessage,
        sender_id: userId,
        created_at: messageData.created_at,
        is_read: false,
        status: "sent" as const,
      };

      setMessages((prev) => {
         if (prev.some((m) => m.id === newMessageObj.id)) return prev;
        const updatedMessages = [...prev, newMessageObj].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        return updatedMessages;
      });

      const chatId = [userId, recipientId].sort().join("-");
      const cachedMessages = getCachedMessages(chatId) || [];
      const updatedCache = [...cachedMessages, newMessageObj].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setCachedMessages(chatId, updatedCache);

      setNewMessage("");
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send message");
      console.error("Send message error:", error);
    }
  };

  const handleTyping = useCallback(async () => {
    if (!userId || !recipientId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (!isTyping) {
      setIsTyping(true);
      try {
        await messagesAPI.setTypingStatus(
          userId,
          [userId, recipientId].sort().join("-"),
          true
        );
      } catch (error) {
        console.error("Failed to set typing status:", error);
      }
    }

    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false);
      try {
        await messagesAPI.setTypingStatus(
          userId,
          [userId, recipientId].sort().join("-"),
          false
        );
      } catch (error) {
        console.error("Failed to clear typing status:", error);
      }
    }, 3000);
  }, [userId, recipientId, isTyping]);

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
    };
  }, [recipientId, loadMessages]);

  useEffect(() => {
    if (!userId || !recipientId || !supabase) return;

    const chatId = [userId, recipientId].sort().join("-");

    const setupSubscriptions = async () => {
      if (subscriptionRef.current) {
        try {
          await supabase.removeChannel(subscriptionRef.current);
        } catch (e) {
          console.warn("Failed to remove channel:", e);
        }
        subscriptionRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (isUnmountedRef.current) {
        return;
      }

      if (retryCountRef.current >= maxRetries) {
        console.error("Max retries reached for subscriptions");
        setConnectionStatus("disconnected");
        Alert.alert(
          "Connection Error",
          "Unable to connect to real-time chat. Please check your network and try again."
        );
        return;
      }

      setConnectionStatus("connecting");

      try {
        subscriptionRef.current = supabase
          .channel(`chat:${chatId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'messages',
              filter: `or(sender_id.eq.${userId},receiver_id.eq.${recipientId},sender_id.eq.${recipientId},receiver_id.eq.${userId})`,
            },
            (payload) => {
              if (isUnmountedRef.current) return;
              console.log("Message event:", payload.eventType, payload);

              switch (payload.eventType) {
                case 'INSERT':
                  const newMessage = payload.new as Message;
                  setMessages((prev) => {
                    if (prev.some((m) => m.id === newMessage.id)) return prev;
                    const updatedMessages = [...prev, newMessage].sort((a, b) =>
                      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    );
                    return updatedMessages;
                  });
                  setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                  if (newMessage.sender_id !== userId && !newMessage.is_read) {
                    messagesAPI.markAsRead(newMessage.id).catch(console.error);
                    dispatch(setUnreadMessageCount(0));
                  }
                  break;

                case 'UPDATE':
                  const updatedMessage = payload.new as Message;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === updatedMessage.id
                        ? { ...m, is_read: updatedMessage.is_read, status: updatedMessage.is_read ? "read" : m.status }
                        : m
                    )
                  );
                  break;

                case 'DELETE':
                  const deletedMessage = payload.old as Message;
                  setMessages((prev) => prev.filter((m) => m.id !== deletedMessage.id));
                  break;
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'typing_status',
              filter: `chat_id=eq.${chatId}`,
            },
            (payload) => {
              if (isUnmountedRef.current) return;
              const typingStatus = payload.new as { user_id: string; is_typing: boolean };
              if (typingStatus.user_id === recipientId) {
                setRecipientTyping(typingStatus.is_typing);
              }
            }
          )
          .subscribe((status, error) => {
            if (isUnmountedRef.current) return;
            console.log("Subscription status:", status, error ? error.message : "");

            if (status === 'SUBSCRIBED') {
              console.log("Successfully subscribed to chat channel");
              setConnectionStatus("connected");
              retryCountRef.current = 0;
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              console.warn("Subscription error, retrying...");
              setConnectionStatus("disconnected");
              if (retryCountRef.current < maxRetries) {
                retryCountRef.current += 1;
                reconnectTimeoutRef.current = setTimeout(() => {
                  if (!isUnmountedRef.current) {
                    setupSubscriptions();
                  }
                }, retryDelay);
              } else {
                console.error("Max retries reached for subscriptions");
              }
            }
          });
      } catch (error) {
        console.error("Error setting up subscription:", error);
        if (!isUnmountedRef.current && retryCountRef.current < maxRetries) {
          retryCountRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(setupSubscriptions, retryDelay);
        }
      }
    };

    setupSubscriptions();

    return () => {
      if (subscriptionRef.current && supabase) {
        try {
          supabase.removeChannel(subscriptionRef.current).catch(console.error);
        } catch (e) {
          console.warn("Failed to remove channel during cleanup:", e);
        }
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      retryCountRef.current = 0;
    };
  }, [userId, recipientId, dispatch]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        if (textInputRef.current) {
          textInputRef.current.focus();
        }
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        if (textInputRef.current) {
          textInputRef.current.blur();
        }
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const bubbleStyle = {
      ...styles.messageBubble,
      backgroundColor:
        item.sender_id === userId
          ? "rgba(255, 229, 92, 0.2)"
          : "rgba(255, 255, 255, 0.1)",
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
                  ? styles.userUsername
                  : styles.otherUsername,
              ]}
            >
              {item.sender_id === userId ? "You" : "Other User"}
            </Text>
          </View>
          <Text
            style={
              item.sender_id === userId
                ? styles.userMessageText
                : styles.otherMessageText
            }
          >
            {item.content || item.encrypted_content}
          </Text>
          <View style={styles.messageFooter}>
            <Text
              style={
                item.sender_id === userId
                  ? styles.userTimestamp
                  : styles.otherTimestamp
              }
            >
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            {item.sender_id === userId && (
              <Feather
                name={
                  item.status === "read"
                    ? "check-circle"
                    : item.status === "delivered"
                    ? "check"
                    : "clock"
                }
                size={14}
                color={item.status === "read" ? "#FFE55C" : "rgba(255, 255, 255, 0.6)"}
                style={styles.statusIcon}
              />
            )}
          </View>
        </View>
      </View>
    );
  }, [userId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#000000", "#1a1a1a", "#2a2a2a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}
          style={styles.keyboardAvoidingView}
          enabled
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()}>
                <Feather name="arrow-left" size={24} color="#FFE55C" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Chat</Text>
              {connectionStatus === "disconnected" && (
                <Text style={styles.connectionWarning}>Offline</Text>
              )}
            </View>

            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color="#FFE55C" />
              </View>
            ) : (
              <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  renderItem={renderMessage}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={[styles.messageList, { justifyContent: 'flex-end' }]}
                  style={styles.flatList}
                  keyboardShouldPersistTaps="handled"
                  inverted={false}
                  initialNumToRender={20}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  removeClippedSubviews={Platform.OS === "android"}
                  onContentSizeChange={() => {
                    flatListRef.current?.scrollToEnd({ animated: false });
                  }}
                />
              </TouchableWithoutFeedback>
            )}

            {recipientTyping && (
              <View style={styles.typingIndicator}>
                <Text style={styles.typingText}>User is typing...</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={textInputRef}
                  style={styles.textInput}
                  placeholder="Type a message..."
                  placeholderTextColor="rgba(255, 229, 92, 0.7)"
                  value={newMessage}
                  onChangeText={(text) => {
                    setNewMessage(text);
                    handleTyping();
                  }}
                  multiline
                />
                <TouchableOpacity
                  onPress={sendMessage}
                  style={styles.sendButton}
                >
                  <Feather name="send" size={20} color="#FFE55C" />
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
    backgroundColor: "#000000",
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 229, 92, 0.2)",
    backgroundColor: "rgba(40, 50, 50, 0.5)",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Rubik-Bold",
    color: "#FFE55C",
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
    color: "#FFE55C",
  },
  otherUsername: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  userMessageText: {
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    color: "#ffffff",
  },
  otherMessageText: {
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    color: "#ffffff",
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  userTimestamp: {
    fontSize: 12,
    fontFamily: "Rubik-Regular",
    color: "rgba(255, 255, 255, 0.7)",
    marginRight: 8,
  },
  otherTimestamp: {
    fontSize: 12,
    fontFamily: "Rubik-Regular",
    color: "rgba(255, 255, 255, 0.6)",
    marginRight: 8,
  },
  statusIcon: {
    marginLeft: 4,
  },
  inputContainer: {
    padding: 8,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 229, 92, 0.2)",
    backgroundColor: "rgba(40, 50, 50, 0.5)",
    position: 'relative',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    minHeight: 60,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  textInput: {
    flex: 1,
    backgroundColor: "rgba(255, 229, 92, 0.1)",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    color: "#ffffff",
    marginRight: 12,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "rgba(255, 229, 92, 0.3)",
  },
  sendButton: {
    backgroundColor: "rgba(255, 229, 92, 0.2)",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 229, 92, 0.4)",
  },
  typingIndicator: {
    padding: 10,
    alignItems: "flex-start",
    backgroundColor: 'rgba(40, 50, 50, 0.7)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  typingText: {
    fontSize: 14,
    fontFamily: "Rubik-Medium",
    color: "rgba(255, 255, 255, 0.6)",
    fontStyle: "italic",
  },
});