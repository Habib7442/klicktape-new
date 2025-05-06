import {
  View,
  SafeAreaView,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";
import { router, useFocusEffect } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import {
  resetUnreadMessageCount,
  setUnreadMessageCount,
} from "@/src/store/slices/messageSlice";
import Sidebar from "@/components/Sidebar";
import { setActiveStatus } from "@/src/store/slices/userStatusSlice";
import { RootState } from "@/src/store/store";
import { notificationsAPI } from "@/lib/notificationsApi";
import { messagesAPI } from "@/lib/messagesApi";
import {
  incrementUnreadCount,
  resetUnreadCount,
  setUnreadCount,
} from "@/src/store/slices/notificationSlice";
import Stories from "@/components/Stories";
import Posts from "@/components/Posts";
import { openSidebar } from "@/src/store/slices/sidebarSlice";

const Home = () => {
  const dispatch = useDispatch();
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const unreadCount = useSelector(
    (state: RootState) => state.notifications.unreadCount
  );
  const unreadMessageCount = useSelector(
    (state: RootState) => state.messages.unreadCount
  );

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
        }
      } catch (error) {
        console.error("Error getting user from Supabase:", error);
      }
    };

    getUser();
  }, []);

  // Memoize the fetchInitialData function to avoid recreation on each render
  const fetchInitialData = React.useCallback(async () => {
    if (!userId || !supabase) {
      console.log("Cannot fetch initial data: userId or supabase is null");
      return;
    }

    const now = Date.now();
    if (now - lastFetchTime < 30000) {
      console.log("Skipping fetch, last fetch was less than 30 seconds ago");
      return;
    }

    console.log("Fetching initial data for user:", userId);

    try {
      const [notifications, unreadMessages] = await Promise.all([
        notificationsAPI.getNotifications(userId),
        messagesAPI.getUnreadMessagesCount(userId),
      ]);

      console.log("Fetched notifications:", notifications.length);
      console.log("Unread messages count:", unreadMessages);

      const unread = notifications.filter((n) => !n.is_read).length;
      console.log("Unread notifications count:", unread);

      dispatch(setUnreadCount(unread));
      dispatch(setUnreadMessageCount(unreadMessages));
      setLastFetchTime(Date.now());
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  }, [userId, supabase, lastFetchTime, dispatch]);

  useEffect(() => {
    if (!userId || !supabase) return;

    fetchInitialData();

    // Create a notification channel with detailed logging
    const notificationsSubscription = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          console.log("New notification received:", payload.new);
          if (!payload.new.is_read) {
            // Immediately increment the unread count in the UI
            dispatch(incrementUnreadCount());

            // Play a notification sound if needed
            // You can add sound playback here
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          console.log("Notification updated:", payload.new);
          if (payload.new.is_read && !payload.old.is_read) {
            // Fetch the actual unread count from the database
            try {
              const notifications = await notificationsAPI.getNotifications(
                userId
              );
              const unreadCount = notifications.filter(
                (n) => !n.is_read
              ).length;
              dispatch(setUnreadCount(unreadCount));
            } catch (error) {
              console.error("Error updating unread count:", error);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("Notification subscription status:", status);
      });

    // Create a messages channel with detailed logging
    const messagesSubscription = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          console.log("New message received:", payload.new);
          if (!payload.new.is_read) {
            dispatch(setUnreadMessageCount(unreadMessageCount + 1));
          }
        }
      )
      .subscribe((status) => {
        console.log("Messages subscription status:", status);
      });

    // Set up periodic refresh
    const interval = setInterval(() => {
      fetchInitialData();
    }, 300000);

    // Cleanup function
    return () => {
      if (supabase) {
        supabase.removeChannel(notificationsSubscription);
        supabase.removeChannel(messagesSubscription);
      }
      clearInterval(interval);

      if (userId && supabase) {
        (async () => {
          try {
            await supabase
              .from("profiles")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", userId);
            console.log("User status updated on cleanup");
          } catch (error: any) {
            console.error("Error updating user status:", error);
          }
        })();
      }
    };
  }, [userId, dispatch, unreadCount, unreadMessageCount]);

  useEffect(() => {
    if (userId && supabase) {
      dispatch(setActiveStatus(true));
      (async () => {
        try {
          await supabase
            .from("profiles")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", userId);
          console.log("User status updated");
        } catch (error: any) {
          console.error("Error updating user status:", error);
        }
      })();
    }
  }, [userId, dispatch, supabase]);

  // Update notification count when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (userId && supabase) {
        console.log("Screen focused, refreshing notification data");
        fetchInitialData();
      }
    }, [userId, supabase, fetchInitialData])
  );

  return (
    <>
      <LinearGradient
        colors={["#000000", "#1a1a1a", "#2a2a2a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.leftSection}>
              <TouchableOpacity
                onPress={() => dispatch(openSidebar())}
                style={styles.menuButton}
              >
                <Feather name="menu" size={24} color="#ffffff" />
              </TouchableOpacity>
              <View>
                <Text style={styles.appName}>Klicktape</Text>
                <Text style={styles.tagline}>
                  First Privacy Secured Network
                </Text>
              </View>
            </View>

            <View style={styles.rightSection}>
              <TouchableOpacity
                onPress={() => {
                  router.push("/chat");
                  dispatch(resetUnreadMessageCount());
                }}
                style={styles.iconButton}
              >
                <Ionicons name="chatbubble-outline" size={20} color="#FFD700" />
                {unreadMessageCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  router.push("/notifications");
                  dispatch(resetUnreadCount());
                }}
                style={styles.iconButton}
              >
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color="#FFD700"
                />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.content}>
            <Stories />
            <Posts />
          </View>
        </SafeAreaView>
      </LinearGradient>
      <Sidebar />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 10 : 20,
    paddingBottom: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 215, 0, 0.2)",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  appName: {
    fontSize: 24,
    fontFamily: "Rubik-Bold",
    color: "#FFD700",
  },
  tagline: {
    fontSize: 12,
    fontFamily: "Rubik-Medium",
    color: "rgba(255, 215, 0, 0.8)",
    marginTop: 2,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    marginLeft: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#D4AF37",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Rubik-Medium",
    color: "#000000",
    lineHeight: 12,
  },
  content: {
    flex: 1,
  },
});

export default Home;
