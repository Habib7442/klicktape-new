import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";

import { supabase } from "@/lib/supabase";
import { useDispatch, useSelector } from "react-redux";
import { toggleLike, toggleBookmark, updatePost } from "@/src/store/slices/postsSlice";
import { RootState } from "@/src/store/store";
import { useTheme } from "@/src/context/ThemeContext";
import { authManager } from "@/lib/authManager";
import { SupabaseNotificationBroadcaster } from "@/lib/supabaseNotificationManager";

const { width } = Dimensions.get("window");
const IMAGE_HEIGHT = width * 0.9;

// Update the comment interface to match the correct field name
interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    username: string;
    avatar_url: string;  // Changed from avatar to avatar_url
  };
}

interface Post {
  id: string;
  user_id: string;
  caption: string;
  image_urls: string[];
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_bookmarked?: boolean;
  user: {
    username: string;
    avatar_url: string;
  };
}

const PostDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const router = useRouter();
  const likeScale = useState(new Animated.Value(1))[0];
  const dispatch = useDispatch();
  const { isDarkMode, colors } = useTheme();



  // Get bookmark status from Redux store
  const bookmarkedPosts = useSelector(
    (state: RootState) => state.posts.bookmarkedPosts
  );
  // Add this selector to get liked posts state from Redux
  const likedPosts = useSelector((state: RootState) => state.posts.likedPosts);
  const isBookmarked = post ? bookmarkedPosts[post.id] || false : false;
  // Use Redux state for likes instead of local state
  const isLiked = post ? likedPosts[post.id] || false : false;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Use cached auth manager instead of direct Supabase call
        const user = await authManager.getCurrentUser();
        setUserId(user?.id || null);
      } catch (error) {
        console.error("Error fetching user:", error);
        // Fallback to direct Supabase call if auth manager fails
        try {
          const { data: { user } } = await supabase!.auth.getUser();
          setUserId(user?.id || null);
        } catch (fallbackError) {
          console.error("Fallback auth error:", fallbackError);
        }
      }
    };

    fetchUser();
    fetchPostAndComments();
  }, [id]);

  const fetchPostAndComments = async () => {
    try {
      setLoading(true);
      const { data: postData, error: postError } = await supabase!
        .from("posts")
        .select(
          `
          id,
          user_id,
          caption,
          image_urls,
          created_at,
          likes_count,
          comments_count,
          user:profiles!posts_user_id_fkey (
            username,
            avatar_url
          )
          `
        )
        .eq("id", id as any)
        .single();

      if (postError || !postData) {
        throw postError || new Error("Post not found");
      }

      const { data: commentsData, error: commentsError } = await supabase!
        .from("comments")
        .select(
          `
          id,
          content,
          created_at,
          user:profiles!comments_user_id_fkey (
            username,
            avatar_url
          )
          `
        )
        .eq("post_id", id as any)
        .order("created_at", { ascending: false });

      if (commentsError) throw commentsError;

      // Transform comments data to match the Comment type
      const transformedComments = commentsData?.map((comment: any) => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        user: {
          username: (comment.user as any)?.username || "Unknown User",
          avatar_url: (comment.user as any)?.avatar_url || "https://via.placeholder.com/150"
        }
      })) || [];

      // Transform post data to match the Post type
      const transformedPost = {
        ...(postData as any),
        user: {
          username: (postData as any)?.user?.username || "Unknown User",
          avatar_url: (postData as any)?.user?.avatar_url || "https://via.placeholder.com/150"
        }
      };

      setPost(transformedPost as Post);
      setComments(transformedComments as Comment[]);
    } catch (error: any) {
      console.error("Error fetching post details:", error.message, error.details, error.hint);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!userId || !post) return;

    // Animate the like button
    Animated.sequence([
      Animated.timing(likeScale, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(likeScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      // Dispatch Redux action first for immediate UI update
      dispatch(toggleLike(post.id));

      const { data: isLiked, error } = await supabase!.rpc("lightning_toggle_like_v4", {
        post_id_param: post.id,
        user_id_param: userId,
      });

      if (error) throw error;

      // After successful like toggle, fetch the updated post data to ensure consistency
      const { data: updatedPost, error: fetchError } = await supabase
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
        .eq("id", post.id as any)
        .single();

      if (fetchError) {
        console.error("Error fetching updated post:", fetchError);
        return;
      }

      if (updatedPost) {
        // Process the updated post data
        const isLikedUpdated =
          Array.isArray((updatedPost as any).likes) &&
          (updatedPost as any).likes.some((like: any) => like.user_id === userId);

        const isBookmarked =
          Array.isArray((updatedPost as any).bookmarks) &&
          (updatedPost as any).bookmarks.some((bookmark: any) => bookmark.user_id === userId);

        const actualCommentsCount = Array.isArray((updatedPost as any).comments)
          ? (updatedPost as any).comments.length
          : 0;

        const profileData = (updatedPost as any).profiles || {};
        const username = profileData.username || "Unknown User";
        const avatar_url =
          profileData.avatar_url || "https://via.placeholder.com/150";

        const processedPost = {
          ...(updatedPost as any),
          is_liked: isLikedUpdated,
          is_bookmarked: isBookmarked,
          comments_count: actualCommentsCount,
          user: { username, avatar_url },
        };

        // Update the specific post in Redux with the fresh data from database
        dispatch(updatePost(processedPost));

        // Also update the local post state for this page
        setPost(processedPost);
      }

      // Note: Notification creation is now handled centrally in postsAPI.toggleLike
      // to prevent duplicate notifications from multiple UI components

      console.log(`✅ Like toggled successfully: ${isLiked ? "liked" : "unliked"}`);
    } catch (error) {
      // Revert the Redux state on error
      dispatch(toggleLike(post.id));
      console.error("Error toggling like:", error);
    }
  };

  const handleBookmark = async () => {
    if (!userId || !post) return;

    try {
      // Dispatch the action to update Redux store
      dispatch(toggleBookmark(post.id));

      const { error } = await supabase!.rpc("toggle_bookmark", {
        post_id: post.id,
        user_id: userId,
      });

      if (error) throw error;
    } catch (error) {
      // Revert the bookmark state in Redux if the API call fails
      dispatch(toggleBookmark(post.id));
      console.error("Error toggling bookmark:", error);
    }
  };

  const handleComment = async () => {
    if (!userId || !post || !newComment.trim()) return;

    try {
      const { data: commentData, error } = await supabase!
        .from("comments")
        .insert({
          post_id: post.id,
          user_id: userId,
          content: newComment,
        } as any)
        .select(
          `
          id,
          content,
          created_at,
          user:profiles!comments_user_id_fkey (
            username,
            avatar_url
          )
        `
        )
        .single();

      if (error) throw error;

      await supabase!
        .from("posts")
        .update({ comments_count: post.comments_count + 1 } as any)
        .eq("id", post.id as any);

      // Create notification for the post owner
      if (post.user_id !== userId) {
        try {
          await supabase!.from("notifications").insert({
            recipient_id: post.user_id,
            sender_id: userId,
            type: "comment",
            post_id: post.id,
            comment_id: (commentData as any).id,
            created_at: new Date().toISOString(),
            is_read: false,
          } as any);
        } catch (notificationError) {
          console.error("Error creating comment notification:", notificationError);
          // Don't throw - comment was created successfully
        }
      }

      // Transform the comment data to match the Comment type
      const transformedComment = {
        id: (commentData as any).id,
        content: (commentData as any).content,
        created_at: (commentData as any).created_at,
        user: {
          username: (commentData as any)?.user?.username || "You",
          avatar_url: (commentData as any)?.user?.avatar_url || "https://via.placeholder.com/150"
        }
      };

      setComments((prev) => [transformedComment as Comment, ...prev]);
      setNewComment("");
      setPost((prev) =>
        prev ? { ...prev, comments_count: prev.comments_count + 1 } : null
      );
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const onScrollImage = (event: any) => {
    const slide = Math.ceil(
      event.nativeEvent.contentOffset.x /
        event.nativeEvent.layoutMeasurement.width
    );
    setCurrentImageIndex(slide);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#000000' : '#FFFFFF' }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#000000' : '#FFFFFF' }]}>
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.text }]}>Post not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#000000' : '#FFFFFF' }]}>
      <View style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
          style={styles.container}
        >
        <ScrollView style={styles.scrollView}>
          <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.backButton, {
                backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
                borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)'
              }]}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.userInfo}>
              <Image
                source={{ uri: post.user.avatar_url }}
                style={[styles.avatar, { borderColor: colors.cardBorder }]}
              />
              <Text style={[styles.username, { color: colors.text }]}>{post.user.username}</Text>
            </View>
          </View>

          <View style={styles.imageContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onScrollImage}
              scrollEventThrottle={16}
            >
              {post.image_urls.map((url, index) => (
                <Image
                  key={index}
                  source={{ uri: url }}
                  style={[styles.image, { borderColor: colors.cardBorder }]}
                  resizeMode="contain"
                />
              ))}
            </ScrollView>
            {post.image_urls.length > 1 && (
              <View style={styles.pagination}>
                {post.image_urls.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      { backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)" },
                      currentImageIndex === index && [styles.activeDot, { backgroundColor: isDarkMode ? '#808080' : '#606060' }],
                    ]}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <View style={styles.leftActions}>
              <TouchableOpacity onPress={handleLike}>
                <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                  <Ionicons
                    name={isLiked ? "heart" : "heart-outline"}
                    size={28}
                    color={isLiked ? colors.primary : "white"}
                  />
                </Animated.View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push(`/(root)/post-likes/${post.id}` as any)}>
                <Text style={[styles.count, { color: colors.textSecondary }]}>{post.likes_count} likes</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleBookmark}
              style={styles.bookmarkButton}
            >
              <Ionicons
                name={isBookmarked ? "bookmark" : "bookmark-outline"}
                size={28}
                color={isBookmarked ? colors.primary : "white"}
              />
            </TouchableOpacity>
          </View>

          <View style={[styles.captionContainer, { borderBottomColor: `rgba(${isDarkMode ? '255, 215, 0' : '184, 134, 11'}, 0.1)` }]}>
            <Text style={[styles.username, { color: colors.text }]}>{post.user.username}</Text>
            <Text style={[styles.caption, { color: colors.textSecondary }]}>{post.caption}</Text>
            <Text style={[styles.timeAgo, { color: colors.textTertiary }]}>
              {moment(post.created_at).fromNow()}
            </Text>
          </View>

          <View style={styles.commentsSection}>
            <Text style={[styles.commentsHeader, { color: colors.text }]}>
              Comments ({post.comments_count})
            </Text>
            {comments.map((comment) => (
              <View key={comment.id} style={[styles.commentItem, {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder
              }]}>
                <Image
                  source={{ uri: comment.user.avatar_url }}
                  style={[styles.commentAvatar, {
                    borderColor: colors.cardBorder
                  }]}
                />
                <View style={styles.commentContent}>
                  <Text style={[styles.commentUsername, { color: colors.text }]}>
                    {comment.user.username}
                  </Text>
                  <Text style={[styles.commentText, { color: colors.textSecondary }]}>{comment.content}</Text>
                  <Text style={[styles.commentTime, { color: colors.textTertiary }]}>
                    {moment(comment.created_at).fromNow()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.commentInput, {
          backgroundColor: isDarkMode ? "rgba(18, 18, 18, 0.9)" : "rgba(248, 249, 250, 0.9)",
          borderTopColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)'
        }]}>
          <TextInput
            placeholder="Add a comment..."
            placeholderTextColor={isDarkMode ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)"}
            value={newComment}
            onChangeText={setNewComment}
            style={[styles.input, {
              color: colors.text,
              backgroundColor: colors.input,
              borderColor: colors.inputBorder
            }]}
            multiline
          />
          <TouchableOpacity
            onPress={handleComment}
            disabled={!newComment.trim()}
            style={[
              styles.postButton,
              {
                backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
                borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.4)' : 'rgba(128, 128, 128, 0.3)'
              },
              !newComment.trim() && styles.disabledButton,
            ]}
          >
            <Text style={[styles.postButtonText, { color: colors.text }]}>Post</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    fontFamily: "Rubik-Regular",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  backButton: {
    padding: 10,
    borderRadius: 20,
    marginRight: 16,
    borderWidth: 1,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
  },
  username: {
    fontSize: 16,
    fontFamily: "Rubik-Bold",
  },
  imageContainer: {
    position: "relative",
  },
  image: {
    width: width - 32,
    height: IMAGE_HEIGHT,
    borderRadius: 16,
    marginHorizontal: 16,
    borderWidth: 1,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    // backgroundColor will be set dynamically
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    justifyContent: "space-between", // This will push items to the edges
  },
  leftActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  bookmarkButton: {
    padding: 8,
  },
  count: {
    marginLeft: 12,
    fontSize: 14,
    fontFamily: "Rubik-Medium",
  },
  captionContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  caption: {
    fontSize: 14,
    marginTop: 6,
    fontFamily: "Rubik-Regular",
    lineHeight: 20,
  },
  timeAgo: {
    fontSize: 12,
    marginTop: 8,
    fontFamily: "Rubik-Regular",
  },
  commentsSection: {
    padding: 16,
    paddingBottom: 32,
  },
  commentsHeader: {
    fontSize: 18,
    marginBottom: 16,
    fontFamily: "Rubik-Medium",
  },
  commentItem: {
    flexDirection: "row",
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
  },
  commentContent: {
    flex: 1,
  },
  commentUsername: {
    fontSize: 14,
    marginBottom: 4,
    fontFamily: "Rubik-Medium",
  },
  commentText: {
    fontSize: 14,
    fontFamily: "Rubik-Regular",
    lineHeight: 20,
  },
  commentTime: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: "Rubik-Regular",
  },
  commentInput: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 120,
    fontSize: 14,
    fontFamily: "Rubik-Regular",
  },
  postButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
  postButtonText: {
    fontSize: 14,
    fontFamily: "Rubik-Medium",
  },
});

export default PostDetailScreen;


