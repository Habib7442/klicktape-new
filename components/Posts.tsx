import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  TextInput,
  Share,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { AntDesign, FontAwesome, Feather, Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
// import { formatDistanceToNow } from "date-fns";
import { RootState } from "@/src/store/store";
import {
  setPosts,
  toggleBookmark,
  toggleLike,
} from "@/src/store/slices/postsSlice";
import { Post } from "@/src/types/post";

const Posts = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // State for comment text
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});

  // State for carousel image indexes
  const [activeImageIndexes, setActiveImageIndexes] = useState<{
    [key: string]: number;
  }>({});

  const dispatch = useDispatch();
  const posts = useSelector((state: RootState) => state.posts.posts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const POSTS_PER_PAGE = 5;

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async (pageNumber = 1, isLoadMore = false) => {
    try {
      if (!supabase) {
        console.error("Supabase client is not initialized");
        return;
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("Error getting current user:", authError);
        router.replace("/sign-in");
        return;
      }

      if (!user) {
        console.error("No user found");
        router.replace("/sign-in");
        return;
      }

      console.log("Fetching posts for user:", user.id);

      const offset = (pageNumber - 1) * POSTS_PER_PAGE;
      const { data: fetchedPosts, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          user:profiles!posts_user_id_fkey(username, avatar_url),
          likes!likes_post_id_fkey(user_id),
          bookmarks!bookmarks_post_id_fkey(user_id)
          `
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + POSTS_PER_PAGE - 1);

      if (error) {
        console.error("Error fetching posts:", error);
        throw error;
      }

      if (!fetchedPosts || fetchedPosts.length === 0) {
        console.log("No posts found");
        if (!isLoadMore) {
          dispatch(setPosts([]));
        }
        setHasMore(false);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Explicitly check if the current user has liked or bookmarked each post
      const updatedPosts = fetchedPosts.map((post) => {
        // Check if the current user's ID is in the likes array
        const isLiked = Array.isArray(post.likes) &&
          post.likes.some((like: any) => like.user_id === user.id);

        // Check if the current user's ID is in the bookmarks array
        const isBookmarked = Array.isArray(post.bookmarks) &&
          post.bookmarks.some((bookmark: any) => bookmark.user_id === user.id);

        console.log(`Post ${post.id} liked status for user ${user.id}:`, {
          isLiked,
          likesArray: post.likes
        });

        return {
          ...post,
          is_liked: isLiked,
          is_bookmarked: isBookmarked,
          user: post.user || { username: "Unknown User", avatar_url: "https://via.placeholder.com/150" },
        };
      });

      dispatch(
        setPosts(isLoadMore ? [...posts, ...updatedPosts] : updatedPosts)
      );
      setHasMore(fetchedPosts.length === POSTS_PER_PAGE);
    } catch (error) {
      console.error("Error fetching posts:", error);
      if (!isLoadMore) {
        dispatch(setPosts([]));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setLoading(true);
      setPage((prev) => prev + 1);
      fetchPosts(page + 1, true);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      if (!supabase) {
        console.error("Supabase client is not initialized");
        return;
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("Error getting current user:", authError);
        return;
      }

      if (!user) {
        router.push("/sign-in");
        return;
      }

      // Optimistically update UI
      dispatch(toggleLike(postId));

      // Make the API call to update the database
      const { error } = await supabase.rpc("toggle_like", {
        post_id: postId,
        user_id: user.id,
      });

      if (error) {
        console.error("Error in toggle_like RPC:", error);
        // Revert the optimistic update if the API call fails
        dispatch(toggleLike(postId));
        return;
      }

      // Force a refresh of the posts to ensure like status is correct
      setTimeout(() => {
        fetchPosts(1, false);
      }, 500);
    } catch (error) {
      // Revert the optimistic update if there's an exception
      dispatch(toggleLike(postId));
      console.error("Exception in handleLike:", error);
    }
  };

  const handleBookmark = async (postId: string) => {
    try {
      if (!supabase) {
        console.error("Supabase client is not initialized");
        return;
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("Error getting current user:", authError);
        return;
      }

      if (!user) {
        router.push("/sign-in");
        return;
      }

      // Optimistically update UI
      dispatch(toggleBookmark(postId));

      // Make the API call to update the database
      const { error } = await supabase.rpc("toggle_bookmark", {
        post_id: postId,
        user_id: user.id,
      });

      if (error) {
        console.error("Error in toggle_bookmark RPC:", error);
        // Revert the optimistic update if the API call fails
        dispatch(toggleBookmark(postId));
        return;
      }

      // Force a refresh of the posts to ensure bookmark status is correct
      setTimeout(() => {
        fetchPosts(1, false);
      }, 500);
    } catch (error) {
      // Revert the optimistic update if there's an exception
      dispatch(toggleBookmark(postId));
      console.error("Exception in handleBookmark:", error);
    }
  };

  const handleComment = async (postId: string) => {
    try {
      if (!supabase) {
        console.error("Supabase client is not initialized");
        return;
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("Error getting current user:", authError);
        return;
      }

      if (!user) {
        router.push("/sign-in");
        return;
      }

      const comment = commentText[postId]?.trim();
      if (!comment) return;

      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        user_id: user.id,
        content: comment,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Error inserting comment:", error);
        return;
      }

      // Clear the comment text and refresh posts
      setCommentText((prev) => ({ ...prev, [postId]: "" }));
      fetchPosts();
    } catch (error) {
      console.error("Exception in handleComment:", error);
    }
  };

  const handleShare = async (post: Post) => {
    try {
      if (post.image_urls.length > 0) {
        const currentImageIndex = activeImageIndexes[post.id] || 0;
        const imageUrl = post.image_urls[currentImageIndex];

        await Share.share({
          message: `Check out this post by ${post.user.username} on Klicktape: ${post.caption}`,
          url: imageUrl,
        });
      }
    } catch (error) {
      console.error("Error sharing post:", error);
    }
  };

  const renderPost = ({ item: post }: { item: Post }) => {
    const renderCarouselItem = ({ item: imageUrl }: { item: string }) => (
      // <TouchableOpacity
      //   onPress={() =>
      //     router.push({
      //       pathname: "/post/[id]",
      //       params: { id: post.id },
      //     })
      //   }
      // >
      <View style={styles.carouselItem}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.postImage}
          resizeMode="cover"
        />
      </View>
      // </TouchableOpacity>
    );

    return (
      <LinearGradient
        colors={["rgba(42, 42, 42, 0.8)", "rgba(26, 26, 26, 0.9)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.postContainer}
      >
        <View style={styles.postHeader}>
          <View style={styles.userInfo}>
            <Image
              source={{ uri: post.user.avatar_url }}
              style={styles.avatar}
            />

            <View>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/userProfile/[id]",
                    params: { id: post.user_id },
                  })
                }
              >
                <Text style={styles.username}>{post.user.username}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={styles.postText}>{post.caption}</Text>

        <View style={styles.imageContainer}>
          <Carousel
            loop={false}
            width={Dimensions.get("window").width - 32}
            height={Dimensions.get("window").width - 32}
            data={post.image_urls}
            defaultIndex={activeImageIndexes[post.id] || 0}
            onSnapToItem={(index) =>
              setActiveImageIndexes((prev) => ({ ...prev, [post.id]: index }))
            }
            renderItem={renderCarouselItem}
            onConfigurePanGesture={(gestureChain) =>
              gestureChain.activeOffsetX([-10, 10])
            }
          />
          {post.image_urls.length > 1 && (
            <View style={styles.pagination}>
              {post.image_urls.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === (activeImageIndexes[post.id] || 0) &&
                      styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.postStats}>
          <Text style={styles.statText}>
            {post.likes_count} {post.likes_count === 1 ? "like" : "likes"}
          </Text>
          <TouchableOpacity
            onPress={() => {
              router.push({
                pathname: "/(root)/posts-comments-screen",
                params: {
                  postId: post.id,
                  postOwnerUsername: post.user.username,
                }
              });
            }}
          >
            <Text style={styles.statText}>
              {post.comments_count}{" "}
              {post.comments_count === 1 ? "comment" : "comments"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.postActions}>
          <TouchableOpacity
            onPress={() => handleLike(post.id)}
            style={styles.actionButton}
          >
            <AntDesign
              name={post.is_liked ? "heart" : "hearto"}
              size={24}
              color={post.is_liked ? "#ff6b6b" : "#ffffff"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              router.replace({
                pathname: "/(root)/posts-comments-screen",
                params: {
                  postId: post.id,
                  postOwnerUsername: post.user.username,
                },
              })
            }
            style={styles.actionButton}
          >
            <Ionicons name="chatbubble-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
          {/* Remove the semicolon here */}
          <TouchableOpacity
            onPress={() => handleShare(post)}
            style={styles.actionButton}
          >
            <Feather name="send" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleBookmark(post.id)}
            style={[styles.actionButton, { marginLeft: "auto" }]}
          >
            <FontAwesome
              name={post.is_bookmarked ? "bookmark" : "bookmark-o"}
              size={24}
              color={post.is_bookmarked ? "#FFD700" : "#ffffff"}
            />
          </TouchableOpacity>
        </View>

        {/* Comment input section removed - now handled in the comments screen */}
      </LinearGradient>
    );
  };

  if (loading && posts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          setPage(1);
          fetchPosts(1);
        }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() =>
          loading && hasMore ? (
            <View style={styles.loader}>
              <ActivityIndicator color="#FFD700" />
            </View>
          ) : null
        }
        contentContainerStyle={[styles.listContainer, { paddingBottom: 120 }]}
      />
    </>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  postContainer: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  username: {
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    color: "#ffffff",
    fontStyle: "italic",
  },
  postTime: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
  },
  postText: {
    fontSize: 14,
    fontFamily: "Rubik-Regular",
    color: "#ffffff",
    marginBottom: 12,
    lineHeight: 20,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
  },
  postImage: {
    width: "100%",
    height: "100%",
  },
  carouselItem: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  pagination: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: "#FFD700",
    width: 8,
    height: 8,
  },
  postStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statText: {
    fontSize: 14,
    fontFamily: "Rubik-Medium",
    color: "#ffffff",
  },
  postActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  actionButton: {
    padding: 8,
    marginRight: 16,
  },
  commentsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  commentInput: {
    flex: 1,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 16,
    color: "#ffffff",
    fontFamily: "Rubik-Regular",
  },
  commentButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFD700",
  },
  commentButtonText: {
    fontFamily: "Rubik-Medium",
    color: "#000000",
  },
  loader: {
    padding: 16,
    alignItems: "center",
  },
});

export default Posts;
