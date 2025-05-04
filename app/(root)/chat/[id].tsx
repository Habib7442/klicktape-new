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
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionRef = useRef<{ message: any; typing: any }>({ message: null, typing: null });
  const retryCountRef = useRef<number>(0);
  const maxRetries = 10;
  const dispatch = useDispatch();
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

  const setCachedMessages = useCallback(
    (chatId: string, messages: Message[]) => {
      messageCache.current[chatId] = {
        messages,
        lastUpdated: Date.now(),
      };
    },
    []
  );

  const loadMessages = async (currentUserId: string, recipient: string) => {
    try {
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
        console.log("Using cached messages");
        setMessages(cachedMessages);
        setLoading(false);
        return;
      }

      console.log("Fetching messages from database");
      const messages = await messagesAPI.getConversationBetweenUsers(
        currentUserId,
        recipient
      );

      const unreadMessages = messages.documents.filter(
        (msg) => msg.sender_id === recipient && !msg.is_read
      );

      if (unreadMessages.length > 0) {
        console.log("Marking messages as read:", unreadMessages.length);
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
      setLoading(false);
    } catch (error) {
      console.error("Failed to load messages:", error);
      Alert.alert("Error", "Failed to load messages: " + (error as Error).message);
      setLoading(false);
      router.back();
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!userId || !recipientId) {
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

  const handleTyping = async () => {
    if (!userId || !recipientId) return;
    if (!isTyping) {
      setIsTyping(true);
      try {
        await messagesAPI.setTypingStatus(userId, [userId, recipientId].sort().join("-"), true);
      } catch (error) {
        console.error("Failed to set typing status:", error);
      }
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false);
      try {
        await messagesAPI.setTypingStatus(userId, [userId, recipientId].sort().join("-"), false);
      } catch (error) {
        console.error("Failed to clear typing status:", error);
      }
    }, 3000);
  };

  const refreshMessages = async () => {
    if (!userId || !recipientId) return;
    setLoading(true);
    await loadMessages(userId, recipientId as string);
    setLoading(false);
  };

  useEffect(() => {
    const setupChat = async () => {
      try {
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
        setLoading(true);
        await loadMessages(user.id, recipientId);
      } catch (error) {
        console.error("Chat setup error:", error);
        Alert.alert("Error", "Failed to set up chat: " + (error as Error).message);
        router.back();
      } finally {
        setLoading(false);
      }
    };

    setupChat();
  }, [recipientId]);

  useEffect(() => {
    if (!userId || !recipientId) return;

    const chatId = [userId, recipientId].sort().join("-");
    let retryTimeout: NodeJS.Timeout | null = null;

    const subscribe = () => {
      if (retryCountRef.current >= maxRetries) {
        console.error("Max retries reached for subscriptions");
        setConnectionStatus("disconnected");
        Alert.alert(
          "Connection Error",
          "Unable to connect to real-time chat. Please check your network or refresh.",
          [
            { text: "Refresh", onPress: refreshMessages },
            { text: "OK" },
          ]
        );
        return;
      }

      // Clean up existing subscriptions
      if (subscriptionRef.current.message) {
        supabase.removeChannel(subscriptionRef.current.message);
        subscriptionRef.current.message = null;
      }
      if (subscriptionRef.current.typing) {
        supabase.removeChannel(subscriptionRef.current.typing);
        subscriptionRef.current.typing = null;
      }

      subscriptionRef.current.message = supabase
        .channel(`messages:${chatId}`, { configs: { broadcast: { ack: true } } })
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `or(and(sender_id.eq.${userId},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${userId}))`,
          },
          (payload) => {
            console.log("Message INSERT event:", payload);
            const message = payload.new as Message;

            setMessages((prev) => {
              if (prev.some((m) => m.id === message.id)) {
                console.log("Duplicate message skipped:", message.id);
                return prev;
              }
              console.log("Adding new message:", message);
              return [message, ...prev];
            });

            setCachedMessages(chatId, [message, ...messages]);

            if (message.sender_id !== userId && !message.is_read) {
              console.log("Marking message as read:", message.id);
              messagesAPI.markAsRead(message.id).catch((error) =>
                console.error("Failed to mark as read:", error)
              );
              dispatch(setUnreadMessageCount(0));
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "messages",
            filter: `or(and(sender_id.eq.${userId},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${userId}))`,
          },
          (payload) => {
            console.log("Message UPDATE event:", payload);
            const message = payload.new as Message;

            setMessages((prev) =>
              prev.map((m) =>
                m.id === message.id
                  ? { ...m, is_read: message.is_read, status: message.is_read ? "read" : m.status }
                  : m
              )
            );
            setCachedMessages(chatId, messages.map((m) =>
              m.id === message.id
                ? { ...m, is_read: message.is_read, status: message.is_read ? "read" : m.status }
                : m
              ));
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "messages",
            filter: `or(and(sender_id.eq.${userId},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${userId}))`,
          },
          (payload) => {
            console.log("Message DELETE event:", payload);
            const oldMessage = payload.old as Message;

            setMessages((prev) => prev.filter((m) => m.id !== oldMessage.id));
            setCachedMessages(chatId, messages.filter((m) => m.id !== oldMessage.id));
          }
        )
        .subscribe((status, error) => {
          console.log("Message subscription status:", status, error ? error.message : "");
          if (status === "SUBSCRIBED") {
            console.log("Message subscription active for chat:", chatId);
            setConnectionStatus("connected");
            retryCountRef.current = 0;
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
            console.warn("Message subscription error, retrying in", 10 + retryCountRef.current * 10, "s...");
            setConnectionStatus("disconnected");
            retryCountRef.current += 1;
            retryTimeout = setTimeout(subscribe, (10 + retryCountRef.current * 10) * 1000);
          }
        });

      subscriptionRef.current.typing = supabase
        .channel(`typing:${chatId}`, { configs: { broadcast: { ack: true } } })
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "typing_status",
            filter: `chat_id=eq.${chatId}`,
          },
          (payload) => {
            console.log("Typing event:", payload);
            const typingStatus = payload.new as { user_id: string; is_typing: boolean };
            if (typingStatus.user_id === recipientId) {
              setRecipientTyping(typingStatus.is_typing);
            }
          }
        )
        .subscribe((status, error) => {
          console.log("Typing subscription status:", status, error ? error.message : "");
          if (status === "SUBSCRIBED") {
            console.log("Typing subscription active for chat:", chatId);
            setConnectionStatus("connected");
            retryCountRef.current = 0;
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
            console.warn("Typing subscription error, retrying in", 10 + retryCountRef.current * 10, "s...");
            setConnectionStatus("disconnected");
            retryCountRef.current += 1;
            retryTimeout = setTimeout(subscribe, (10 + retryCountRef.current * 10) * 1000);
          }
        });
    };

    subscribe();

    return () => {
      if (subscriptionRef.current.message) {
        supabase.removeChannel(subscriptionRef.current.message);
        subscriptionRef.current.message = null;
      }
      if (subscriptionRef.current.typing) {
        supabase.removeChannel(subscriptionRef.current.typing);
        subscriptionRef.current.typing = null;
      }
      if (retryTimeout) clearTimeout(retryTimeout);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      messageCache.current = {};
      retryCountRef.current = 0;
      setConnectionStatus("disconnected");
    };
  }, [userId, recipientId, dispatch]); // Removed messages from dependencies

  useEffect(() => {
    console.log("Messages state updated:", messages.length, "messages");
  }, [messages]);

  const getItemLayout = (data: any, index: number) => ({
    length: 80,
    offset: 80 * index,
    index,
  });

  const renderMessage = ({ item }: { item: Message }) => (
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
  );

  return (
    <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFD700" />
          </TouchableOpacity>
          <Text style={styles.title}>Chat</Text>
          {connectionStatus === "disconnected" && (
            <TouchableOpacity onPress={refreshMessages}>
              <Ionicons name="refresh" size={24} color="#FF5555" style={styles.refreshIcon} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#FFD700" />
          </View>
        ) : (
          <>
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
            />
            {recipientTyping && (
              <View style={styles.typingIndicator}>
                <Text style={styles.typingText}>User is typing...</Text>
              </View>
            )}
          </>
        )}

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
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  title: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
    flex: 1,
  },
  refreshIcon: {
    marginLeft: 10,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messages: {
    padding: 15,
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
  },
  typingText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    fontStyle: "italic",
  },
});