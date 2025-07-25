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
  Share,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";
import CommentsModal from "./Comments";

import { AntDesign, FontAwesome, Feather, Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
// import { formatDistanceToNow } from "date-fns";
import { RootState } from "@/src/store/store";
import {
  setPosts,
  toggleBookmark,
  toggleLike,
} from "@/src/store/slices/postsSlice";
import { Post } from "@/src/types/post";
import { useTheme } from "@/src/context/ThemeContext";

const Posts = () => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State for carousel image indexes
  const [activeImageIndexes, setActiveImageIndexes] = useState<{
    [key: string]: number;
  }>({});

  // State for image dimensions to maintain aspect ratio
  const [imageDimensions, setImageDimensions] = useState<{
    [key: string]: { width: number; height: number };
  }>({});

  // State for expanded captions
  const [expandedCaptions, setExpandedCaptions] = useState<{
    [key: string]: boolean;
  }>({});

  // State for comments modal
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<{
    id: string;
    ownerUsername: string;
  } | null>(null);

  const dispatch = useDispatch();
  const posts = useSelector((state: RootState) => state.posts.posts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const POSTS_PER_PAGE = 5;

  useEffect(() => {
    fetchPosts();
  }, []);

  // Helper function to check if caption should be truncated
  const shouldTruncateCaption = (caption: string) => {
    return caption && caption.length > 100; // Truncate if more than 100 characters
  };

  // Helper function to toggle caption expansion
  const toggleCaptionExpansion = (postId: string) => {
    setExpandedCaptions(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  // Helper functions for comments modal
  const openCommentsModal = (postId: string, ownerUsername: string) => {
    console.log('Opening comments modal for post:', postId);
    setSelectedPostForComments({ id: postId, ownerUsername });
    setCommentsModalVisible(true);
  };

  const closeCommentsModal = () => {
    console.log('Closing comments modal');
    setCommentsModalVisible(false);
    setSelectedPostForComments(null);
  };

  // Function to get image dimensions and maintain aspect ratio
  const getImageDimensions = (imageUrl: string, postId: string, imageIndex: number) => {
    const key = `${postId}_${imageIndex}`;
    if (imageDimensions[key]) {
      return imageDimensions[key];
    }

    Image.getSize(
      imageUrl,
      (width, height) => {
        const screenWidth = Dimensions.get("window").width;
        const aspectRatio = width / height;
        const imageHeight = screenWidth / aspectRatio;

        setImageDimensions(prev => ({
          ...prev,
          [key]: { width: screenWidth, height: imageHeight }
        }));
      },
      (error) => {
        console.log("Error getting image size:", error);
        // Fallback to square aspect ratio
        const screenWidth = Dimensions.get("window").width;
        setImageDimensions(prev => ({
          ...prev,
          [key]: { width: screenWidth, height: screenWidth }
        }));
      }
    );

    // Return default dimensions while loading
    const screenWidth = Dimensions.get("window").width;
    return { width: screenWidth, height: screenWidth };
  };

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
          profiles(username, avatar_url),
          likes!likes_post_id_fkey(user_id),
          bookmarks!bookmarks_post_id_fkey(user_id),
          comments:comments!comments_post_id_fkey(id)
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

        // Get the actual comment count from the comments array
        const actualCommentsCount = Array.isArray(post.comments) ? post.comments.length : 0;

        console.log(`Post ${post.id} liked status for user ${user.id}:`, {
          isLiked,
          likesArray: post.likes,
          commentsCount: post.comments_count,
          actualCommentsCount
        });

        // Extract user data from profiles
        const profileData = post.profiles || {};
        const username = profileData.username || "Unknown User";
        const avatar_url = profileData.avatar_url || "https://via.placeholder.com/150";

        return {
          ...post,
          is_liked: isLiked,
          is_bookmarked: isBookmarked,
          comments_count: actualCommentsCount, // Use the actual count from the comments array
          user: { username, avatar_url },
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

      // Make the API call to update the database using the new RPC function
      // The RPC function handles like records, triggers handle count updates
      const { data: isLiked, error } = await supabase.rpc("lightning_toggle_like_v4", {
        post_id_param: postId,
        user_id_param: user.id,
      });

      if (error) {
        console.error("Error in toggle_like RPC:", error);
        // Revert the optimistic update if the API call fails
        dispatch(toggleLike(postId));
        return;
      }

      // No need for forced refresh - the RPC function handles everything atomically
      console.log(`✅ Like toggled successfully: ${isLiked ? 'liked' : 'unliked'}`);
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

      // Make the API call to update the database using the correct function name
      const { error } = await supabase.rpc("lightning_toggle_bookmark_v3", {
        post_id_param: postId,
        user_id_param: user.id,
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
    const renderCarouselItem = ({ item: imageUrl, index }: { item: string; index: number }) => {
      const dimensions = getImageDimensions(imageUrl, post.id, index);

      return (
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/post/[id]",
              params: { id: post.id },
            })
          }
        >
          <View style={[styles.carouselItem, { height: dimensions.height }]}>
            <Image
              source={{ uri: imageUrl }}
              style={[styles.postImage, { width: dimensions.width, height: dimensions.height }]}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
      );
    };

    return (
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <View style={styles.userInfo}>
            <Image
              source={{ uri: post.user.avatar_url }}
              style={[styles.avatar, { borderColor: `${colors.primary}30` }]}
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
                <Text style={[styles.username, { color: colors.text }]}>{post.user.username}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Caption with expand/collapse functionality */}
        {post.caption && (
          <View style={styles.captionContainer}>
            <Text style={[styles.postText, { color: colors.text }]}>
              {shouldTruncateCaption(post.caption) && !expandedCaptions[post.id]
                ? `${post.caption.substring(0, 100)}...`
                : post.caption}
            </Text>
            {shouldTruncateCaption(post.caption) && (
              <TouchableOpacity
                onPress={() => toggleCaptionExpansion(post.id)}
                style={styles.seeMoreButton}
              >
                <Text style={[styles.seeMoreText, { color: colors.text + '80' }]}>
                  {expandedCaptions[post.id] ? 'See less' : 'See more'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Hashtags Display */}
        {post.hashtags && post.hashtags.length > 0 && (
          <View style={styles.hashtagsContainer}>
            <FlatList
              data={post.hashtags}
              renderItem={({ item: hashtag, index }) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.hashtagButton, { backgroundColor: `${colors.primary}15` }]}
                  onPress={() => {
                    // Navigate to hashtag search or handle hashtag tap
                    console.log("Hashtag tapped:", hashtag);
                  }}
                >
                  <Text style={[styles.hashtagText, { color: colors.primary }]}>
                    #{hashtag}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item, index) => `${item}-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hashtagsList}
            />
          </View>
        )}

        <View style={styles.imageContainer}>
          <Carousel
            loop={false}
            width={Dimensions.get("window").width}
            height={(() => {
              // Calculate height based on first image dimensions for consistency
              const firstImageDimensions = getImageDimensions(post.image_urls[0], post.id, 0);
              return firstImageDimensions.height;
            })()}
            data={post.image_urls}
            defaultIndex={activeImageIndexes[post.id] || 0}
            onSnapToItem={(index) =>
              setActiveImageIndexes((prev) => ({ ...prev, [post.id]: index }))
            }
            renderItem={({ item: imageUrl, index }) => {
              const dimensions = getImageDimensions(imageUrl, post.id, index);
              return (
                <View style={[styles.carouselItem, { height: dimensions.height }]}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={[styles.postImage, { width: dimensions.width, height: dimensions.height }]}
                    resizeMode="contain"
                  />
                </View>
              );
            }}
            onConfigurePanGesture={(gestureChain) =>
              gestureChain.activeOffsetX([-10, 10])
            }
            enabled={post.image_urls.length > 1}
            scrollAnimationDuration={300}
            withAnimation={{
              type: "spring",
              config: {
                damping: 15,
                stiffness: 100,
              },
            }}
          />

          {post.image_urls.length > 1 && (
            <View style={styles.pagination}>
              {post.image_urls.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    { backgroundColor: `${colors.text}50` },
                    index === (activeImageIndexes[post.id] || 0) && [
                      styles.paginationDotActive,
                      { backgroundColor: colors.primary }
                    ],
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.postStats}>
          <Text style={[styles.statText, { color: colors.text }]}>
            {post.likes_count} {post.likes_count === 1 ? "like" : "likes"}
          </Text>
          <TouchableOpacity
            onPress={() => openCommentsModal(post.id, post.user.username)}
          >
            {post.comments_count > 0 ? (
              <Text style={[styles.statText, { color: colors.text }]}>
                {post.comments_count}{" "}
                {post.comments_count === 1 ? "comment" : "comments"}
              </Text>
            ) : (
              <Text style={[styles.statText, { color: colors.text }]}>
                No comments
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.postActions, { borderTopColor: `${colors.primary}20` }]}>
          <View style={styles.leftActions}>
            <TouchableOpacity
              onPress={() => handleLike(post.id)}
              style={styles.actionButton}
            >
              <AntDesign
                name={post.is_liked ? "heart" : "hearto"}
                size={24}
                color={post.is_liked ? colors.error : colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openCommentsModal(post.id, post.user.username)}
              style={styles.actionButton}
            >
              <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleShare(post)}
              style={styles.actionButton}
            >
              <Feather name="send" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => handleBookmark(post.id)}
            style={styles.bookmarkButton}
          >
            <FontAwesome
              name={post.is_bookmarked ? "bookmark" : "bookmark-o"}
              size={24}
              color={post.is_bookmarked ? colors.primary : colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Comment input section removed - now handled in the comments screen */}
      </View>
    );
  };

  if (loading && posts.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
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
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        contentContainerStyle={[styles.listContainer, { paddingBottom: 120 }]}
      />

      {/* Comments Modal */}
      {selectedPostForComments && (
        <CommentsModal
          entityType="post"
          entityId={selectedPostForComments.id}
          onClose={closeCommentsModal}
          entityOwnerUsername={selectedPostForComments.ownerUsername}
          visible={commentsModalVisible}
        />
      )}
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
  },
  postContainer: {
    marginBottom: 16,
    padding: 16,
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
  },
  username: {
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    fontStyle: "italic",
  },
  postTime: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.6,
  },
  moreButton: {
    padding: 8,
  },
  captionContainer: {
    marginBottom: 12,
  },
  postText: {
    fontSize: 14,
    fontFamily: "Rubik-Regular",
    lineHeight: 20,
    marginBottom: 4,
  },
  seeMoreButton: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  seeMoreText: {
    fontSize: 14,
    fontFamily: "Rubik-Medium",
    fontWeight: '500',
  },
  hashtagsContainer: {
    marginBottom: 12,
  },
  hashtagsList: {
    paddingHorizontal: 4,
  },
  hashtagButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  hashtagText: {
    fontSize: 13,
    fontFamily: "Rubik-Medium",
  },
  imageContainer: {
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
    marginHorizontal: -16,
  },
  imageWrapper: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  postImage: {
    width: "100%",
  },
  carouselItem: {
    width: "100%",
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
    marginHorizontal: 4,
  },
  paginationDotActive: {
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
  },
  postActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    marginHorizontal: -16,
  },
  leftActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
    marginRight: 16,
  },
  bookmarkButton: {
    padding: 8,
  },
  commentsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  commentInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontFamily: "Rubik-Regular",
  },
  commentButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  commentButtonText: {
    fontFamily: "Rubik-Medium",
  },
  loader: {
    padding: 16,
    alignItems: "center",
  },

});

export default Posts;
