import React, { useState, useEffect, useRef } from "react";
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
  Keyboard,
  RefreshControl,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Feather } from "@expo/vector-icons";
import { RealtimeChannel } from "@supabase/supabase-js";

interface RoomMessage {
  id: string;
  room_id: string;
  sender_id: string;
  encrypted_content: string;
  created_at: string;
  username?: string;
  profiles?: {
    username: string;
    anonymous_room_name?: string;
  };
}

interface Room {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  description?: string;
}

export default function RoomChat() {
  const { id } = useLocalSearchParams();

  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const textInputRef = useRef<TextInput | null>(null);
  const flatListRef = useRef<FlatList | null>(null);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const getUser = async () => {
      if (!supabase) {
        console.error("Supabase client not available");
        router.replace("/sign-in");
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          console.log("Authenticated user ID:", user.id);
        } else {
          console.warn("No authenticated user found");
          router.replace("/sign-in");
        }
      } catch (error) {
        console.error("Error getting user from Supabase:", error);
        router.replace("/sign-in");
      }
    };

    getUser();
  }, [supabase]); // Add supabase to dependency array to re-run if it becomes available

  useEffect(() => {
    if (!userId || !supabase || !id) {
      console.log("Waiting for userId, supabase client, and room id to be available before checking join status");
      return;
    }

    const checkJoinStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("room_participants")
          .select("*")
          .eq("room_id", id)
          .eq("user_id", userId);

        if (error) {
          console.error("Error checking join status:", error);
          return;
        }

        setIsJoined(data?.length > 0);
        console.log("Join status checked. User is", data?.length > 0 ? "joined" : "not joined");
      } catch (err) {
        console.error("Exception checking join status:", err);
      }
    };

    checkJoinStatus();
  }, [id, userId, supabase]);

  // Function to load initial data
  const loadInitialData = async () => {
    if (!userId || !supabase) {
      console.error("User ID or Supabase client not available");
      return;
    }

    try {
      // Load room data
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", id)
        .single();

      if (roomError) throw roomError;

      // Load messages with sender anonymous_room_name using an explicit join
      const { data: messagesData, error: messagesError } = await supabase
        .from("room_messages")
        .select(`
          id,
          room_id,
          sender_id,
          encrypted_content,
          created_at,
          profiles!fk_room_messages_sender_id (
            username,
            anonymous_room_name
          )
        `)
        .eq("room_id", id)
        .order("created_at", { ascending: true })
        .limit(50);

      if (messagesError) throw messagesError;

      setRoom(roomData);
      setMessages(
        messagesData?.map((msg) => ({
          ...msg,
          // Use anonymous_room_name if available, otherwise fall back to username or "Anonymous User"
          username: msg.profiles?.anonymous_room_name || msg.profiles?.username || "Anonymous User",
        })) || []
      );

      // Scroll to the bottom after loading messages
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: false });
        }
      }, 200);
    } catch (error) {
      console.error("Error loading initial data:", error);
    }
  };

  // Function to establish real-time subscription
  const setupRealtimeSubscription = () => {
    if (!userId || !id || subscriptionRef.current || !supabase) {
      console.error("Cannot setup subscription: missing userId, id, or supabase client, or subscription already exists");
      return;
    }

    try {
      console.log("Setting up real-time subscription for room:", id);

      // Create subscription for new messages
      const subscription = supabase
        .channel(`room_messages:room_id=${id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "room_messages",
            filter: `room_id=eq.${id}`,
          },
          async (payload) => {
            console.log("Received new message:", payload);
            const newMessage = payload.new;

            if (!supabase) {
              console.error("Supabase client not available for fetching sender");
              return;
            }

            // Fetch sender profile with anonymous_room_name
            const { data: sender, error } = await supabase
              .from("profiles")
              .select("username, anonymous_room_name")
              .eq("id", newMessage.sender_id)
              .single();

            if (error) {
              console.error("Error fetching sender:", error);
              return;
            }

            // Update messages state with new message
            setMessages((prev) => [
              ...prev,
              {
                ...newMessage,
                username: sender?.anonymous_room_name || sender?.username || "Anonymous User",
              } as RoomMessage,
            ]);

            // Scroll to the bottom after receiving a new message
            setTimeout(() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
              }
            }, 100);
          }
        )
        // Also listen for message deletions
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "room_messages",
            filter: `room_id=eq.${id}`,
          },
          (payload) => {
            console.log("Message deleted:", payload);
            // Remove the deleted message from state
            setMessages((prev) =>
              prev.filter((msg) => msg.id !== payload.old.id)
            );
          }
        )
        // Also listen for message updates
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "room_messages",
            filter: `room_id=eq.${id}`,
          },
          async (payload) => {
            console.log("Message updated:", payload);
            const updatedMessage = payload.new;

            if (!supabase) {
              console.error("Supabase client not available for fetching sender of updated message");
              return;
            }

            // Fetch sender profile with anonymous_room_name
            const { data: sender, error } = await supabase
              .from("profiles")
              .select("username, anonymous_room_name")
              .eq("id", updatedMessage.sender_id)
              .single();

            if (error) {
              console.error("Error fetching sender for updated message:", error);
              return;
            }

            // Update the specific message in state
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === updatedMessage.id
                  ? { ...updatedMessage, username: sender?.anonymous_room_name || sender?.username || "Anonymous User" } as RoomMessage
                  : msg
              )
            );
          }
        )
        .subscribe((status) => {
          console.log("Subscription status:", status);
          if (status === 'SUBSCRIBED') {
            console.log("Successfully subscribed to real-time updates for room:", id);
          }
        });

      // Store subscription reference for cleanup
      subscriptionRef.current = subscription;

    } catch (error) {
      console.error("Error setting up real-time subscription:", error);
    }
  };

  // Load initial data when component mounts or userId/id changes
  useEffect(() => {
    // Only load data when both userId and supabase are available
    if (userId && supabase && id) {
      loadInitialData();
    } else {
      console.log("Waiting for userId, supabase client, and room id to be available before loading data");
    }
  }, [id, userId, supabase]); // Add supabase to dependency array

  // Setup real-time subscription once when component mounts
  useEffect(() => {
    // Only set up subscription when both userId and supabase are available
    if (userId && supabase && id) {
      setupRealtimeSubscription();
    } else {
      console.log("Waiting for userId, supabase client, and room id to be available before setting up subscription");
    }

    // Cleanup function to unsubscribe when component unmounts
    return () => {
      if (subscriptionRef.current) {
        console.log("Cleaning up subscription for room:", id);
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [id, userId, supabase]); // Add supabase to dependency array

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!supabase) {
      console.error("Supabase client not available for sending message");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("room_messages")
        .insert({
          room_id: id,
          sender_id: userId,
          encrypted_content: newMessage.trim(),
        })
        .select("*, profiles!fk_room_messages_sender_id (username, anonymous_room_name)")
        .single();

      if (error) throw error;

      // Update local state immediately with proper typing
      setMessages((prev: RoomMessage[]) => [
        ...prev,
        {
          ...data,
          username: data.profiles?.anonymous_room_name || data.profiles?.username || "Anonymous User",
        },
      ]);

      setNewMessage("");
      // Scroll to the bottom after sending a message
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!supabase) {
      console.error("Supabase client not available for deleting message");
      return;
    }

    try {
      const { error } = await supabase
        .from("room_messages")
        .delete()
        .eq("id", messageId)
        .eq("sender_id", userId);

      if (error) throw error;
      setMessages(messages.filter((msg) => msg.id !== messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const handleLeaveRoom = async () => {
    if (!supabase) {
      console.error("Supabase client not available for leaving room");
      return;
    }

    setIsLeaving(true);
    try {
      const { error } = await supabase
        .from("room_participants")
        .delete()
        .eq("room_id", id)
        .eq("user_id", userId);

      if (error) throw error;
      setIsJoined(false);
      router.back();
    } catch (error) {
      console.error("Error leaving room:", error);
    } finally {
      setIsLeaving(false);
    }
  };

  const renderMessage = ({ item }: { item: RoomMessage }) => {
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
              {item.sender_id === userId ? "You" : item.username}
            </Text>
            {item.sender_id === userId && (
              <TouchableOpacity
                onPress={() => handleDeleteMessage(item.id)}
                style={styles.deleteButton}
              >
                <Feather name="trash-2" size={14} color="#FFE55C" />
              </TouchableOpacity>
            )}
          </View>
          <Text
            style={
              item.sender_id === userId
                ? styles.userMessageText
                : styles.otherMessageText
            }
          >
            {item.encrypted_content}
          </Text>
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
        </View>
      </View>
    );
  };

  // Handle keyboard behavior and ensure input is visible
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        // Ensure the input is focused when keyboard appears
        if (textInputRef.current) {
          textInputRef.current.focus();
        }

        // Scroll to the bottom to ensure the input is visible
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }
    );

    // Handle keyboard hiding
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        // Optional: blur the input when keyboard hides
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

  return (
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
            <Text style={styles.headerTitle}>
              {room?.name || "Anonymous Room"}
            </Text>
            {isJoined && (
              <TouchableOpacity
                onPress={handleLeaveRoom}
                style={styles.leaveButton}
                disabled={isLeaving}
              >
                {isLeaving ? (
                  <ActivityIndicator size="small" color="#FFE55C" />
                ) : (
                  <Text style={styles.leaveButtonText}>Leave</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.messageList, { justifyContent: 'flex-end' }]}
            style={[styles.flatList, { flexGrow: 1 }]}
            keyboardShouldPersistTaps="handled"
            inverted={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={async () => {
                  setRefreshing(true);
                  await loadInitialData();
                  setRefreshing(false);
                }}
                tintColor="#FFE55C"
                colors={["#FFE55C"]}
                progressBackgroundColor="rgba(0,0,0,0.5)"
              />
            }
          />

          <View style={styles.inputContainer}>
            {isJoined ? (
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={textInputRef}
                  style={styles.textInput}
                  placeholder="Type a message..."
                  placeholderTextColor="rgba(255, 229, 92, 0.7)"
                  value={newMessage}
                  onChangeText={setNewMessage}
                  multiline
                />
                <TouchableOpacity
                  onPress={sendMessage}
                  style={styles.sendButton}
                >
                  <Feather name="send" size={20} color="#FFE55C" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.notJoinedMessage}>
                <Text style={styles.notJoinedText}>
                  Join room to participate in chat
                </Text>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
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
  leaveButton: {
    borderWidth: 1,
    borderColor: "rgba(255, 229, 92, 0.3)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 25,
    backgroundColor: "rgba(255, 229, 92, 0.2)",
  },
  leaveButtonText: {
    fontSize: 14,
    fontFamily: "Rubik-Medium",
    color: "#FFE55C",
  },
  flatList: {
    flex: 1,
  },
  messageList: {
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 4,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageContainer: {
    marginBottom: 8, // Reduced bottom margin
    marginHorizontal: 4, // Reduced horizontal margin
    maxWidth: "100%", // Increased max width to use more screen space
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
  userTimestamp: {
    fontSize: 12,
    fontFamily: "Rubik-Regular",
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 4,
  },
  otherTimestamp: {
    fontSize: 12,
    fontFamily: "Rubik-Regular",
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 4,
  },
  deleteButton: {
    marginLeft: 8,
  },
  inputContainer: {
    padding: 8, // Reduced padding
    paddingHorizontal: 4, // Reduced horizontal padding
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 229, 92, 0.2)",
    backgroundColor: "rgba(40, 50, 50, 0.5)",
    position: 'relative',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    minHeight: 60, // Reduced minimum height
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
  notJoinedMessage: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 229, 92, 0.3)",
    alignItems: "center",
    backgroundColor: "rgba(255, 229, 92, 0.1)",
  },
  notJoinedText: {
    fontSize: 14,
    fontFamily: "Rubik-Medium",
    color: "rgba(255, 255, 255, 0.7)",
  },
});