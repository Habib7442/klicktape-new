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
import { router } from "expo-router";

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
  mentions?: Array<{ user_id: string; username: string }>;
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
    const [mentionedUsers, setMentionedUsers] = useState<
      Array<{ id: string; username: string }>
    >([]);
    const [showMentionsList, setShowMentionsList] = useState(false);
    const [filteredUsers, setFilteredUsers] = useState<
      Array<{ id: string; username: string }>
    >([]);
    const mentionInputRef = useRef<TextInput>(null);
    const mentionStartIndex = useRef<number>(-1);
    const subscriptionRef = useRef<any>(null);

    const cacheKey = `${entityType}_comments_${entityId}`;
    const table = entityType === "reel" ? "reel_comments" : "comments";
    const entityTable = entityType === "reel" ? "reels" : "posts";
    const likeTable =
      entityType === "reel" ? "reel_comment_likes" : "comment_likes";

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
        throw new Error(
          `Cannot add comment: ${entityType} with ID ${entityId} does not exist.`
        );
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
        await validateEntityId();
        const mentionData = mentionedUsers.map((user) => ({
          user_id: user.id,
          username: user.username,
        }));

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
            mentions: mentionData,
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

          if (parentError || !parentComment)
            throw new Error("Parent comment not found");

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

        setMentionedUsers([]);
        setNewComment("");
        setReplyingTo(null);
        setShowMentionsList(false);
      } catch (error) {
        console.error(`Error adding ${entityType} comment:`, error);
        Alert.alert("Error", `Failed to add ${entityType} comment.`);
      } finally {
        setSubmitting(false);
      }
    };

    const handleDeleteComment = async (
      commentId: string,
      parentCommentId: string | null
    ) => {
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

                if (entityError || !entity)
                  throw new Error(`${entityType} not found`);

                await supabase
                  .from(entityTable)
                  .update({
                    comments_count: Math.max(
                      0,
                      (entity.comments_count || 0) - 1
                    ),
                  })
                  .eq("id", entityId);

                if (parentCommentId) {
                  const { data: parentComment, error: parentError } =
                    await supabase
                      .from(table)
                      .select("replies_count")
                      .eq("id", parentCommentId)
                      .single();

                  if (parentError || !parentComment)
                    throw new Error("Parent comment not found");

                  await supabase
                    .from(table)
                    .update({
                      replies_count: Math.max(
                        0,
                        (parentComment.replies_count || 0) - 1
                      ),
                    })
                    .eq("id", parentCommentId);
                }

                let updatedComments = [...comments];
                if (parentCommentId) {
                  updatedComments = updatedComments.map((comment) => {
                    if (comment.id === parentCommentId) {
                      return {
                        ...comment,
                        replies: (comment.replies || []).filter(
                          (reply) => reply.id !== commentId
                        ),
                        replies_count: Math.max(
                          0,
                          (comment.replies_count || 0) - 1
                        ),
                      };
                    }
                    return comment;
                  });
                } else {
                  updatedComments = updatedComments.filter(
                    (comment) => comment.id !== commentId
                  );
                }

                setComments(updatedComments);
                await AsyncStorage.setItem(
                  cacheKey,
                  JSON.stringify(updatedComments)
                );
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
        const { data: existingLike, error: fetchLikeError } = await supabase
          .from(likeTable)
          .select("id")
          .eq("comment_id", commentId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (fetchLikeError) throw fetchLikeError;

        let newLikesCount;
        if (existingLike) {
          const { error: deleteError } = await supabase
            .from(likeTable)
            .delete()
            .eq("id", existingLike.id);
          if (deleteError) throw `Error: ${deleteError.message}`;
          newLikesCount = -1;
        } else {
          const { error: insertError } = await supabase.from(likeTable).insert({
            comment_id: commentId,
            user_id: user.id,
            created_at: new Date().toISOString(),
          });
          if (insertError) throw insertError;
          newLikesCount = 1;
        }

        const { data: commentData, error: fetchCommentError } = await supabase
          .from(table)
          .select("likes_count")
          .eq("id", commentId)
          .single();

        if (fetchCommentError || !commentData)
          throw new Error(`Comment not found`);

        const updatedLikesCount = Math.max(
          0,
          commentData.likes_count + newLikesCount
        );

        const { error: updateError } = await supabase
          .from(table)
          .update({ likes_count: updatedLikesCount })
          .eq("id", commentId);

        if (updateError) throw updateError;

        await fetchComments();
      } catch (error) {
        console.error(`Error liking ${entityType} comment:`, error);
        Alert.alert("Error", `Failed to like ${entityType} comment.`);
      }
    };

    const parseCommentText = (
      text: string,
      mentions: Array<{ user_id: string; username: string }> = []
    ) => {
      const parts: JSX.Element[] = [];
      const mentionRegex = /@(\w+)/g;
      let lastIndex = 0;
      let match;

      while ((match = mentionRegex.exec(text)) !== null) {
        const mentionStart = match.index;
        const mentionEnd = mentionStart + match[0].length;
        const username = match[1];

        // Add text before the mention
        if (mentionStart > lastIndex) {
          parts.push(
            <Text key={`text-${lastIndex}`} style={styles.commentText}>
              {text.slice(lastIndex, mentionStart)}
            </Text>
          );
        }

        // Find the corresponding user_id for the username
        const mentionedUser = mentions.find((m) => m.username === username);
        if (mentionedUser) {
          parts.push(
            <TouchableOpacity
              key={`mention-${mentionStart}`}
              onPress={() => handleMentionClick(mentionedUser.user_id)}
            >
              <Text style={[styles.commentText, styles.mentionText]}>
                {match[0]}
              </Text>
            </TouchableOpacity>
          );
        } else {
          // If no matching user_id, render as plain text
          parts.push(
            <Text key={`text-${mentionStart}`} style={styles.commentText}>
              {match[0]}
            </Text>
          );
        }

        lastIndex = mentionEnd;
      }

      // Add remaining text after the last mention
      if (lastIndex < text.length) {
        parts.push(
          <Text key={`text-${lastIndex}`} style={styles.commentText}>
            {text.slice(lastIndex)}
          </Text>
        );
      }

      return parts;
    };

    const handleMentionClick = (userId: string) => {
      try {
        if (!userId) {
          console.warn('Invalid user ID for mention click');
          return;
        }
        
        router.push({
          pathname: '/userProfile/[id]',
          params: { id: userId }
        });
      } catch (error) {
        console.error('Error navigating to user profile:', error);
      }
    };

    const renderComment = useCallback(
      ({ item: comment }: { item: Comment }) => {
        const avatarUri =
          comment.user.avatar || "https://via.placeholder.com/40";
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
                <View style={styles.commentTextContainer}>
                  {parseCommentText(comment.content, comment.mentions)}
                </View>
                <View style={styles.commentActions}>
                  <TouchableOpacity
                    onPress={() => setReplyingTo(comment)}
                    style={styles.actionButton}
                  >
                    <Text style={styles.actionText}>Reply</Text>
                  </TouchableOpacity>
                  {comment.user_id === user?.id && (
                    <TouchableOpacity
                      onPress={() =>
                        handleDeleteComment(
                          comment.id,
                          comment.parent_comment_id
                        )
                      }
                      style={styles.actionButton}
                    >
                      <Text style={[styles.actionText, styles.deleteText]}>
                        Delete
                      </Text>
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

    const searchUsers = async (query: string) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username")
          .ilike("username", `%${query}%`)
          .limit(5);

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error("Error searching users:", error);
        return [];
      }
    };

    const handleTextChange = async (text: string) => {
      setNewComment(text);

      // Find the last '@' symbol before the current cursor position
      const cursorPosition = text.length; // Assuming cursor is at the end
      const lastAtSymbolIndex = text.lastIndexOf("@", cursorPosition - 1);

      if (lastAtSymbolIndex !== -1) {
        const query = text.slice(lastAtSymbolIndex + 1, cursorPosition);
        // Check if query is valid (no spaces)
        if (!query.includes(" ")) {
          mentionStartIndex.current = lastAtSymbolIndex;
          if (query.length > 0) {
            const users = await searchUsers(query);
            setFilteredUsers(users);
            setShowMentionsList(users.length > 0);
          } else {
            setShowMentionsList(true);
            setFilteredUsers([]);
          }
        } else {
          setShowMentionsList(false);
          mentionStartIndex.current = -1;
        }
      } else {
        setShowMentionsList(false);
        mentionStartIndex.current = -1;
      }
    };

    const handleMentionSelect = (selectedUser: {
      id: string;
      username: string;
    }) => {
      const beforeMention = newComment.slice(0, mentionStartIndex.current);
      const afterMention = newComment.slice(
        mentionStartIndex.current +
          1 +
          (newComment.slice(mentionStartIndex.current + 1).indexOf(" ") === -1
            ? newComment.length - (mentionStartIndex.current + 1)
            : newComment.slice(mentionStartIndex.current + 1).indexOf(" "))
      );

      const updatedComment =
        `${beforeMention}@${selectedUser.username} ${afterMention}`.trim();
      setNewComment(updatedComment);
      setMentionedUsers([...mentionedUsers, selectedUser]);
      setShowMentionsList(false);
      mentionStartIndex.current = -1;

      // Focus the input after selecting a mention
      mentionInputRef.current?.focus();
    };

    const MentionsList = () => (
      <View style={styles.mentionsContainer}>
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={styles.mentionItem}
              onPress={() => handleMentionSelect(user)}
            >
              <Text style={styles.mentionText}>@{user.username}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noMentionsText}>No users found</Text>
        )}
      </View>
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
                <Text style={styles.noCommentsSubtext}>
                  Be the first to comment
                </Text>
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
                  source={{
                    uri: user?.avatar || "https://via.placeholder.com/40",
                  }}
                  style={styles.inputAvatar}
                />
                <TextInput
                  ref={mentionInputRef}
                  style={styles.input}
                  placeholder={
                    replyingTo
                      ? `Reply to @${replyingTo.user.username}...`
                      : `Add a comment for ${
                          entityOwnerUsername || `this ${entityType}`
                        }...`
                  }
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={newComment}
                  onChangeText={handleTextChange}
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
                      color={
                        newComment.trim()
                          ? "#FFD700"
                          : "rgba(255, 255, 255, 0.3)"
                      }
                    />
                  )}
                </TouchableOpacity>
              </View>
              {showMentionsList && <MentionsList />}
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
  commentTextContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  commentText: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 20,
  },
  mentionText: {
    color: "#FFD700",
    fontWeight: "600",
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
  mentionsContainer: {
    position: "absolute",
    bottom: "100%",
    left: 16,
    right: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    maxHeight: 200,
    marginBottom: 8,
    zIndex: 10,
  },
  mentionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  noMentionsText: {
    padding: 12,
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
  },
});

export default CommentsModal;
