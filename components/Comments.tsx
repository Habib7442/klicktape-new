import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  parent_comment_id: string | null;
  created_at: string;
  likes_count: number;
  replies_count?: number;
  user: {
    username: string;
    avatar: string;
  };
  replies?: Comment[];
}

interface CommentsModalProps {
  entityType: "post" | "reel";
  entityId: string;
  onClose: () => void;
  entityOwnerUsername?: string;
}

const CommentsModal: React.FC<CommentsModalProps> = React.memo(
  ({ entityType, entityId, onClose, entityOwnerUsername }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [user, setUser] = useState<any>(null);
    const subscriptionRef = useRef<any>(null);

    const cacheKey = `${entityType}_comments_${entityId}`;
    const table = entityType === "reel" ? "reel_comments" : "comments";
    const entityTable = entityType === "reel" ? "reels" : "posts";
    const likeTable = entityType === "reel" ? "reel_comment_likes" : "comment_likes";

    useEffect(() => {
      const getUserFromStorage = async () => {
        try {
          const userData = await AsyncStorage.getItem("user");
          if (userData) {
            const parsedUser = JSON.parse(userData);
            const { data: userFromDB, error } = await supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("id", parsedUser.id)
              .single();

            if (error) throw error;

            const updatedUser = {
              ...parsedUser,
              username: userFromDB.username,
              avatar: userFromDB.avatar_url || "https://via.placeholder.com/40",
            };
            setUser(updatedUser);
            await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
          }
        } catch (error) {
          console.error("Error getting user from storage:", error);
        }
      };

      getUserFromStorage();
    }, []);

    useEffect(() => {
      const loadComments = async () => {
        setLoading(true);
        try {
          const cachedComments = await AsyncStorage.getItem(cacheKey);
          if (cachedComments) {
            setComments(JSON.parse(cachedComments));
          }
          await fetchComments();
        } catch (error) {
          console.error("Error loading comments from cache:", error);
          await fetchComments();
        } finally {
          setLoading(false);
        }
      };

      if (entityId) {
        loadComments();
        setupSubscription();
      }

      return () => {
        if (subscriptionRef.current) {
          supabase.removeChannel(subscriptionRef.current);
          subscriptionRef.current = null;
        }
      };
    }, [entityId, entityType]);

    const fetchComments = async () => {
      try {
        const { data, error } = await supabase
          .from(table)
          .select(
            `
            *,
            user:users (username, avatar)
          `
          )
          .eq(`${entityType}_id`, entityId)
          .order("created_at", { ascending: true });

        if (error) throw error;

        console.log(`Fetched ${entityType} comments:`, data);

        const commentsWithDefaultAvatar = data.map((comment) => ({
          ...comment,
          user: {
            username: comment.user?.username || "Unknown",
            avatar: comment.user?.avatar || "https://via.placeholder.com/40",
          },
        }));

        const nestedComments = nestComments(commentsWithDefaultAvatar);
        setComments(nestedComments);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(nestedComments));
      } catch (error) {
        console.error(`Error fetching ${entityType} comments:`, error);
        Alert.alert("Error", `Failed to load ${entityType} comments.`);
      }
    };

    const nestComments = (comments: Comment[]): Comment[] => {
      const commentMap: { [key: string]: Comment } = {};
      const nested: Comment[] = [];

      comments.forEach((comment) => {
        comment.replies = [];
        commentMap[comment.id] = comment;
      });

      comments.forEach((comment) => {
        if (comment.parent_comment_id) {
          const parent = commentMap[comment.parent_comment_id];
          if (parent) {
            parent.replies!.push(comment);
          }
        } else {
          nested.push(comment);
        }
      });

      return nested;
    };

    const setupSubscription = () => {
      subscriptionRef.current = supabase
        .channel(`${table}:${entityId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter: `${entityType}_id=eq.${entityId}`,
          },
          async () => {
            console.log(`Subscription triggered for ${entityType} comments`);
            await fetchComments();
          }
        )
        .subscribe();
    };

    const validateEntityId = async () => {
      const { data, error } = await supabase
        .from(entityTable)
        .select("id")
        .eq("id", entityId)
        .single();

      if (error || !data) {
        console.error(`${entityType} ID validation error:`, entityId, error);
        throw new Error(`Cannot add comment: ${entityType} with ID ${entityId} does not exist.`);
      }
      return true;
    };

    const handleAddComment = async () => {
      if (!newComment.trim()) return;
      if (!user) {
        Alert.alert("Error", "You must be logged in to comment.");
        return;
      }

      setSubmitting(true);
      try {
        const isValidEntity = await validateEntityId();
        if (!isValidEntity) {
          throw new Error(`Cannot add comment: ${entityType} with ID ${entityId} does not exist.`);
        }

        const { data: newCommentData, error: insertError } = await supabase
          .from(table)
          .insert({
            [`${entityType}_id`]: entityId,
            user_id: user.id,
            content: newComment.trim(),
            parent_comment_id: replyingTo ? replyingTo.id : null,
            created_at: new Date().toISOString(),
            likes_count: 0,
            replies_count: 0,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const { data: entity, error: entityError } = await supabase
          .from(entityTable)
          .select("comments_count")
          .eq("id", entityId)
          .single();

        if (entityError || !entity) throw new Error(`${entityType} not found`);

        await supabase
          .from(entityTable)
          .update({ comments_count: (entity.comments_count || 0) + 1 })
          .eq("id", entityId);

        if (replyingTo) {
          const { data: parentComment, error: parentError } = await supabase
            .from(table)
            .select("replies_count")
            .eq("id", replyingTo.id)
            .single();

          if (parentError || !parentComment) throw new Error("Parent comment not found");

          await supabase
            .from(table)
            .update({ replies_count: (parentComment.replies_count || 0) + 1 })
            .eq("id", replyingTo.id);
        }

        const newCommentWithUser: Comment = {
          ...newCommentData,
          user: {
            username: user.username || "Unknown",
            avatar: user.avatar || "https://via.placeholder.com/40",
          },
          replies: [],
        };

        let updatedComments = [...comments];
        if (replyingTo) {
          updatedComments = updatedComments.map((comment) => {
            if (comment.id === replyingTo.id) {
              return {
                ...comment,
                replies: [...(comment.replies || []), newCommentWithUser],
                replies_count: (comment.replies_count || 0) + 1,
              };
            }
            return comment;
          });
        } else {
          updatedComments.push(newCommentWithUser);
        }

        setComments(updatedComments);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(updatedComments));

        setNewComment("");
        setReplyingTo(null);
      } catch (error: any) {
        console.error(`Error adding ${entityType} comment:`, error);
        Alert.alert("Error", error.message || `Failed to add ${entityType} comment.`);
      } finally {
        setSubmitting(false);
      }
    };

    const handleDeleteComment = async (commentId: string, parentCommentId: string | null) => {
      if (!user) {
        Alert.alert("Error", "You must be logged in to delete a comment.");
        return;
      }

      Alert.alert(
        "Delete Comment",
        "Are you sure you want to delete this comment?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                const { error: deleteError } = await supabase
                  .from(table)
                  .delete()
                  .eq("id", commentId)
                  .eq("user_id", user.id);

                if (deleteError) throw deleteError;

                const { data: entity, error: entityError } = await supabase
                  .from(entityTable)
                  .select("comments_count")
                  .eq("id", entityId)
                  .single();

                if (entityError || !entity) throw new Error(`${entityType} not found`);

                await supabase
                  .from(entityTable)
                  .update({ comments_count: Math.max(0, (entity.comments_count || 0) - 1) })
                  .eq("id", entityId);

                if (parentCommentId) {
                  const { data: parentComment, error: parentError } = await supabase
                    .from(table)
                    .select("replies_count")
                    .eq("id", parentCommentId)
                    .single();

                  if (parentError || !parentComment) throw new Error("Parent comment not found");

                  await supabase
                    .from(table)
                    .update({ replies_count: Math.max(0, (parentComment.replies_count || 0) - 1) })
                    .eq("id", parentCommentId);
                }

                let updatedComments = [...comments];
                if (parentCommentId) {
                  updatedComments = updatedComments.map((comment) => {
                    if (comment.id === parentCommentId) {
                      return {
                        ...comment,
                        replies: (comment.replies || []).filter((reply) => reply.id !== commentId),
                        replies_count: Math.max(0, (comment.replies_count || 0) - 1),
                      };
                    }
                    return comment;
                  });
                } else {
                  updatedComments = updatedComments.filter((comment) => comment.id !== commentId);
                }

                setComments(updatedComments);
                await AsyncStorage.setItem(cacheKey, JSON.stringify(updatedComments));
              } catch (error) {
                console.error(`Error deleting ${entityType} comment:`, error);
                Alert.alert("Error", `Failed to delete ${entityType} comment.`);
              }
            },
          },
        ]
      );
    };

    const handleLikeComment = async (commentId: string) => {
      if (!user) {
        Alert.alert("Error", "You must be logged in to like a comment.");
        return;
      }

      try {
        // Step 1: Check if the user has already liked the comment
        const { data: existingLike, error: fetchLikeError } = await supabase
          .from(likeTable)
          .select("id")
          .eq("comment_id", commentId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (fetchLikeError) throw fetchLikeError;

        let newLikesCount;
        if (existingLike) {
          // Unlike action
          const { error: deleteError } = await supabase
            .from(likeTable)
            .delete()
            .eq("id", existingLike.id);
          if (deleteError) throw deleteError;
          newLikesCount = -1; // Decrement likes count
          console.log(`Unliked comment ${commentId} in ${likeTable}`);
        } else {
          // Like action
          const { error: insertError } = await supabase.from(likeTable).insert({
            comment_id: commentId,
            user_id: user.id,
            created_at: new Date().toISOString(),
          });
          if (insertError) throw insertError;
          newLikesCount = 1; // Increment likes count
          console.log(`Liked comment ${commentId} in ${likeTable}`);
        }

        // Step 2: Fetch the current likes_count from the database
        const { data: commentData, error: fetchCommentError } = await supabase
          .from(table)
          .select("likes_count")
          .eq("id", commentId)
          .single();

        if (fetchCommentError || !commentData) throw new Error(`Comment not found: ${fetchCommentError?.message}`);

        const currentLikesCount = commentData.likes_count || 0;
        const updatedLikesCount = Math.max(0, currentLikesCount + newLikesCount);
        console.log(`Current likes_count: ${currentLikesCount}, New likes_count: ${updatedLikesCount}`);

        // Step 3: Update the likes_count in the database
        const { error: updateError } = await supabase
          .from(table)
          .update({ likes_count: updatedLikesCount })
          .eq("id", commentId);

        if (updateError) throw new Error(`Failed to update likes_count: ${updateError.message}`);
        console.log(`Updated likes_count in ${table} to ${updatedLikesCount} for comment ${commentId}`);

        // Step 4: Refresh comments to sync with the database
        await fetchComments();
        console.log(`Refreshed comments after liking/unliking`);
      } catch (error) {
        console.error(`Error liking ${entityType} comment:`, error);
        Alert.alert("Error", `Failed to like ${entityType} comment: ${error.message}`);
      }
    };

    const renderComment = useCallback(
      ({ item: comment }: { item: Comment }) => {
        const avatarUri = comment.user.avatar || "https://via.placeholder.com/40";
        return (
          <View
            style={[
              styles.commentContainer,
              comment.parent_comment_id && styles.replyContainer,
            ]}
          >
            <View style={styles.commentRow}>
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
              <View style={styles.commentContentWrapper}>
                <View style={styles.commentHeader}>
                  <Text style={styles.username}>{comment.user.username}</Text>
                  <Text style={styles.commentTime}>
                    {new Date(comment.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
                <Text style={styles.commentText}>{comment.content}</Text>
                <View style={styles.commentActions}>
                  <TouchableOpacity
                    onPress={() => setReplyingTo(comment)}
                    style={styles.actionButton}
                  >
                    <Text style={styles.actionText}>Reply</Text>
                  </TouchableOpacity>
                  {comment.user_id === user?.id && (
                    <TouchableOpacity
                      onPress={() => handleDeleteComment(comment.id, comment.parent_comment_id)}
                      style={styles.actionButton}
                    >
                      <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleLikeComment(comment.id)}
                style={styles.likeButton}
              >
                <Ionicons
                  name={comment.likes_count > 0 ? "heart" : "heart-outline"}
                  size={18}
                  color={comment.likes_count > 0 ? "#FF3040" : "#FFFFFF"}
                />
                {comment.likes_count > 0 && (
                  <Text style={styles.likeCount}>{comment.likes_count}</Text>
                )}
              </TouchableOpacity>
            </View>
            {comment.replies && comment.replies.length > 0 && (
              <FlatList
                data={comment.replies}
                renderItem={renderComment}
                keyExtractor={(item) => item.id}
                style={styles.repliesList}
              />
            )}
          </View>
        );
      },
      [user, comments, entityType, handleLikeComment, handleDeleteComment]
    );

    return (
      <SafeAreaProvider>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.header}>
              <Text style={styles.headerText}>Comments</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            ) : comments.length === 0 ? (
              <View style={styles.noCommentsContainer}>
                <Text style={styles.noCommentsText}>No comments yet</Text>
                <Text style={styles.noCommentsSubtext}>Be the first to comment</Text>
              </View>
            ) : (
              <FlatList
                data={comments}
                renderItem={renderComment}
                keyExtractor={(item) => item.id}
                style={styles.commentsList}
                contentContainerStyle={styles.commentsListContent}
              />
            )}

            <View style={styles.inputContainer}>
              {replyingTo && (
                <View style={styles.replyingToContainer}>
                  <Text style={styles.replyingToText}>
                    Replying to @{replyingTo.user.username}
                  </Text>
                  <TouchableOpacity onPress={() => setReplyingTo(null)}>
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.inputWrapper}>
                <Image
                  source={{ uri: user?.avatar || "https://via.placeholder.com/40" }}
                  style={styles.inputAvatar}
                />
                <TextInput
                  style={styles.input}
                  placeholder={
                    replyingTo
                      ? `Reply to @${replyingTo.user.username}...`
                      : `Add a comment for ${entityOwnerUsername || `this ${entityType}`}...`
                  }
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  returnKeyType="send"
                  onSubmitEditing={handleAddComment}
                />
                <TouchableOpacity
                  onPress={handleAddComment}
                  style={styles.sendButton}
                  disabled={submitting || !newComment.trim()}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons
                      name="send"
                      size={20}
                      color={newComment.trim() ? "#FFD700" : "rgba(255, 255, 255, 0.3)"}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </SafeAreaProvider>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  headerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noCommentsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  noCommentsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  noCommentsSubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    padding: 16,
    paddingBottom: 120,
  },
  commentContainer: {
    marginBottom: 16,
  },
  replyContainer: {
    marginLeft: 40,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContentWrapper: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  commentText: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: "row",
    marginTop: 8,
  },
  actionButton: {
    marginRight: 16,
  },
  actionText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  deleteText: {
    color: "#FF6B6B",
  },
  likeButton: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    paddingVertical: 4,
  },
  likeCount: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  repliesList: {
    marginTop: 12,
  },
  inputContainer: {
    padding: 16,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#121212",
  },
  replyingToContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    padding: 8,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: 8,
  },
  replyingToText: {
    fontSize: 12,
    color: "#FFD700",
    flex: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    maxHeight: 100,
    paddingVertical: 0,
  },
  sendButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default CommentsModal;