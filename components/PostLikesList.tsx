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
import { postsAPI } from "@/lib/postsApi";
import { usersApi } from "@/lib/usersApi";
import { supabase } from "@/lib/supabase";

interface LikeUser {
  user_id: string;
  username: string;
  avatar_url: string;
  created_at: string;
}

interface PostLikesListProps {
  postId: string;
  title: string;
}

const PostLikesList: React.FC<PostLikesListProps> = ({ postId, title }) => {
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const [users, setUsers] = useState<LikeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId !== null) {
      fetchLikes();
    }
  }, [postId, currentUserId]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    } catch (error) {
      console.error("Error getting current user:", error);
      setCurrentUserId(null);
    }
  };

  const fetchLikes = async () => {
    try {
      setLoading(true);
      const data = await postsAPI.getPostLikes(postId);
      setUsers(data);
      
      // Check following status for each user
      if (currentUserId) {
        await checkFollowingStatus(data);
      }
    } catch (error) {
      console.error("Error fetching post likes:", error);
      Alert.alert("Error", "Failed to load likes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkFollowingStatus = async (userList: LikeUser[]) => {
    if (!currentUserId) return;

    const statusPromises = userList.map(async (user) => {
      if (!user.user_id || user.user_id === currentUserId) return null;

      try {
        const isFollowing = await usersApi.checkFollowing(user.user_id, currentUserId);
        return { userId: user.user_id, isFollowing };
      } catch (error) {
        console.error("Error checking follow status:", error);
        return { userId: user.user_id, isFollowing: false };
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
    fetchLikes();
  };

  const navigateToProfile = (targetUserId: string) => {
    if (targetUserId === currentUserId) {
      router.push("/(root)/(tabs)/profile");
    } else {
      router.push(`/(root)/userProfile/${targetUserId}`);
    }
  };

  const renderUser = ({ item }: { item: LikeUser }) => {
    const isCurrentUser = item.user_id === currentUserId;
    const isFollowing = followingStatus[item.user_id];

    return (
      <TouchableOpacity
        style={[styles.userItem, { backgroundColor: colors.backgroundSecondary }]}
        onPress={() => navigateToProfile(item.user_id)}
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
            onPress={() => handleFollow(item.user_id)}
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
        keyExtractor={(item) => item.user_id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text className="font-rubik-medium" style={[styles.emptyText, { color: colors.textSecondary }]}>
              No likes yet
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

export default PostLikesList;
