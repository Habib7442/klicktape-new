import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import { Feather, Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useFocusEffect, Link } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import {
  setUnreadMessageCount,
} from "@/src/store/slices/messageSlice";
import Sidebar from "@/components/Sidebar";
import { setActiveStatus } from "@/src/store/slices/userStatusSlice";
import { RootState } from "@/src/store/store";
import { notificationsAPI } from "@/lib/notificationsApi";
import { messagesAPI } from "@/lib/messagesApi";
import { productionRealtimeOptimizer } from "@/lib/utils/productionRealtimeOptimizer";
import {
  incrementUnreadCount,
  resetUnreadCount,
  setUnreadCount,
} from "@/src/store/slices/notificationSlice";
import Posts from "@/components/Posts";
import { openSidebar } from "@/src/store/slices/sidebarSlice";
import ThemedGradient from "@/components/ThemedGradient";
import { useTheme } from "@/src/context/ThemeContext";

import { useOptimizedDataFetching } from "@/lib/hooks/useOptimizedDataFetching";
import { authManager } from "@/lib/authManager";
import { useSupabaseNotificationManager } from "@/lib/supabaseNotificationManager";


const Home = () => {
  const dispatch = useDispatch();
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{
    username: string | null;
    name: string | null;
    avatar_url: string | null;
  } | null>(null);

  const unreadCount = useSelector(
    (state: RootState) => state.notifications.unreadCount
  );
  const unreadMessageCount = useSelector(
    (state: RootState) => state.messages.unreadCount
  );

  // Initialize Supabase real-time notification management
  const {
    isConnected,
    subscriptionStatus,
    lastSyncTime,
    syncNotifications,
    forceReconnect,
    unreadCount: realtimeUnreadCount,
  } = useSupabaseNotificationManager({
    userId: userId || '', // Ensure we have a valid userId
    enableRealtime: !!userId, // Only enable real-time when userId is available
    fallbackPollingInterval: 120000, // 2 minutes (reduced API calls)
    maxRetries: 2, // Reduced retries
  });

  // Debug notification system status
  useEffect(() => {
    if (userId) {
      if (__DEV__) {
        console.log('🔔 Supabase Notification System Status:', {
          connected: isConnected,
          subscriptionStatus: subscriptionStatus,
          lastSync: lastSyncTime,
          userId: userId,
          realtimeUnreadCount: realtimeUnreadCount
        });

        // Force reconnect if not connected
        if (!isConnected && subscriptionStatus === 'error') {
          console.log('🔄 Notification system not connected, attempting reconnect...');
          forceReconnect();
        }
      }
    }
  }, [isConnected, subscriptionStatus, lastSyncTime, userId, realtimeUnreadCount, forceReconnect]);
  useEffect(() => {
    const getUser = async () => {
      try {
        // Use cached auth manager directly
        const user = await authManager.getCurrentUser();

        if (user) {
          setUserId(user.id);
          console.log("✅ Authenticated user ID (cached):", user.id);
        } else {
          console.warn("⚠️ No authenticated user found in cache");
          // Fallback to direct Supabase call
          const { data: { user: supabaseUser } } = await supabase.auth.getUser();
          if (supabaseUser) {
            setUserId(supabaseUser.id);
            console.log("✅ Authenticated user ID (fallback):", supabaseUser.id);
          }
        }
      } catch (error) {
        console.error("❌ Error getting user from auth manager:", error);
        // Final fallback to direct Supabase call
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setUserId(user.id);
            console.log("✅ Authenticated user ID (final fallback):", user.id);
          } else {
            console.warn("⚠️ No authenticated user found (final fallback)");
          }
        } catch (fallbackError) {
          console.error("❌ Final fallback auth error:", fallbackError);
        }
      }
    };

    getUser();
  }, []);

  // Use optimized data fetching hook
  const {
    data: homeData,
    loading: dataLoading,
    refresh: refreshData,
    isCacheValid,
  } = useOptimizedDataFetching({
    enableRealtime: true,
    fetchInterval: 30000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch user profile data
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('username, name, avatar_url')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      if (data && typeof data === 'object' && 'username' in data) {
        // Type assertion to ensure data matches our expected type
        const profileData: {
          username: string | null;
          name: string | null;
          avatar_url: string | null;
        } = {
          username: (data as any).username || null,
          name: (data as any).name || null,
          avatar_url: (data as any).avatar_url || null,
        };
        setUserProfile(profileData);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Update Redux state when data changes
  useEffect(() => {
    if (homeData.userId) {
      setUserId(homeData.userId);
      dispatch(setUnreadCount(homeData.unreadNotifications));
      dispatch(setUnreadMessageCount(homeData.unreadMessages));

      // Fetch user profile when userId is available
      fetchUserProfile(homeData.userId);
    }
  }, [homeData, dispatch]);

  useEffect(() => {
    if (!userId || !supabase) {
      console.log("❌ Cannot setup subscriptions: missing userId or supabase");
      return;
    }

    console.log("🔄 Setting up real-time subscriptions for user:", userId);

    // Note: Notification real-time subscription is handled by useSupabaseNotificationManager
    // to prevent duplicate subscriptions and ensure proper state management

    // Create PRODUCTION-OPTIMIZED messages subscription
    const messagesCleanupInsert = productionRealtimeOptimizer.createOptimizedSubscription(
      `messages_${userId}:insert`,
      {
        table: "messages",
        filter: `receiver_id=eq.${userId}`,
        event: "INSERT",
        priority: "medium", // Home screen notifications are medium priority
      },
      async (payload) => {
        const handleMessage = async (messagePayload: any) => {
          console.log("📨 Production Real-time: New message received:", messagePayload.new);
          if (!messagePayload.new.is_read) {
            // Fetch actual unread count instead of incrementing
            try {
              const unreadCount = await messagesAPI.getUnreadMessagesCount(userId);
              console.log(`📊 Updated unread messages count: ${unreadCount}`);
              dispatch(setUnreadMessageCount(unreadCount));
            } catch (error) {
              console.error("Error fetching unread count:", error);
            }
          }
        };

        if (payload.type === 'batch') {
          // Handle batched messages
          for (const msg of payload.messages) {
            await handleMessage(msg);
          }
        } else {
          await handleMessage(payload);
        }
      }
    );

    const messagesCleanupUpdate = productionRealtimeOptimizer.createOptimizedSubscription(
      `messages_${userId}:update`,
      {
        table: "messages",
        filter: `receiver_id=eq.${userId}`,
        event: "UPDATE",
        priority: "low", // Message updates are low priority
      },
      async (payload) => {
        const handleUpdate = async (updatePayload: any) => {
          console.log("📝 Production Real-time: Message updated:", updatePayload.new);
          // If message was marked as read, update the count
          if (updatePayload.new.is_read && !updatePayload.old.is_read) {
            try {
              const unreadCount = await messagesAPI.getUnreadMessagesCount(userId);
              console.log(`📊 Updated unread messages count after read: ${unreadCount}`);
              dispatch(setUnreadMessageCount(unreadCount));
            } catch (error) {
              console.error("Error fetching unread count after update:", error);
            }
          }
        };

        if (payload.type === 'batch') {
          // Handle batched updates
          for (const msg of payload.messages) {
            await handleUpdate(msg);
          }
        } else {
          await handleUpdate(payload);
        }
      }
    );

    // Set up periodic refresh
    const interval = setInterval(() => {
      refreshData();
    }, 300000);

    // Cleanup function
    return () => {
      // Clean up production realtime subscriptions
      messagesCleanupInsert();
      messagesCleanupUpdate();
      clearInterval(interval);

      if (userId && supabase) {
        (async () => {
          try {
            await (supabase as any)
              .from("profiles")
              .update({
                updated_at: new Date().toISOString()
              })
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
          await (supabase as any)
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
      if (userId && supabase && !isCacheValid) {
        console.log("Screen focused, refreshing notification data");
        refreshData();
      }
    }, [userId, supabase, isCacheValid, refreshData])
  );

  const { colors, isDarkMode } = useTheme();

  return (
    <>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <ThemedGradient style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.header, {
            borderBottomColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)'
          }]}>
            <View style={styles.leftSection}>
              <TouchableOpacity
                onPress={() => dispatch(openSidebar())}
                style={[styles.menuButton, {
                  backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
                  borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)'
                }]}
              >
                <Feather name="menu" size={24} color={colors.text} />
              </TouchableOpacity>
              <View>
                <Text style={[styles.appName, { color: colors.primary }]}>Klicktape</Text>
                <Text style={[styles.tagline, { color: colors.textSecondary }]}>
                  First Privacy Secured Network
                </Text>
              </View>
            </View>

            <View style={styles.rightSection}>
              <Link
                href="/chat"
                onPress={() => {
                  // Add haptic feedback for better UX
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // Don't reset count here - let individual chat screens handle it
                }}
                style={[styles.iconButton, {
                  backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
                  borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)'
                }]}
                asChild
              >
                <TouchableOpacity>
                  <Ionicons name="chatbubble-outline" size={20} color={colors.text} />
                  {unreadMessageCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: isDarkMode ? '#808080' : '#606060' }]}>
                      <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>
                        {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Link>
              <Link
                href="/notifications"
                onPress={() => {
                  // Add haptic feedback for better UX
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  dispatch(resetUnreadCount());
                }}
                style={[styles.iconButton, {
                  backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
                  borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)'
                }]}
                asChild
              >
                <TouchableOpacity>
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color={colors.text}
                  />
                  {unreadCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: isDarkMode ? '#808080' : '#606060' }]}>
                      <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Link>
            </View>
          </View>

          <View style={styles.content}>
            <Posts />
          </View>
        </SafeAreaView>
      </ThemedGradient>
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
    borderBottomWidth: 1,
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
    marginRight: 12,
    borderWidth: 1,
  },
  appName: {
    fontSize: 24,
    fontFamily: "Rubik-Bold",
  },
  tagline: {
    fontSize: 12,
    fontFamily: "Rubik-Medium",
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
    marginLeft: 12,
    borderWidth: 1,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
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
    lineHeight: 12,
  },
  content: {
    flex: 1,
  },
});

export default Home;
