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
import { useRouter } from "expo-router";
import moment from "moment";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { notificationsAPI } from "@/lib/notificationsApi";

interface Notification {
  id: string;
  type: "like" | "comment" | "follow";
  sender_id: string;
  sender: {
    username: string;
    avatar: string;
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

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };

    fetchUser();
  }, []);

  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      const data = await notificationsAPI.getNotifications(userId);
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
            const newNotification = payload.new as any;
            const { data: senderData, error } = await supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("id", newNotification.sender_id)
              .single();

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
      await notificationsAPI.markAsRead(notification.id);

      if (notification.type === "follow") {
        router.push({
          pathname: "/userProfile/[id]",
          params: {
            id: notification.sender_id,
            avatar: notification.sender.avatar,
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
          !notification.is_read && styles.unreadNotification,
        ]}
        onPress={() => handleNotificationPress(notification)}
      >
        <Image
          source={{ uri: notification.sender.avatar }}
          style={styles.avatar}
        />
        <View style={styles.notificationContent}>
          <Text className="font-rubik-bold" style={styles.username}>
            {notification.sender.username}
          </Text>
          <Text className="font-rubik-medium" style={styles.notificationText}>
            {notification.type === "like" && "liked your post"}
            {notification.type === "comment" && "commented on your post"}
            {notification.type === "follow" && "started following you"}
          </Text>
          <Text className="font-rubik-medium" style={styles.timeAgo}>
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
          <Ionicons name="trash-outline" size={20} color="#FFD700" />
        </TouchableOpacity>
        {!notification.is_read && (
          <View style={styles.unreadDot}>
            <Ionicons name="ellipse" size={10} color="#FFD700" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <LinearGradient
        colors={["#000000", "#1a1a1a", "#2a2a2a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.centered}
      >
        <ActivityIndicator size="large" color="#FFD700" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#000000", "#1a1a1a", "#2a2a2a"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text className="font-rubik-bold" style={styles.headerTitle}>
          Notifications
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color="#FFD700" />
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
            tintColor="#FFD700"
            colors={["#FFD700"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text className="font-rubik-medium" style={styles.emptyText}>
              No notifications yet
            </Text>
          </View>
        }
      />
    </LinearGradient>
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
    borderBottomColor: "rgba(255, 215, 0, 0.2)",
  },
  headerTitle: {
    fontSize: 20,
    color: "#FFD700",
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  notificationItem: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 215, 0, 0.2)",
    alignItems: "center",
  },
  unreadNotification: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    color: "#ffffff",
    marginBottom: 4,
  },
  notificationText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },
  timeAgo: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
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
    color: "rgba(255, 255, 255, 0.7)",
  },
  deleteButton: {
    padding: 8,
  },
});