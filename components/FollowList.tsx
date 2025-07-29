import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/context/ThemeContext";
import CachedImage from "@/components/CachedImage";
import { usersApi } from "@/lib/usersApi";
import { supabase } from "@/lib/supabase";

interface User {
  follower_id?: string;
  following_id?: string;
  username: string;
  avatar_url: string;
  created_at: string;
}

interface FollowListProps {
  userId: string;
  type: "followers" | "following";
  title: string;
}

const FollowList: React.FC<FollowListProps> = ({ userId, type, title }) => {
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId !== null) {
      fetchUsers();
    }
  }, [userId, type, currentUserId]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    } catch (error) {
      console.error("Error getting current user:", error);
      setCurrentUserId(null);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let data: User[] = [];
      
      if (type === "followers") {
        data = await usersApi.getFollowers(userId);
      } else {
        data = await usersApi.getFollowing(userId);
      }

      setUsers(data);
      
      // Check following status for each user
      if (currentUserId) {
        await checkFollowingStatus(data);
      }
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      Alert.alert("Error", `Failed to load ${type}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkFollowingStatus = async (userList: User[]) => {
    if (!currentUserId) return;

    const statusPromises = userList.map(async (user) => {
      const targetUserId = user.follower_id || user.following_id;
      if (!targetUserId || targetUserId === currentUserId) return null;

      try {
        const isFollowing = await usersApi.checkFollowing(targetUserId, currentUserId);
        return { userId: targetUserId, isFollowing };
      } catch (error) {
        console.error("Error checking follow status:", error);
        return { userId: targetUserId, isFollowing: false };
      }
    });

    const results = await Promise.all(statusPromises);
    const statusMap: Record<string, boolean> = {};
    
    results.forEach((result) => {
      if (result) {
        statusMap[result.userId] = result.isFollowing;
      }
    });

    setFollowingStatus(statusMap);
  };

  const handleFollow = async (targetUserId: string) => {
    if (!currentUserId || targetUserId === currentUserId) return;

    try {
      const isCurrentlyFollowing = followingStatus[targetUserId];
      const newFollowingStatus = await usersApi.toggleFollow(targetUserId, currentUserId);
      
      setFollowingStatus(prev => ({
        ...prev,
        [targetUserId]: newFollowingStatus
      }));
    } catch (error) {
      console.error("Error toggling follow:", error);
      Alert.alert("Error", "Failed to update follow status");
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const navigateToProfile = (targetUserId: string) => {
    if (targetUserId === currentUserId) {
      router.push("/(root)/(tabs)/profile");
    } else {
      router.push(`/(root)/userProfile/${targetUserId}`);
    }
  };

  const renderUser = ({ item }: { item: User }) => {
    const targetUserId = item.follower_id || item.following_id;
    if (!targetUserId) return null;

    const isCurrentUser = targetUserId === currentUserId;
    const isFollowing = followingStatus[targetUserId];

    return (
      <TouchableOpacity
        style={[styles.userItem, { backgroundColor: colors.backgroundSecondary }]}
        onPress={() => navigateToProfile(targetUserId)}
      >
        <View style={styles.userInfo}>
          <CachedImage
            uri={item.avatar_url || "https://via.placeholder.com/150"}
            style={styles.avatar}
            showLoader={true}
            fallbackUri="https://via.placeholder.com/150"
          />
          <View style={styles.userDetails}>
            <Text className="font-rubik-bold" style={[styles.username, { color: colors.text }]}>
              {item.username}
            </Text>
          </View>
        </View>
        
        {!isCurrentUser && (
          <TouchableOpacity
            style={[
              styles.followButton,
              {
                backgroundColor: isFollowing 
                  ? `rgba(${isDarkMode ? '128, 128, 128' : '128, 128, 128'}, 0.2)`
                  : `rgba(${isDarkMode ? '128, 128, 128' : '128, 128, 128'}, 0.2)`,
                borderColor: `rgba(${isDarkMode ? '128, 128, 128' : '128, 128, 128'}, 0.3)`
              }
            ]}
            onPress={() => handleFollow(targetUserId)}
          >
            <Text
              className="font-rubik-medium"
              style={[styles.followButtonText, { color: colors.text }]}
            >
              {isFollowing ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text className="font-rubik-bold" style={[styles.headerTitle, { color: colors.text }]}>
            {title}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text className="font-rubik-bold" style={[styles.headerTitle, { color: colors.text }]}>
          {title}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => (item.follower_id || item.following_id) || Math.random().toString()}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text className="font-rubik-medium" style={[styles.emptyText, { color: colors.textSecondary }]}>
              No {type} yet
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "bold",
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
});

export default FollowList;
