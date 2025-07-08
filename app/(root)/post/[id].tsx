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
import { toggleLike, toggleBookmark } from "@/src/store/slices/postsSlice";
import { RootState } from "@/src/store/store";
import { useTheme } from "@/src/context/ThemeContext";

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
      const {
        data: { user },
      } = await supabase!.auth.getUser();
      setUserId(user?.id || null);
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
        .eq("id", id as string)
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
          user:profiles!fk_comments_user (
            username,
            avatar_url
          )
          `
        )
        .eq("post_id", id as string)
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
        ...postData,
        user: {
          username: (postData.user as any)?.username || "Unknown User",
          avatar_url: (postData.user as any)?.avatar_url || "https://via.placeholder.com/150"
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

    // Remove local state management since we're using Redux
    const newLikeStatus = !isLiked;

    // Update post likes count
    setPost((prev) =>
      prev
        ? {
            ...prev,
            likes_count: newLikeStatus
              ? prev.likes_count + 1
              : prev.likes_count - 1,
          }
        : null
    );

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

      const { error } = await supabase!.rpc("toggle_like", {
        post_id: post.id,
        user_id: userId,
      });

      if (error) throw error;
    } catch (error) {
      // Revert the Redux state on error
      dispatch(toggleLike(post.id));

      // Revert the post count
      setPost((prev) =>
        prev
          ? {
              ...prev,
              likes_count: newLikeStatus
                ? prev.likes_count - 1
                : prev.likes_count + 1,
            }
          : null
      );
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
        })
        .select(
          `
          id,
          content,
          created_at,
          user:profiles!fk_comments_user (
            username,
            avatar_url
          )
        `
        )
        .single();

      if (error) throw error;

      await supabase!
        .from("posts")
        .update({ comments_count: post.comments_count + 1 })
        .eq("id", post.id);

      // Transform the comment data to match the Comment type
      const transformedComment = {
        id: commentData.id,
        content: commentData.content,
        created_at: commentData.created_at,
        user: {
          username: (commentData.user as any)?.username || "You",
          avatar_url: (commentData.user as any)?.avatar_url || "https://via.placeholder.com/150"
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
              <Text style={[styles.count, { color: colors.textSecondary }]}>{post.likes_count} likes</Text>
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


