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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Feather } from "@expo/vector-icons";
// Add this interface at the top of your file, after the imports
interface RoomMessage {
  id: string;
  room_id: string;
  sender_id: string;
  encrypted_content: string;
  created_at: string;
  username?: string;
  profiles?: {
    username: string;
  };
}
export default function RoomChat() {
  const { id } = useLocalSearchParams();
  
  
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [room, setRoom] = useState(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [userId, setUserId] = useState(null);
  const textInputRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    const getUser = async () => {
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
  }, []);

  useEffect(() => {
    if (!userId) return;

    const checkJoinStatus = async () => {
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
    };
    checkJoinStatus();
  }, [id, userId]);

  useEffect(() => {
    if (!userId) return;

    const loadInitialData = async () => {
      try {
        // Load room data
        const { data: roomData, error: roomError } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", id)
          .single();

        if (roomError) throw roomError;

        // Load messages with sender usernames using an explicit join
        const { data: messagesData, error: messagesError } = await supabase
          .from("room_messages")
          .select(`
            id,
            room_id,
            sender_id,
            encrypted_content,
            created_at,
            profiles!fk_room_messages_sender_id (
              username
            )
          `)
          .eq("room_id", id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (messagesError) throw messagesError;

        setRoom(roomData);
        setMessages(
          messagesData?.map((msg) => ({
            ...msg,
            username: msg.profiles?.username || "Deleted User",
          })) || []
        );
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    };

    loadInitialData();

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
          const newMessage = payload.new;
          const { data: sender, error } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", newMessage.sender_id)
            .single();

          if (error) {
            console.error("Error fetching sender:", error);
            return;
          }

          setMessages((prev) => [
            {
              ...newMessage,
              username: sender?.username || "Deleted User",
            },
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id, userId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const { data, error } = await supabase.from("room_messages").insert({
        room_id: id,
        sender_id: userId,
        encrypted_content: newMessage.trim(),
      }).select('*, profiles!fk_room_messages_sender_id (username)').single();

      if (error) throw error;

      // Update local state immediately with proper typing
      setMessages((prev: RoomMessage[]) => [
        {
          ...data,
          username: data.profiles?.username || "Deleted User",
        },
        ...prev,
      ]);

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleDeleteMessage = async (messageId) => {
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

  const renderMessage = ({ item }) => {
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

  return (
    <LinearGradient
      colors={["#000000", "#1a1a1a", "#2a2a2a"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
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
            inverted
            contentContainerStyle={styles.messageList}
            style={styles.flatList}
          />
        </View>

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
              <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
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
  },
  content: {
    flex: 1,
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
    borderColor: "rgba(255, 229 at 92, 0.3)",
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
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 12,
    marginHorizontal: 16,
    maxWidth: "85%",
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
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 229, 92, 0.2)",
    backgroundColor: "rgba(40, 50, 50, 0.5)",
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
