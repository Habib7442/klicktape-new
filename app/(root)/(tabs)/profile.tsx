import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Share,
  Alert,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
// import { LinearGradient } from "expo-linear-gradient";
import { Video } from "expo-av";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSupabaseFetch } from "@/hooks/useSupabaseFetch";
import DeleteModal from "@/components/DeleteModal";
import ThemedGradient from "@/components/ThemedGradient";
import { useTheme } from "@/src/context/ThemeContext";

const Profile = () => {
  const { colors } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("posts");
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState({
    username: "Username",
    bio: "Bio goes here",
    followers: 0,
    following: 0,
    avatar: "https://via.placeholder.com/150",
    accountType: "PERSONAL",
    gender: "",
  });

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    type: 'post' | 'reel';
  } | null>(null);

  const { fetchUserProfile, fetchPosts, fetchBookmarks, fetchReels } =
    useSupabaseFetch();

  // Ref to store video refs for controlling playback
  const videoRefs = useRef<Map<string, any>>(new Map());

  // Pause all videos
  const pauseAllVideos = useCallback(() => {
    videoRefs.current.forEach((videoRef) => {
      videoRef.current?.pauseAsync().catch((err: any) => {
        console.warn("Error pausing video:", err);
      });
    });
  }, []);

  // Handle screen focus/unfocus
  useFocusEffect(
    useCallback(() => {
      return () => {
        pauseAllVideos();
      };
    }, [pauseAllVideos])
  );

  const fetchUserData = async () => {
    try {
      if (!userId) return;
      const userProfile = await fetchUserProfile(userId);
      setUserInfo({
        username: userProfile.username || "Username",
        bio: userProfile.bio || "Bio goes here",
        followers: userProfile.followersCount || 0,
        following: userProfile.followingCount || 0,
        avatar: userProfile.avatar_url || "https://via.placeholder.com/150",
        accountType: userProfile.account_type || "PERSONAL",
        gender: userProfile.gender || "",
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const fetchUserPosts = async () => {
    try {
      if (!userId) return;
      const userPosts = await fetchPosts(userId);
      setPosts(userPosts || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  const fetchUserBookmarks = async () => {
    try {
      if (!userId) return;
      const userBookmarks = await fetchBookmarks(userId);
      setBookmarks(userBookmarks || []);
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
    }
  };

  const fetchUserReels = async () => {
    try {
      if (!userId) return;
      const userReels = await fetchReels(userId);
      setReels(userReels || []);
    } catch (error) {
      console.error("Error fetching reels:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchUserData(),
        fetchUserPosts(),
        fetchUserBookmarks(),
        fetchUserReels(),
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${userInfo.username}'s profile on KlickTape!`,
      });
    } catch (error) {
      console.error("Error sharing profile:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/sign-up");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleDelete = async (id: string, type: 'post' | 'reel') => {
    setItemToDelete({ id, type });
    setIsDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'post') {
        const { data: post, error: postError } = await supabase
          .from("posts")
          .select("image_urls")
          .eq("id", itemToDelete.id)
          .eq("user_id", userId)
          .single();

        if (postError || !post) throw postError || new Error("Post not found");

        if (post.image_urls && post.image_urls.length > 0) {
          const filePaths = post.image_urls.map((url: string) =>
            url.split("/").slice(-2).join("/")
          );
          await supabase.storage.from("media").remove(filePaths);
        }

        await supabase
          .from("posts")
          .delete()
          .eq("id", itemToDelete.id)
          .eq("user_id", userId);

        setPosts(posts.filter((post) => post.id !== itemToDelete.id));
      } else {
        const { data: reel, error: reelError } = await supabase
          .from("reels")
          .select("video_url")
          .eq("id", itemToDelete.id)
          .eq("user_id", userId)
          .single();

        if (reelError || !reel) throw reelError || new Error("Reel not found");

        if (reel.video_url) {
          const filePath = reel.video_url.split("/").slice(-2).join("/");
          await supabase.storage.from("media").remove([filePath]);
        }

        await supabase
          .from("reels")
          .delete()
          .eq("id", itemToDelete.id)
          .eq("user_id", userId);

        setReels(reels.filter((reel) => reel.id !== itemToDelete.id));
      }

      Alert.alert("Success", `${itemToDelete.type} deleted successfully.`);
    } catch (error) {
      console.error(`Error deleting ${itemToDelete.type}:`, error);
      Alert.alert("Error", `Failed to delete ${itemToDelete.type}. Please try again.`);
    } finally {
      setIsDeleteModalVisible(false);
      setItemToDelete(null);
    }
  };

  // Unused function - keeping for reference
  /*
  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { data: post, error: postError } = await supabase
                .from("posts")
                .select("image_urls")
                .eq("id", postId)
                .eq("user_id", userId)
                .single();

              if (postError || !post)
                throw postError || new Error("Post not found");

              if (post.image_urls && post.image_urls.length > 0) {
                const filePaths = post.image_urls.map((url) =>
                  url.split("/").slice(-2).join("/")
                );
                const { error: storageError } = await supabase.storage
                  .from("media")
                  .remove(filePaths);

                if (storageError) throw storageError;
              }

              const { error: postDeleteError } = await supabase
                .from("posts")
                .delete()
                .eq("id", postId)
                .eq("user_id", userId);

              if (postDeleteError) throw postDeleteError;

              setPosts(posts.filter((post) => post.id !== postId));
              Alert.alert("Success", "Post deleted successfully.");
            } catch (error) {
              console.error(
                "Error deleting post:",
                JSON.stringify(error, null, 2)
              );
              Alert.alert("Error", "Failed to delete post. Please try again.");
            }
          },
        },
      ]
    );
  };
  */

  // Unused function - keeping for reference
  /*
  const handleDeleteReel = async (reelId: string) => {
    Alert.alert(
      "Delete Reel",
      "Are you sure you want to delete this reel? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { data: reel, error: reelError } = await supabase
                .from("reels")
                .select("video_url")
                .eq("id", reelId)
                .eq("user_id", userId)
                .single();

              if (reelError || !reel)
                throw reelError || new Error("Reel not found");

              if (reel.video_url) {
                const filePath = reel.video_url.split("/").slice(-2).join("/");
                const { error: storageError } = await supabase.storage
                  .from("media")
                  .remove([filePath]);

                if (storageError) throw storageError;
              }

              const { error: deleteError } = await supabase
                .from("reels")
                .delete()
                .eq("id", reelId)
                .eq("user_id", userId);

              if (deleteError) throw deleteError;

              setReels(reels.filter((reel) => reel.id !== reelId));
              Alert.alert("Success", "Reel deleted successfully.");
            } catch (error) {
              console.error(
                "Error deleting reel:",
                JSON.stringify(error, null, 2)
              );
              Alert.alert("Error", "Failed to delete reel. Please try again.");
            }
          },
        },
      ]
    );
  };
  */

  useEffect(() => {
    const getUserFromStorage = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          setUserId(user.id);
        }
      } catch (error) {
        console.error("Error getting user from storage:", error);
      }
    };

    getUserFromStorage();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchUserData(),
          fetchUserPosts(),
          fetchUserBookmarks(),
          fetchUserReels(),
        ]);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      loadData();
    }
  }, [userId]);

  useEffect(() => {
    return () => {
      pauseAllVideos();
      videoRefs.current.clear();
    };
  }, [pauseAllVideos]);

  const renderPost = ({ item }: { item: any }) => (
    <View style={styles.postContainer}>
      <TouchableOpacity
        style={[styles.postThumbnail, {
          backgroundColor: `${colors.primary}10`,
          shadowOpacity: 0
        }]}
        onPress={() => router.push(`/post/${item.id}`)}
      >
        <Image
          source={{ uri: item.image_urls[0] }}
          style={styles.thumbnailImage}
        />
      </TouchableOpacity>
      {activeTab === "posts" && item.user_id === userId && (
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: `${colors.backgroundSecondary}99` }]}
          onPress={() => handleDelete(item.id, 'post')}
        >
          <Feather name="trash-2" size={16} color={colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );

  const ReelItem = React.memo(({ item }: { item: any }) => {
    const videoRef = useRef<any>(null);

    useEffect(() => {
      videoRefs.current.set(item.id, videoRef);
      return () => {
        videoRefs.current.delete(item.id);
      };
    }, [item.id]);

    return (
      <View style={styles.postContainer}>
        <TouchableOpacity
          style={[styles.postThumbnail, {
            backgroundColor: `${colors.primary}10`,
            shadowOpacity: 0
          }]}
          onPress={() => {
            pauseAllVideos();
            router.push(`/reel/${item.id}`);
          }}
        >
          <Video
            ref={videoRef}
            source={{ uri: item.video_url }}
            style={styles.thumbnailImage}
            shouldPlay={activeTab === "reels"}
            isMuted={true}
            useNativeControls={false}
            isLooping={false}
            // @ts-ignore
            resizeMode="contain"
          />
        </TouchableOpacity>
        {activeTab === "reels" && (
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: `${colors.backgroundSecondary}99` }]}
            onPress={() => handleDelete(item.id, 'reel')}
          >
            <Feather name="trash-2" size={16} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    );
  });

  return (
    <ThemedGradient style={styles.container}>
      <View style={[styles.header, { borderBottomColor: `${colors.primary}20` }]}>
        <Text className="font-rubik-bold" style={[styles.headerTitle, { color: colors.primary }]}>
          Profile
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => router.push("/create")}>
            <Feather name="plus-square" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare}>
            <Feather name="share-2" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Feather name="log-out" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.backgroundSecondary}
            />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <View style={styles.profileInfo}>
            <Image
              source={{ uri: userInfo.avatar }}
              style={[styles.profileImage, { borderColor: `${colors.primary}30` }]}
            />
            <View style={styles.statsContainer}>
              <View style={styles.stat}>
                <Text className="font-rubik-bold" style={[styles.statNumber, { color: colors.text }]}>
                  {posts.length}
                </Text>
                <Text className="font-rubik-medium" style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Posts
                </Text>
              </View>
              <View style={styles.stat}>
                <Text className="font-rubik-bold" style={[styles.statNumber, { color: colors.text }]}>
                  {userInfo.followers}
                </Text>
                <Text className="font-rubik-medium" style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Followers
                </Text>
              </View>
              <View style={styles.stat}>
                <Text className="font-rubik-bold" style={[styles.statNumber, { color: colors.text }]}>
                  {userInfo.following}
                </Text>
                <Text className="font-rubik-medium" style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Following
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.bioSection}>
            <View style={styles.bioHeader}>
              <View style={styles.bioTextContainer}>
                <Text className="font-rubik-bold" style={[styles.username, { color: colors.text }]}>
                  {userInfo.username}
                </Text>
                <Text className="font-rubik-medium" style={[styles.bio, { color: colors.textSecondary }]}>
                  {userInfo.bio}
                </Text>
              </View>
              <View style={styles.infoContainer}>
                <Text className="font-rubik-medium" style={[styles.infoText, { color: colors.textTertiary }]}>
                  {userInfo.accountType.charAt(0).toUpperCase() +
                    userInfo.accountType.slice(1).toLowerCase()}{" "}
                  Account
                </Text>
                {userInfo.gender && (
                  <Text className="font-rubik-medium" style={[styles.infoText, { color: colors.textTertiary }]}>
                    {userInfo.gender.charAt(0).toUpperCase() +
                      userInfo.gender.slice(1).toLowerCase()}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={[styles.editButton, {
                backgroundColor: `${colors.primary}10`,
                borderColor: `${colors.primary}30`
              }]}
              onPress={() => router.push("/edit-profile")}
            >
              <Text className="font-rubik-bold" style={[styles.editButtonText, { color: colors.primary }]}>
                Edit Profile
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.tabsContainer, {
            borderTopColor: `${colors.primary}20`,
            backgroundColor: `${colors.backgroundSecondary}80`
          }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "posts" && [styles.activeTab, { borderBottomColor: colors.primary }]
              ]}
              onPress={() => {
                pauseAllVideos();
                setActiveTab("posts");
              }}
            >
              <MaterialCommunityIcons
                name="grid"
                size={24}
                color={
                  activeTab === "posts" ? colors.primary : `${colors.primary}70`
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "saved" && [styles.activeTab, { borderBottomColor: colors.primary }]
              ]}
              onPress={() => {
                pauseAllVideos();
                setActiveTab("saved");
              }}
            >
              <Feather
                name="bookmark"
                size={24}
                color={
                  activeTab === "saved" ? colors.primary : `${colors.primary}70`
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "reels" && [styles.activeTab, { borderBottomColor: colors.primary }]
              ]}
              onPress={() => {
                pauseAllVideos();
                setActiveTab("reels");
              }}
            >
              <Feather
                name="video"
                size={24}
                color={
                  activeTab === "reels" ? colors.primary : `${colors.primary}70`
                }
              />
            </TouchableOpacity>
          </View>

          <FlatList
            data={
              activeTab === "posts"
                ? posts
                : activeTab === "saved"
                ? bookmarks
                : reels
            }
            renderItem={({ item }) =>
              activeTab === "reels" ? (
                <ReelItem item={item} />
              ) : (
                renderPost({ item })
              )
            }
            numColumns={3}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.postsContainer}
          />
        </ScrollView>
      )}
      <DeleteModal
        isVisible={isDeleteModalVisible}
        title={`Delete ${itemToDelete?.type || ''}`}
        desc={itemToDelete?.type || ''}
        cancel={() => {
          setIsDeleteModalVisible(false);
          setItemToDelete(null);
        }}
        confirm={handleConfirmDelete}
      />
    </ThemedGradient>
  );
};

const styles = StyleSheet.create({
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
  headerButtons: {
    flexDirection: "row",
    gap: 16,
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
    borderWidth: 2,
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
  username: {
    fontSize: 16,
  },
  bio: {
    marginTop: 6,
    fontSize: 14,
  },
  bioSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  bioHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bioTextContainer: {
    flex: 1,
  },
  infoContainer: {
    flexDirection: "column",
    alignItems: "flex-end",
    marginLeft: 16,
  },
  infoText: {
    fontSize: 14,
  },
  editButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  editButtonText: {
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
    // borderBottomColor is set inline
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  postThumbnail: {
    width: (Dimensions.get("window").width - 36) / 3,
    height: (Dimensions.get("window").width - 36) / 3,
    margin: 6,
    borderRadius: 8,
    overflow: "hidden",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  postContainer: {
    position: "relative",
  },
  postsContainer: {
    paddingHorizontal: 1,
    paddingBottom: 16,
  },
  deleteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    borderRadius: 12,
    padding: 6,
    zIndex: 1,
  },
});

export default Profile;
