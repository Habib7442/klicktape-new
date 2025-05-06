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
import { useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
  const messageCache = useRef<MessageCache>({});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscriptionRef = useRef<any>(null);
  const retryCountRef = useRef<number>(0);
  const maxRetries = 3;
  const retryDelay = 5000; // 5 seconds
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
        .select("id")
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

      setMessages(messages.documents);
      setCachedMessages(chatId, messages.documents);
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
        return [newMessageObj, ...prev];
      });

      const chatId = [userId, recipientId].sort().join("-");
      const cachedMessages = getCachedMessages(chatId) || [];
      setCachedMessages(chatId, [newMessageObj, ...cachedMessages]);

      setNewMessage("");
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send message");
      console.error("Send message error:", error);
    }
  };

  const handleTyping = useCallback(async () => {
    if (!userId || !recipientId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing status to true if not already typing
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

    // Set timeout to clear typing status
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

  // Setup chat and load initial messages
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

    setupChat();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [recipientId, loadMessages]);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!userId || !recipientId || !supabase) return;

    const chatId = [userId, recipientId].sort().join("-");
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const setupSubscriptions = async () => {
      // Clean up any existing subscriptions
      if (subscriptionRef.current) {
        await supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
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

      // Create a single channel for both message and typing events
      subscriptionRef.current = supabase
        .channel(`chat:${chatId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `or(and(sender_id.eq.${userId},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${userId})`,
          },
          (payload) => {
            console.log("Message event:", payload.eventType, payload);

            switch (payload.eventType) {
              case 'INSERT':
                const newMessage = payload.new as Message;
                setMessages((prev) => {
                  if (prev.some((m) => m.id === newMessage.id)) return prev;
                  return [newMessage, ...prev];
                });

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
            const typingStatus = payload.new as { user_id: string; is_typing: boolean };
            if (typingStatus.user_id === recipientId) {
              setRecipientTyping(typingStatus.is_typing);
            }
          }
        )
        .subscribe((status, error) => {
          console.log("Subscription status:", status, error ? error.message : "");

          if (status === 'SUBSCRIBED') {
            console.log("Successfully subscribed to chat channel");
            setConnectionStatus("connected");
            retryCountRef.current = 0;
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.warn("Subscription error, retrying...");
            setConnectionStatus("disconnected");
            retryCountRef.current += 1;
            retryTimeout = setTimeout(setupSubscriptions, retryDelay);
          }
        });
    };

    setupSubscriptions();

    return () => {
      // Cleanup function
      if (subscriptionRef.current && supabase) {
        supabase.removeChannel(subscriptionRef.current).catch(console.error);
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      retryCountRef.current = 0;
    };
  }, [userId, recipientId, dispatch]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: 80,
    offset: 80 * index,
    index,
  }), []);

  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <View
      style={[
        styles.message,
        item.sender_id === userId ? styles.myMessage : styles.theirMessage,
      ]}
    >
      <Text style={styles.messageText}>{item.content || item.encrypted_content}</Text>
      <View style={styles.messageFooter}>
        <Text style={styles.time}>
          {new Date(item.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
        {item.sender_id === userId && (
          <Ionicons
            name={
              item.status === "read"
                ? "checkmark-done"
                : item.status === "delivered"
                ? "checkmark-circle"
                : "time"
            }
            size={16}
            color={item.status === "read" ? "#FFD700" : "rgba(255, 255, 255, 0.6)"}
            style={styles.statusIcon}
          />
        )}
      </View>
    </View>
  ), [userId]);

  return (
    <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFD700" />
        </TouchableOpacity>
        <Text style={styles.title}>Chat</Text>
        {connectionStatus === "disconnected" && (
          <Text style={styles.connectionWarning}>Offline</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
          enabled
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.messagesContainer}>
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                inverted
                contentContainerStyle={styles.messages}
                initialNumToRender={20}
                maxToRenderPerBatch={10}
                windowSize={5}
                getItemLayout={getItemLayout}
                removeClippedSubviews={true}
                keyboardShouldPersistTaps="handled"
              />
              {recipientTyping && (
                <View style={styles.typingIndicator}>
                  <Text style={styles.typingText}>User is typing...</Text>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={(text) => {
                setNewMessage(text);
                handleTyping();
              }}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              multiline
              returnKeyType="default"
            />
            <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
              <Ionicons name="send" size={20} color="#FFD700" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    zIndex: 10,
  },
  title: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  connectionWarning: {
    color: "#FF5555",
    fontSize: 14,
    marginLeft: 10,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messagesContainer: {
    flex: 1,
    position: 'relative',
  },
  messages: {
    padding: 15,
    paddingBottom: 30,
  },
  message: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    borderBottomRightRadius: 0,
  },
  theirMessage: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderBottomLeftRadius: 0,
  },
  messageText: {
    color: "white",
    fontSize: 16,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  time: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
  },
  statusIcon: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#333",
    backgroundColor: "#1a1a1a",
    paddingBottom: Platform.OS === "ios" ? 30 : 15, // Extra padding for iOS
    position: 'relative',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: "white",
    marginRight: 10,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  typingIndicator: {
    padding: 10,
    alignItems: "flex-start",
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  typingText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    fontStyle: "italic",
  },
});