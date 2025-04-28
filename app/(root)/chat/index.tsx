import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { AntDesign } from "@expo/vector-icons";
import { messagesAPI } from "@/lib/messagesApi";

export default function ChatList() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error("No authenticated user found");
          setLoading(false);
          return;
        }

        const messages = await messagesAPI.getUserConversations(user.id);

        if (!messages?.documents || messages.documents.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        const uniqueUserIds = new Set();
        messages.documents.forEach((msg) => {
          const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          uniqueUserIds.add(otherUserId);
        });

        const conversationUsers = await Promise.all(
          Array.from(uniqueUserIds).map(async (otherId) => {
            const { data: userDoc, error } = await supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("id", otherId)
              .single();

            if (error) throw error;

            const lastMessage = messages.documents
              .filter((msg) => msg.sender_id === otherId || msg.receiver_id === otherId)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

            return {
              userId: otherId,
              username: userDoc.username,
              avatar: userDoc.avatar_url || "https://via.placeholder.com/50",
              lastMessage: lastMessage.content,
              timestamp: lastMessage.created_at,
              isRead: lastMessage.is_read,
            };
          })
        );

        const sortedConversations = conversationUsers.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setConversations(sortedConversations);
        setLoading(false);
      } catch (error) {
        console.error("Error loading conversations:", error);
        setConversations([]);
        setLoading(false);
      }
    };

    loadConversations();

    const interval = setInterval(() => {
      loadConversations();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const renderConversation = ({ item }: any) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => router.push(`/chat/${item.userId}`)}
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.userInfo}>
        <Text className="font-rubik-bold" style={styles.username}>
          {item.username}
        </Text>
        <Text
          className="font-rubik-medium"
          style={styles.lastMessage}
          numberOfLines={1}
        >
          {item.lastMessage}
        </Text>
      </View>
      <Text className="font-rubik-medium" style={styles.timestamp}>
        {new Date(item.timestamp).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={["#000000", "#1a1a1a", "#2a2a2a"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <AntDesign name="arrowleft" size={24} color="#FFD700" />
        </TouchableOpacity>
        <Text className="font-rubik-bold" style={styles.title}>
          Messages
        </Text>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text className="font-rubik-medium" style={styles.emptyText}>
            No messages yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.flatListContent}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 215, 0, 0.2)",
  },
  title: {
    fontSize: 24,
    color: "#FFD700",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
    marginRight: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  userItem: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 215, 0, 0.2)",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.05)",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  username: {
    fontSize: 16,
    color: "#ffffff",
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
  },
  timestamp: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
  },
  flatListContent: {
    paddingBottom: 20,
  },
});