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
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";
import { useDispatch, useSelector } from "react-redux";
import { toggleLike } from "@/src/store/slices/postsSlice";
import { RootState } from "@/src/store/store";

const { width } = Dimensions.get("window");
const IMAGE_HEIGHT = width * 0.9; // Maintain aspect ratio for images

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    username: string;
    avatar: string;
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
    avatar: string;
  };
}

const PostDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const router = useRouter();
  const likeScale = useState(new Animated.Value(1))[0];
  const dispatch = useDispatch();
  const likedPosts = useSelector((state: RootState) => state.posts.likedPosts);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };

    fetchUser();
    fetchPostAndComments();
  }, [id]);

  const fetchPostAndComments = async () => {
    try {
      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select(
          `
          id,
          caption,
          image_urls,
          created_at,
          likes_count,
          comments_count,
          user:profiles!fk_posts_user (
            username,
            avatar_url
          )
        `
        )
        .eq("id", id as string)
        .single();

      if (postError || !postData)
        throw postError || new Error("Post not found");

      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select(
          `
          id,
          content,
          created_at,
          user:user_id (
            username,
            avatar
          )
        `
        )
        .eq("post_id", id as string)
        .order("created_at", { ascending: false });

      if (commentsError) throw commentsError;

      if (userId) {
        // Check like status
        const { data: likeData, error: likeError } = await supabase
          .from("likes")
          .select("id")
          .eq("post_id", id as string)
          .eq("user_id", userId)
          .single();

        if (!likeError && likeData) {
          setIsLiked(true);
        }

        // Check bookmark status
        const { data: bookmarkData, error: bookmarkError } = await supabase
          .from("bookmarks")
          .select("id")
          .eq("post_id", id as string)
          .eq("user_id", userId)
          .single();

        if (!bookmarkError && bookmarkData) {
          setIsBookmarked(true);
        }
      }
      const isLikedFromRedux = likedPosts[postData.id] || false;
      setIsLiked(isLikedFromRedux);
      setPost(postData as Post);
      setComments(commentsData as Comment[]);
    } catch (error) {
      console.error(
        "Error fetching post details:",
        JSON.stringify(error, null, 2)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!userId || !post) return;

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
      dispatch(toggleLike(post.id));
      const { error } = await supabase.rpc("toggle_like", {
        post_id: post.id,
        user_id: userId,
      });

      if (error) throw error;
    } catch (error) {
      // Revert the like state if the API call fails
      dispatch(toggleLike(post.id));
      console.error("Error toggling like:", JSON.stringify(error, null, 2));
    }
  };

  const handleComment = async () => {
    if (!userId || !post || !newComment.trim()) return;

    try {
      const { data: commentData, error } = await supabase
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
          user:user_id (
            username,
            avatar
          )
        `
        )
        .single();

      if (error) throw error;

      await supabase
        .from("posts")
        .update({ comments_count: post.comments_count + 1 })
        .eq("id", post.id);

      setComments((prev) => [commentData as Comment, ...prev]);
      setNewComment("");
      setPost((prev) =>
        prev ? { ...prev, comments_count: prev.comments_count + 1 } : null
      );
    } catch (error) {
      console.error("Error adding comment:", JSON.stringify(error, null, 2));
    }
  };

  const onScrollImage = (event: any) => {
    const slide = Math.ceil(
      event.nativeEvent.contentOffset.x /
        event.nativeEvent.layoutMeasurement.width
    );
    setCurrentImageIndex(slide);
  };

  const handleBookmark = async () => {
    if (!userId || !post) return;

    try {
      setIsBookmarked(!isBookmarked);
      const { error } = await supabase.rpc("toggle_bookmark", {
        post_id: post.id,
        user_id: userId,
      });

      if (error) throw error;
    } catch (error) {
      setIsBookmarked(!isBookmarked); // Revert on error
      console.error("Error toggling bookmark:", JSON.stringify(error, null, 2));
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={["#121212", "#1e1e1e", "#2c2c2c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.centered}
      >
        <ActivityIndicator size="large" color="#FFD700" />
      </LinearGradient>
    );
  }

  if (!post) {
    return (
      <LinearGradient
        colors={["#121212", "#1e1e1e", "#2c2c2c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.centered}
      >
        <Text style={styles.errorText}>Post not found</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#121212", "#1e1e1e", "#2c2c2c"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#FFD700" />
            </TouchableOpacity>
            <View style={styles.userInfo}>
              <Image source={{ uri: post.user.avatar_url }} style={styles.avatar} />
              <Text style={styles.username}>{post.user.username}</Text>
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
                  style={styles.image}
                  resizeMode="cover"
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
                      currentImageIndex === index && styles.activeDot,
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
                    color={isLiked ? "#FFD700" : "#ffffff"}
                  />
                </Animated.View>
              </TouchableOpacity>
              <Text style={styles.count}>{post.likes_count} likes</Text>
            </View>
            
            <TouchableOpacity onPress={handleBookmark} style={styles.bookmarkButton}>
              <Ionicons
                name={isBookmarked ? "bookmark" : "bookmark-outline"}
                size={28}
                color={isBookmarked ? "#FFD700" : "#ffffff"}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.captionContainer}>
            <Text style={styles.username}>{post.user.username}</Text>
            <Text style={styles.caption}>{post.caption}</Text>
            <Text style={styles.timeAgo}>
              {moment(post.created_at).fromNow()}
            </Text>
          </View>

          <View style={styles.commentsSection}>
            <Text style={styles.commentsHeader}>
              Comments ({post.comments_count})
            </Text>
            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <Image
                  source={{ uri: comment.user.avatar }}
                  style={styles.commentAvatar}
                />
                <View style={styles.commentContent}>
                  <Text style={styles.commentUsername}>
                    {comment.user.username}
                  </Text>
                  <Text style={styles.commentText}>{comment.content}</Text>
                  <Text style={styles.commentTime}>
                    {moment(comment.created_at).fromNow()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.commentInput}>
          <TextInput
            placeholder="Add a comment..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={newComment}
            onChangeText={setNewComment}
            style={styles.input}
            multiline
          />
          <TouchableOpacity
            onPress={handleComment}
            disabled={!newComment.trim()}
            style={[
              styles.postButton,
              !newComment.trim() && styles.disabledButton,
            ]}
          >
            <Text style={styles.postButtonText}>Post</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
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
    color: "#ffffff",
    fontFamily: "Rubik-Regular",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 215, 0, 0.1)",
  },
  backButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    marginRight: 16,
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
    borderColor: "rgba(255, 215, 0, 0.4)",
  },
  username: {
    fontSize: 16,
    color: "#ffffff",
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
    borderColor: "rgba(255, 215, 0, 0.2)",
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
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "#FFD700",
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
    color: "rgba(255, 255, 255, 0.9)",
    fontFamily: "Rubik-Medium",
  },
  captionContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 215, 0, 0.1)",
  },
  caption: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 6,
    fontFamily: "Rubik-Regular",
    lineHeight: 20,
  },
  timeAgo: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 8,
    fontFamily: "Rubik-Regular",
  },
  commentsSection: {
    padding: 16,
    paddingBottom: 32,
  },
  commentsHeader: {
    fontSize: 18,
    color: "#ffffff",
    marginBottom: 16,
    fontFamily: "Rubik-Medium",
  },
  commentItem: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "rgba(255, 215, 0, 0.05)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.1)",
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  commentContent: {
    flex: 1,
  },
  commentUsername: {
    fontSize: 14,
    color: "#ffffff",
    marginBottom: 4,
    fontFamily: "Rubik-Medium",
  },
  commentText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontFamily: "Rubik-Regular",
    lineHeight: 20,
  },
  commentTime: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 4,
    fontFamily: "Rubik-Regular",
  },
  commentInput: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 215, 0, 0.1)",
    alignItems: "center",
    backgroundColor: "rgba(18, 18, 18, 0.9)",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 120,
    color: "#ffffff",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    fontSize: 14,
    fontFamily: "Rubik-Regular",
  },
  postButton: {
    backgroundColor: "rgba(255, 215, 0, 0.3)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.4)",
  },
  disabledButton: {
    opacity: 0.5,
  },
  postButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Rubik-Medium",
  },
});

export default PostDetailScreen;
