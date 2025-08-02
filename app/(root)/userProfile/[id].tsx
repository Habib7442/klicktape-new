import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Share,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";

import { VideoView, useVideoPlayer } from "expo-video";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useSupabaseFetch } from "@/hooks/useSupabaseFetch";
import CachedImage from "@/components/CachedImage";
import { useTheme } from "@/src/context/ThemeContext";
import { SupabaseNotificationBroadcaster } from "@/lib/supabaseNotificationManager";
import { authManager } from "@/lib/authManager";
import { generateShareContent } from "@/utils/deepLinkHelper";

interface ProfileParams extends Record<string, string | string[]> {
  id: string;
  avatar_url: string;
}

// Reel Thumbnail Video Component
const ReelThumbnailVideo = ({ videoUri }: { videoUri: string }) => {
  const player = useVideoPlayer(videoUri, (player) => {
    player.loop = false;
    player.muted = true;
    player.play();
  });

  return (
    <VideoView
      style={styles.thumbnailImage}
      player={player}
      contentFit="cover"
      allowsFullscreen={false}
      allowsPictureInPicture={false}
    />
  );
};

const UserProfile = () => {
  const params = useLocalSearchParams<ProfileParams>();
  const id = params.id;
  const { fetchUserProfile, fetchPosts, fetchReels } = useSupabaseFetch();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userReels, setUserReels] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "reels">("posts");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { isDarkMode, colors } = useTheme();



  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Use cached auth manager instead of direct Supabase call
        const user = await authManager.getCurrentUser();
        setCurrentUserId(user?.id || null);
      } catch (error) {
        console.error("Error in fetchUser:", error);
        // Fallback to direct Supabase call
        try {
          const { data: { user } } = await supabase.auth.getUser();
          setCurrentUserId(user?.id || null);
        } catch (fallbackError) {
          console.error("Fallback auth error:", fallbackError);
        }
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [profile, posts, reels] = await Promise.all([
          fetchUserProfile(id),
          fetchPosts(id),
          fetchReels(id),
        ]);

        setUserProfile(profile);
        setUserPosts(posts);
        setUserReels(reels);
        await checkIfFollowing();
      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUserId !== null) {
      loadInitialData();
    }
  }, [id, currentUserId]);

  const checkIfFollowing = async () => {
    try {
      if (!currentUserId || !supabase) return;

      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is the error code for "no rows returned" which is expected if not following
        console.error("Error checking follow status:", error);
      }

      setIsFollowing(!!data);
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [profile, posts, reels] = await Promise.all([
        fetchUserProfile(id),
        fetchPosts(id),
        fetchReels(id),
      ]);

      setUserProfile(profile);
      setUserPosts(posts);
      setUserReels(reels);
      await checkIfFollowing();
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleFollow = async () => {
    try {
      if (!currentUserId || !supabase) return;

      // Ensure current user has a profile
      let { data: currentUserProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", currentUserId)
        .single();

      if (profileError || !currentUserProfile) {
        // Create a profile for the current user
        const username = `user_${Math.random().toString(36).substring(2, 10)}`;
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: currentUserId,
            username,
            avatar_url: "https://via.placeholder.com/150",
          })
          .select()
          .single();

        if (insertError || !newProfile) {
          console.error("Error creating user profile:", insertError);
          return;
        }
        currentUserProfile = newProfile;
      }

      // Check if already following
      const { data: existingFollow, error: followError } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", id)
        .single();

      if (followError && followError.code !== "PGRST116") {
        console.error("Error checking follow status:", followError);
        return;
      }

      if (existingFollow) {
        // Unfollow user
        const { error: deleteError } = await supabase
          .from("follows")
          .delete()
          .eq("id", existingFollow.id);

        if (deleteError) {
          console.error("Error unfollowing user:", deleteError);
          return;
        }
      } else {
        // Follow user
        const { error: insertError } = await supabase
          .from("follows")
          .insert({
            follower_id: currentUserId,
            following_id: id,
            created_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error("Error following user:", insertError);
          return;
        }

        // Create and broadcast notification for the followed user
        try {
          await SupabaseNotificationBroadcaster.broadcastFollow(
            id, // recipient (user being followed)
            currentUserId // sender (current user doing the following)
          );
        } catch (notifError) {
          console.error("Error creating follow notification:", notifError);
        }
      }

      // Update UI
      setIsFollowing(!isFollowing);
      setUserProfile((prev: any) => ({
        ...prev,
        followersCount: isFollowing ? prev.followersCount - 1 : prev.followersCount + 1,
      }));
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  const handleShare = async () => {
    try {
      if (userProfile) {
        const shareContent = generateShareContent({
          type: 'profile',
          username: userProfile.username,
          id: userProfile.id,
        });

        await Share.share(shareContent);
      }
    } catch (error) {
      console.error("Error sharing profile:", error);
    }
  };

  const renderPost = ({ item }: { item: any }) => (
    <View style={styles.postContainer}>
      <TouchableOpacity
        style={[styles.postThumbnail, {
          backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"
        }]}
        onPress={() => router.push(`/post/${item.id}`)}
      >
        <Image
          source={{ uri: item.image_urls[0] }}
          style={styles.thumbnailImage}
        />
      </TouchableOpacity>
    </View>
  );

  const renderReel = ({ item }: { item: any }) => (
    <View style={styles.postContainer}>
      <TouchableOpacity
        style={[styles.postThumbnail, {
          backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"
        }]}
        onPress={() => router.push(`/reel/${item.id}`)}
      >
        <ReelThumbnailVideo videoUri={item.video_url} />
      </TouchableOpacity>
    </View>
  );

  if (loading || !userProfile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    );
  }


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { borderBottomColor: `${colors.primary}20` }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.headerIconButton, {
              backgroundColor: `${colors.primary}20`,
              borderColor: `${colors.primary}50`
            }]}
          >
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="font-rubik-bold" style={[styles.headerTitle, { color: '#FFFFFF' }]}>
            {userProfile.username}
          </Text>
          <TouchableOpacity
            onPress={handleShare}
            style={[styles.headerIconButton, {
              backgroundColor: `${colors.primary}20`,
              borderColor: `${colors.primary}50`
            }]}
          >
            <Feather name="share-2" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        style={styles.scrollView}
      >
        <View style={styles.profileInfo}>
          <CachedImage
            uri={userProfile.avatar_url}
            style={styles.profileImage}
            showLoader={true}
            fallbackUri="https://via.placeholder.com/150"
          />
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text className="font-rubik-bold" style={[styles.statNumber, { color: colors.text }]}>
                {userPosts.length + userReels.length}
              </Text>
              <Text className="font-rubik-medium" style={[styles.statLabel, { color: colors.textSecondary }]}>
                Posts
              </Text>
            </View>
            <TouchableOpacity
              style={styles.stat}
              onPress={() => router.push(`/(root)/followers/${id}`)}
            >
              <Text className="font-rubik-bold" style={[styles.statNumber, { color: colors.text }]}>
                {userProfile.followersCount}
              </Text>
              <Text className="font-rubik-medium" style={[styles.statLabel, { color: colors.textSecondary }]}>
                Followers
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stat}
              onPress={() => router.push(`/(root)/following/${id}`)}
            >
              <Text className="font-rubik-bold" style={[styles.statNumber, { color: colors.text }]}>
                {userProfile.followingCount}
              </Text>
              <Text className="font-rubik-medium" style={[styles.statLabel, { color: colors.textSecondary }]}>
                Following
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bioSection}>
          <Text className="font-rubik-bold" style={[styles.username, { color: colors.text }]}>
            {userProfile.username}
          </Text>
          <Text className="font-rubik-medium" style={[styles.bio, { color: colors.textSecondary }]}>
            {userProfile.bio}
          </Text>
          {currentUserId !== id && (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.followButton,
                  {
                    backgroundColor: `rgba(${isDarkMode ? '255, 215, 0' : '184, 134, 11'}, 0.2)`,
                    borderColor: `rgba(${isDarkMode ? '255, 215, 0' : '184, 134, 11'}, 0.3)`
                  },
                  isFollowing && [styles.followingButton, {
                    backgroundColor: `rgba(${isDarkMode ? '255, 215, 0' : '184, 134, 11'}, 0.1)`
                  }],
                ]}
                onPress={handleFollow}
              >
                <Text
                  className="font-rubik-bold"
                  style={[styles.followButtonText, { color: colors.text }]}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.messageButton, {
                  backgroundColor: `rgba(${isDarkMode ? '255, 215, 0' : '184, 134, 11'}, 0.1)`,
                  borderColor: `rgba(${isDarkMode ? '255, 215, 0' : '184, 134, 11'}, 0.3)`
                }]}
                onPress={() => router.push(`/chats/${id}`)}
              >
                <Text
                  className="font-rubik-bold"
                  style={[styles.followButtonText, { color: colors.text }]}
                >
                  Message
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[styles.tabsContainer, {
          borderTopColor: `${colors.primary}20`,
          backgroundColor: `${colors.backgroundSecondary}80`
        }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "posts" && [styles.activeTab, { borderBottomColor: '#FFFFFF' }]
            ]}
            onPress={() => setActiveTab("posts")}
          >
            <MaterialCommunityIcons
              name="grid"
              size={24}
              color={
                activeTab === "posts" ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)'
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "reels" && [styles.activeTab, { borderBottomColor: '#FFFFFF' }]
            ]}
            onPress={() => setActiveTab("reels")}
          >
            <Feather
              name="video"
              size={24}
              color={
                activeTab === "reels" ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)'
              }
            />
          </TouchableOpacity>
        </View>

        <FlatList
          data={activeTab === "posts" ? userPosts : userReels}
          renderItem={activeTab === "posts" ? renderPost : renderReel}
          numColumns={3}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.postsContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text className="font-rubik-medium" style={[styles.emptyText, { color: colors.textSecondary }]}>
                No {activeTab} yet
              </Text>
            </View>
          }
        />
      </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
  },
  headerIconButton: {
    padding: 10,
    borderRadius: 50,
    borderWidth: 1.5,
  },
  profileInfo: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginRight: 16,
  },
  statsContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  stat: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
  },
  statLabel: {
    fontSize: 14,
  },
  bioSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  username: {
    fontSize: 16,
  },
  bio: {
    marginTop: 6,
    fontSize: 14,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  followButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  followingButton: {
    // Will be set dynamically
  },
  messageButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  followButtonText: {
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    // borderBottomColor will be set dynamically
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  postThumbnail: {
    width: (Dimensions.get("window").width - 36) / 3,
    height: (Dimensions.get("window").width - 36) / 3,
    margin: 6,
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  postContainer: {
    position: "relative",
  },
  postsContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    width: Dimensions.get("window").width,
  },
  emptyText: {
    fontSize: 16,
  },
});

export default UserProfile;
