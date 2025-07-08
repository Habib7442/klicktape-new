import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import moment from "moment";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { notificationsAPI } from "@/lib/notificationsApi";
import { useTheme } from "@/src/context/ThemeContext";
import ThemedGradient from "@/components/ThemedGradient";

interface Notification {
  id: string;
  type: "like" | "comment" | "follow" | "mention"; // Added "mention" type
  sender_id: string;
  sender: {
    username: string;
    avatar_url: string;
  };
  post_id?: string;
  comment_id?: string;
  created_at: string;
  is_read: boolean;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };

    fetchUser();
  }, []);

  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      console.log("Fetching notifications for user:", userId);
      const data = await notificationsAPI.getNotifications(userId);
      console.log("Fetched notifications:", data);
      setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchNotifications();

      const subscription = supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${userId}`,
          },
          async (payload) => {
            console.log("New notification received:", payload);
            const newNotification = payload.new as any;
            const { data: senderData, error } = await supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("id", newNotification.sender_id)
              .single();

            console.log("Sender data from profiles:", senderData);
            console.log("Sender data error:", error);

            if (!error && senderData) {
              setNotifications((prev) => [
                {
                  id: newNotification.id,
                  type: newNotification.type,
                  sender_id: newNotification.sender_id,
                  sender: {
                    username: senderData.username,
                    avatar: senderData.avatar_url,
                  },
                  post_id: newNotification.post_id,
                  comment_id: newNotification.comment_id,
                  created_at: newNotification.created_at,
                  is_read: newNotification.is_read,
                },
                ...prev,
              ]);
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [userId]);

  const handleNotificationPress = async (notification: Notification) => {
    try {
      console.log("Handling notification press:", notification);
      await notificationsAPI.markAsRead(notification.id);
      console.log("Marked notification as read:", notification.id);

      if (notification.type === "follow") {
        router.push({
          pathname: "/userProfile/[id]",
          params: {
            id: notification.sender_id,
            avatar: notification.sender.avatar_url,
          },
        });
      } else if (notification.post_id) {
        router.push({
          pathname: "/post/[id]",
          params: { id: notification.post_id },
        });
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );
    } catch (error) {
      console.error("Error handling notification:", error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationsAPI.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const renderNotification = ({
    item: notification,
  }: {
    item: Notification;
  }) => {
    const timeAgo = moment(notification.created_at).fromNow();

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            borderBottomColor: colors.cardBorder,
            backgroundColor: colors.card
          },
          !notification.is_read && {
            backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.05)'
          },
        ]}
        onPress={() => handleNotificationPress(notification)}
      >
        <Image
          source={{ uri: notification.sender.avatar_url }}
          style={[styles.avatar, { borderColor: colors.cardBorder }]}
        />
        <View style={styles.notificationContent}>
          <Text className="font-rubik-bold" style={[styles.username, { color: colors.text }]}>
            {notification.sender.username}
          </Text>
          <Text className="font-rubik-medium" style={[styles.notificationText, { color: colors.textSecondary }]}>
            {notification.type === "like" && "liked your post"}
            {notification.type === "comment" && "commented on your post"}
            {notification.type === "follow" && "started following you"}
            {notification.type === "mention" && "mentioned you in a post"}
          </Text>
          <Text className="font-rubik-medium" style={[styles.timeAgo, { color: colors.textTertiary }]}>
            {timeAgo}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            handleDelete(notification.id);
          }}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
        {!notification.is_read && (
          <View style={styles.unreadDot}>
            <Ionicons name="ellipse" size={10} color={isDarkMode ? '#808080' : '#606060'} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <ThemedGradient style={styles.centered}>
        <ActivityIndicator size="large" color={isDarkMode ? '#808080' : '#606060'} />
      </ThemedGradient>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedGradient style={styles.container}>
      <View style={[styles.header, {
        borderBottomColor: colors.cardBorder,
        backgroundColor: colors.backgroundSecondary
      }]}>
        <Text className="font-rubik-bold" style={[styles.headerTitle, { color: colors.text }]}>
          Notifications
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.closeButton, {
            backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
            borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.5)' : 'rgba(128, 128, 128, 0.3)'
          }]}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchNotifications();
            }}
            tintColor={isDarkMode ? '#808080' : '#606060'}
            colors={[isDarkMode ? '#808080' : '#606060']}
            progressBackgroundColor={colors.backgroundSecondary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text className="font-rubik-medium" style={[styles.emptyText, { color: colors.textSecondary }]}>
              No notifications yet
            </Text>
          </View>
        }
      />
      </ThemedGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  notificationItem: {
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
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    marginBottom: 4,
  },
  notificationText: {
    fontSize: 14,
  },
  timeAgo: {
    fontSize: 12,
    marginTop: 4,
  },
  unreadDot: {
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
  },
  deleteButton: {
    padding: 8,
  },
});
