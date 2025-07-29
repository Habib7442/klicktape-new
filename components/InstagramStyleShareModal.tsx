import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/src/context/ThemeContext";
import CachedImage from "@/components/CachedImage";
import { messagesAPI } from "@/lib/messagesApi";
import { postsAPI } from "@/lib/postsApi";
import { supabase } from "@/lib/supabase";
import socketService from "@/lib/socketService";
import { Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

interface User {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
}

interface Conversation {
  userId: string;
  username: string;
  avatar: string;
  lastMessage: string;
}

interface Post {
  id: string;
  caption: string;
  image_urls: string[];
  user: {
    username: string;
  };
}

interface Reel {
  id: string;
  caption: string;
  video_url: string;
  thumbnail_url: string;
  user: {
    username: string;
  };
}

interface InstagramStyleShareModalProps {
  isVisible: boolean;
  onClose: () => void;
  post?: Post;
  reel?: Reel;
  onShareSuccess?: () => void;
}

const InstagramStyleShareModal: React.FC<InstagramStyleShareModalProps> = ({
  isVisible,
  onClose,
  post,
  reel,
  onShareSuccess,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [recentConversations, setRecentConversations] = useState<
    Conversation[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<number | null>(null);

  useEffect(() => {
    if (isVisible) {
      initializeModal();
      setSearchQuery("");
      setSearchResults([]);
    } else {
      setRecentConversations([]);
      setCurrentUserId(null);
    }
  }, [isVisible]);

  useEffect(() => {
    if (currentUserId && isVisible) {
      fetchRecentConversations();
    }
  }, [currentUserId, isVisible]);

  const initializeModal = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    } catch (error) {
      console.error("Error getting current user:", error);
    }
  };

  const fetchRecentConversations = async () => {
    if (!currentUserId) return;

    try {
      // Get all messages where user is sender or receiver (same as chat screen)
      const { data: messages, error } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          sender_id,
          receiver_id,
          created_at,
          is_read,
          message_type
        `)
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!messages || messages.length === 0) {
        setRecentConversations([]);
        return;
      }

      // Group messages by conversation partner
      const conversationMap = new Map<string, any>();

      for (const message of messages) {
        const otherId = (message as any).sender_id === currentUserId ? (message as any).receiver_id : (message as any).sender_id;

        if (!conversationMap.has(otherId)) {
          conversationMap.set(otherId, message);
        }
      }

      // Get user details for each conversation partner
      const conversationUsers = await Promise.all(
        Array.from(conversationMap.entries()).slice(0, 6).map(async ([otherId, lastMessage]) => {
          const { data: userDoc, error: userError } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", otherId as string)
            .single();

          if (userError || !userDoc) {
            return null;
          }

          return {
            userId: otherId,
            username: (userDoc as any).username,
            avatar: (userDoc as any).avatar_url || "https://via.placeholder.com/50",
            lastMessage: messagesAPI.getMessagePreview((lastMessage as any).content, (lastMessage as any).message_type),
          };
        })
      );

      const validConversations = conversationUsers.filter(Boolean);
      setRecentConversations(validConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setRecentConversations([]);
    }
  };

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const users = await postsAPI.searchUsers(query);
      // Convert to our expected format
      const formattedUsers = Array.isArray(users)
        ? users.slice(0, 10).map((user: any) => ({
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
          }))
        : [];
      setSearchResults(formattedUsers);
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debouncing
    const timeout = setTimeout(() => {
      searchUsers(text);
    }, 300);

    setSearchTimeout(timeout);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const shareContentToChat = async (
    recipientId: string,
    recipientUsername: string
  ) => {
    if (!currentUserId || sharing) return;

    setSharing(true);
    try {
      let sharedContent;
      let messageType;

      if (post) {
        sharedContent = JSON.stringify({
          type: "shared_post",
          post_id: post.id,
          post_caption: post.caption,
          post_image: post.image_urls[0],
          post_owner: post.user.username,
          shared_by: currentUserId,
          shared_at: new Date().toISOString(),
        });
        messageType = "shared_post" as const;
      } else if (reel) {
        sharedContent = JSON.stringify({
          type: "shared_reel",
          reel_id: reel.id,
          reel_caption: reel.caption,
          reel_video_url: reel.video_url,
          reel_thumbnail: reel.thumbnail_url,
          reel_owner: reel.user.username,
          shared_by: currentUserId,
          shared_at: new Date().toISOString(),
        });
        messageType = "shared_reel" as const;
      } else {
        return;
      }

      // Send via Socket.IO for real-time delivery
      const socketMessage = {
        sender_id: currentUserId,
        receiver_id: recipientId,
        content: sharedContent,
        is_read: false,
        message_type: messageType,
      };

      socketService.sendMessage({
        ...socketMessage,
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        created_at: new Date().toISOString(),
        status: "sent",
      });

      // Save to database in background
      messagesAPI
        .sendMessage(currentUserId, recipientId, sharedContent, messageType)
        .catch((dbError) => console.error("Database save error:", dbError));

      const contentType = post ? "Post" : "Reel";
      Alert.alert("Sent!", `${contentType} shared with ${recipientUsername}`, [
        {
          text: "OK",
          onPress: () => {
            onClose();
            onShareSuccess?.();
          },
        },
      ]);
    } catch (error) {
      console.error("Error sharing content:", error);
      Alert.alert("Error", "Failed to share content");
    } finally {
      setSharing(false);
    }
  };

  const handleExternalShare = async () => {
    try {
      if (post && post.image_urls.length > 0) {
        await Share.share({
          message: `Check out this post by ${post.user.username} on Klicktape: ${post.caption}`,
          url: post.image_urls[0],
        });
      } else if (reel) {
        await Share.share({
          message: `Check out this reel: ${reel.caption}\n${reel.video_url}`,
        });
      }
      onClose();
    } catch (error) {
      console.error("Error sharing externally:", error);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => shareContentToChat(item.id, item.username)}
      disabled={sharing}
    >
      <View style={styles.userContainer}>
        <CachedImage
          uri={item.avatar_url || "https://via.placeholder.com/50"}
          style={styles.avatar}
          showLoader={true}
          fallbackUri="https://via.placeholder.com/50"
        />
        <Text
          style={[styles.username, { color: colors.text }]}
          numberOfLines={1}
        >
          {item.username}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => shareContentToChat(item.userId, item.username)}
      disabled={sharing}
    >
      <View style={styles.userContainer}>
        <CachedImage
          uri={item.avatar}
          style={styles.avatar}
          showLoader={true}
          fallbackUri="https://via.placeholder.com/50"
        />
        <Text
          style={[styles.username, { color: colors.text }]}
          numberOfLines={1}
        >
          {item.username}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1">
      <Modal
        visible={isVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View
            style={[styles.container, { backgroundColor: colors.background }]}
          >
            {/* Header */}
            <View
              style={[
                styles.header,
                {
                  borderBottomColor: isDarkMode
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.1)",
                },
              ]}
            >
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Share
              </Text>
              <View style={styles.placeholder} />
            </View>

            {/* Search Bar */}
            <View
              style={[
                styles.searchContainer,
                { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <Feather name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search"
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={handleSearchChange}
              />
            </View>

            {/* Content */}
            <View style={styles.content}>
              {searchQuery ? (
                // Search Results
                <View style={styles.section}>
                  {loading ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary}
                      style={styles.loader}
                    />
                  ) : (
                    <FlatList
                      data={searchResults}
                      renderItem={renderUserItem}
                      keyExtractor={(item) => item.id}
                      numColumns={3}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.gridContainer}
                    />
                  )}
                </View>
              ) : (
                // Recent Conversations
                <View style={styles.section}>
                  {recentConversations.length > 0 ? (
                    <FlatList
                      data={recentConversations}
                      renderItem={renderConversationItem}
                      keyExtractor={(item) => item.userId}
                      numColumns={3}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.gridContainer}
                    />
                  ) : (
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      No recent conversations
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Bottom Actions */}
            <View
              style={[
                styles.bottomActions,
                {
                  borderTopColor: isDarkMode
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.1)",
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
                onPress={handleExternalShare}
              >
                <Feather name="share" size={24} color={colors.text} />
                <Text style={[styles.actionText, { color: colors.text }]}>
                  Share
                </Text>
              </TouchableOpacity>
            </View>

            {sharing && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          </View>
        </View>
      </Modal>
      
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    height: height * 0.6, // 60% of screen height
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Rubik-SemiBold",
  },
  placeholder: {
    width: 32,
  },
  searchContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: "Rubik-Regular",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    flex: 1,
  },
  gridContainer: {
    paddingVertical: 8,
  },
  userItem: {
    flex: 1,
    alignItems: "center" as const,
    paddingVertical: 12,
    paddingHorizontal: 8,
    maxWidth: width / 3,
  },
  userContainer: {
    alignItems: "center" as const,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  username: {
    fontSize: 12,
    fontFamily: "Rubik-Medium",
    textAlign: "center" as const,
  },
  bottomActions: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 0.5,
  },
  actionButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  actionText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: "Rubik-Medium",
  },
  loader: {
    marginTop: 20,
  },
  loadingOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  emptyText: {
    textAlign: "center" as const,
    fontSize: 16,
    marginTop: 40,
    fontFamily: "Rubik-Regular",
  },
});

export default InstagramStyleShareModal;
