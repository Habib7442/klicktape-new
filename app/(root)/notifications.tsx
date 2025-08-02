import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
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
import { animationPerformanceUtils } from "@/lib/utils/animationPerformance";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/src/store/store";
import { removeNotification, markNotificationAsRead } from "@/src/store/slices/notificationSlice";

interface Notification {
  id: string;
  type: "like" | "comment" | "follow" | "mention"; // Added "mention" type
  sender_id: string;
  sender: {
    username: string;
    avatar_url: string;
  };
  post_id?: string;
  reel_id?: string; // Add reel_id support
  comment_id?: string;
  created_at: string;
  is_read: boolean;
}

// Memoized notification item component for better performance
const NotificationItem = memo(({ notification, colors, isDarkMode, onPress, onDelete }: {
  notification: Notification;
  colors: any;
  isDarkMode: boolean;
  onPress: (notification: Notification) => void;
  onDelete: (id: string) => void;
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
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: notification.sender.avatar_url }}
        style={[styles.avatar, { borderColor: colors.cardBorder }]}
        {...animationPerformanceUtils.getOptimizedImageProps()}
      />
      <View style={styles.notificationContent}>
        <Text className="font-rubik-bold" style={[styles.username, { color: colors.text }]}>
          {notification.sender.username}
        </Text>
        <Text className="font-rubik-medium" style={[styles.notificationText, { color: colors.textSecondary }]}>
          {notification.type === "like" && notification.reel_id && "liked your reel"}
          {notification.type === "like" && notification.post_id && "liked your post"}
          {notification.type === "comment" && notification.reel_id && "commented on your reel"}
          {notification.type === "comment" && notification.post_id && "commented on your post"}
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
          onDelete(notification.id);
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
});

export default function NotificationsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const dispatch = useDispatch();

  // Get notifications from Redux store (managed by useSupabaseNotificationManager)
  const notifications = useSelector((state: RootState) => state.notifications.notifications);



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
      // Note: Notifications are managed by Redux store via useSupabaseNotificationManager
      // This fetch is mainly for initial load and refresh
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

      // Note: Real-time subscription is handled by useSupabaseNotificationManager in home.tsx
      // to prevent duplicate notifications. This page will get updates via Redux store.
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
      } else if (notification.reel_id) {
        router.push({
          pathname: "/reel/[id]",
          params: { id: notification.reel_id },
        });
      } else if (notification.post_id) {
        router.push({
          pathname: "/post/[id]",
          params: { id: notification.post_id },
        });
      }

      // Update Redux store to mark as read
      dispatch(markNotificationAsRead(notification.id));
    } catch (error) {
      console.error("Error handling notification:", error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationsAPI.deleteNotification(notificationId);
      // Remove from Redux store
      dispatch(removeNotification(notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  // Optimized render function using memoized component
  const renderNotification = useCallback(({
    item: notification,
  }: {
    item: Notification;
  }) => (
    <NotificationItem
      notification={notification}
      colors={colors}
      isDarkMode={isDarkMode}
      onPress={handleNotificationPress}
      onDelete={handleDelete}
    />
  ), [colors, isDarkMode, handleNotificationPress, handleDelete]);

  // Memoize FlatList props for better performance
  const flatListProps = useMemo(() => ({
    ...animationPerformanceUtils.getOptimizedFlatListProps(70),
    extraData: `${isDarkMode}-${notifications.length}`,
  }), [isDarkMode, notifications.length]);

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
        // Performance optimizations using memoized props
        {...flatListProps}
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
