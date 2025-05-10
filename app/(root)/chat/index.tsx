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
import { encryption } from "@/lib/encryption";
import { useTheme } from "@/src/context/ThemeContext";

export default function ChatList() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors, isDarkMode } = useTheme();

  useEffect(() => {
    const loadConversations = async () => {
      try {
        if (!supabase) {
          console.error("Supabase client not initialized");
          setLoading(false);
          return;
        }

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
            if (!supabase) {
              throw new Error("Supabase client not initialized");
            }

            const { data: userDoc, error } = await supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("id", otherId)
              .single();

            if (error) throw error;

            const lastMessage = messages.documents
              .filter((msg) => msg.sender_id === otherId || msg.receiver_id === otherId)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

            // Try to decrypt the last message if it's encrypted
            let decryptedContent = lastMessage.content;

            try {
              if (lastMessage.content && typeof lastMessage.content === 'string') {
                try {
                  // Check if it's JSON and has isEncrypted flag
                  const parsed = JSON.parse(lastMessage.content);
                  if (parsed.isEncrypted) {
                    // Create a chat room ID (consistent for both users)
                    const chatId = [user.id, otherId].sort().join("-");

                    // Try to decrypt the message
                    decryptedContent = await encryption.decryptMessage(lastMessage.content, chatId);
                  }
                } catch (e) {
                  // Not JSON or not encrypted, continue with original content
                  console.log("Not an encrypted message or parsing error:", e);
                }
              }
            } catch (decryptError) {
              console.error("Error decrypting last message:", decryptError);
              // Fall back to the original content
            }

            return {
              userId: otherId,
              username: userDoc.username,
              avatar: userDoc.avatar_url || "https://via.placeholder.com/50",
              lastMessage: decryptedContent,
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
      style={[styles.userItem, {
        backgroundColor: `${colors.primary}05`,
        borderBottomColor: `${colors.primary}20`
      }]}
      onPress={() => router.push(`/chat/${item.userId}`)}
    >
      <Image
        source={{ uri: item.avatar }}
        style={[styles.avatar, { borderColor: `${colors.primary}30` }]}
      />
      <View style={styles.userInfo}>
        <Text className="font-rubik-bold" style={[styles.username, { color: colors.text }]}>
          {item.username}
        </Text>
        <Text
          className="font-rubik-medium"
          style={[
            styles.lastMessage,
            { color: colors.textSecondary },
            item.lastMessage && item.lastMessage.includes("encrypted")
              ? [styles.encryptedMessage, { color: `${colors.primary}80` }]
              : null
          ]}
          numberOfLines={1}
        >
          {item.lastMessage && item.lastMessage.includes("encrypted")
            ? "🔒 " + item.lastMessage
            : item.lastMessage}
        </Text>
      </View>
      <Text className="font-rubik-medium" style={[styles.timestamp, { color: colors.textTertiary }]}>
        {new Date(item.timestamp).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={isDarkMode
        ? [colors.background, colors.backgroundSecondary, colors.backgroundTertiary]
        : [colors.background, colors.backgroundSecondary, colors.backgroundTertiary]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={[styles.header, { borderBottomColor: `${colors.primary}20` }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, {
            backgroundColor: `${colors.primary}10`,
            borderColor: `${colors.primary}30`
          }]}
        >
          <AntDesign name="arrowleft" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text className="font-rubik-bold" style={[styles.title, { color: colors.primary }]}>
          Messages
        </Text>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text className="font-rubik-medium" style={[styles.emptyText, { color: colors.textSecondary }]}>
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
  },
  title: {
    fontSize: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
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
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  username: {
    fontSize: 16,
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
  },
  encryptedMessage: {
    fontStyle: "italic",
  },
  timestamp: {
    fontSize: 12,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
  },
  flatListContent: {
    paddingBottom: 20,
  },
});