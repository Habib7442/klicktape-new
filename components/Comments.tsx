import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import Modal from "react-native-modal";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/src/context/ThemeContext";
import CachedImage from "@/components/CachedImage";

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
  visible: boolean;
}

const CommentsModal: React.FC<CommentsModalProps> = React.memo(
  ({ entityType, entityId, onClose, entityOwnerUsername, visible }) => {
    const { colors, isDarkMode } = useTheme();
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
    // Add like status tracking
    const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
    const [deletingComments, setDeletingComments] = useState<Set<string>>(new Set());
    // Add expanded replies tracking
    const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
    const mentionInputRef = useRef<TextInput>(null);
    const mentionStartIndex = useRef<number>(-1);
    const subscriptionRef = useRef<any>(null);
    const cacheTimestamp = useRef<number>(0);

    const cacheKey = `${entityType}_comments_${entityId}`;
    const table = entityType === "reel" ? "reel_comments" : "comments";
    const entityTable = entityType === "reel" ? "reels" : "posts";
    const likeTable =
      entityType === "reel" ? "reel_comment_likes" : "comment_likes";

    useEffect(() => {
      if (visible && mentionInputRef.current) {
        mentionInputRef.current.focus();
      }
      const getUserFromStorage = async () => {
        try {
          console.log(`👤 Loading user data...`);
          const userData = await AsyncStorage.getItem("user");
          if (userData) {
            const parsedUser = JSON.parse(userData);
            console.log(`👤 Found user in storage:`, parsedUser.id);

            if (!supabase) {
              console.error("❌ Supabase not available for user loading");
              // Set a basic user object so comments can still load
              setUser({
                ...parsedUser,
                username: parsedUser.username || "Unknown",
                avatar: "https://via.placeholder.com/40",
              });
              return;
            }

            let { data: userFromDB, error } = await supabase
              .from("profiles")
              .select("id, username, avatar_url")
              .eq("id", parsedUser.id)
              .single();

            if (error || !userFromDB) {
              console.log(`👤 User not found in DB, creating profile...`);
              const username = `user_${Math.random()
                .toString(36)
                .substring(2, 10)}`;
              const { data: newProfile, error: insertError } = await supabase
                .from("profiles")
                .insert({
                  id: parsedUser.id,
                  username,
                  avatar_url: "",
                })
                .select()
                .single();

              if (insertError || !newProfile) {
                console.error("❌ Failed to create user profile:", insertError?.message);
                // Set a fallback user so comments can still load
                setUser({
                  ...parsedUser,
                  username: username,
                  avatar: "https://via.placeholder.com/40",
                });
                return;
              }
              userFromDB = newProfile;
            }

            const updatedUser = {
              ...parsedUser,
              username: userFromDB?.username || "Unknown",
              avatar: userFromDB?.avatar_url || "https://via.placeholder.com/40",
            };
            console.log(`✅ User loaded successfully:`, {
              username: updatedUser.username,
              avatar: updatedUser.avatar,
              hasAvatar: !!updatedUser.avatar
            });
            setUser(updatedUser);
            await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
          } else {
            console.log(`👤 No user data found in storage`);
          }
        } catch (error) {
          console.error("❌ Error getting user from storage:", error);
          // Don't let user loading errors block the component
        }
      };

      getUserFromStorage();
    }, [visible]);

    useEffect(() => {
      if (entityId && visible) {
        const loadComments = async () => {
          setLoading(true);
          console.log(`🚀 Starting to load comments for ${entityType} ${entityId}`);

          try {
            // Load cached timestamp
            const cachedTimestamp = await AsyncStorage.getItem(`${cacheKey}_timestamp`);
            if (cachedTimestamp) {
              cacheTimestamp.current = parseInt(cachedTimestamp);
            }

            const cachedComments = await AsyncStorage.getItem(cacheKey);
            if (cachedComments) {
              try {
                const parsed = JSON.parse(cachedComments);
                // Handle both old and new cache formats
                const comments = parsed.comments || parsed;
                console.log(`📦 Loaded ${comments.length} comments from cache`);
                setComments(comments);
                // Load like status for cached comments
                await fetchLikeStatus(comments);
              } catch (error) {
                console.error("Error parsing cached comments:", error);
                // Clear corrupted cache
                await AsyncStorage.removeItem(cacheKey);
                await AsyncStorage.removeItem(`${cacheKey}_timestamp`);
              }
            }

            console.log(`🔄 Fetching fresh comments from database`);
            await fetchComments();
            console.log(`✅ Comments loading completed successfully`);
          } catch (error) {
            console.error("Error loading comments from cache:", error);
            try {
              await fetchComments();
            } catch (fetchError) {
              console.error("Error in fallback fetchComments:", fetchError);
              Alert.alert("Error", "Failed to load comments. Please try again.");
            }
          } finally {
            console.log(`🏁 Setting loading to false`);
            setLoading(false);
          }
        };
        loadComments();
        setupSubscription();
      }

      return () => {
        if (subscriptionRef.current) {
          supabase.removeChannel(subscriptionRef.current);
          subscriptionRef.current = null;
        }
      };
    }, [entityId, entityType, visible]);

    // Add function to fetch like status for comments
    const fetchLikeStatus = async (commentsToCheck: Comment[]) => {
      if (!user?.id) {
        console.log("No user ID available for fetching like status");
        return;
      }

      try {
        const allCommentIds: string[] = [];
        const collectCommentIds = (comments: Comment[]) => {
          comments.forEach(comment => {
            allCommentIds.push(comment.id);
            if (comment.replies && comment.replies.length > 0) {
              collectCommentIds(comment.replies);
            }
          });
        };
        collectCommentIds(commentsToCheck);

        if (allCommentIds.length === 0) {
          console.log("No comment IDs to check for likes");
          return;
        }

        console.log(`Fetching like status for user ${user.id} and comments:`, allCommentIds);

        if (!supabase) {
          console.error("Supabase client not available");
          return;
        }

        // Try optimized function first
        const { data: optimizedLikes, error: optimizedError } = await supabase.rpc('get_comment_like_status', {
          entity_type: entityType,
          comment_ids: allCommentIds,
          user_id_param: user.id
        });

        if (optimizedError) {
          console.log("Optimized function failed, using fallback:", optimizedError);
          // Fallback to original query
          const { data: likes, error } = await supabase
            .from(likeTable)
            .select("comment_id")
            .eq("user_id", user.id)
            .in("comment_id", allCommentIds);

          if (error) {
            console.error("Supabase error fetching likes:", error);
            throw error;
          }

          const likedSet = new Set(likes?.map(like => like.comment_id) || []);
          console.log("Setting liked comments (fallback):", Array.from(likedSet));
          setLikedComments(likedSet);
        } else {
          const likedSet = new Set(optimizedLikes?.map((like: any) => like.comment_id as string) || []);
          console.log("Setting liked comments (optimized):", Array.from(likedSet));
          setLikedComments(likedSet);
        }
      } catch (error) {
        console.error("Error fetching like status:", error);
      }
    };

    const fetchComments = async (useCache = true) => {
      try {
        // Check cache first if requested and not too old (5 minutes)
        if (useCache && Date.now() - cacheTimestamp.current < 300000) {
          const cachedComments = await AsyncStorage.getItem(cacheKey);
          if (cachedComments) {
            try {
              const parsed = JSON.parse(cachedComments);
              const comments = parsed.comments || parsed;
              setComments(comments);
              await fetchLikeStatus(comments);
              return;
            } catch (parseError) {
              console.error("Error parsing cached comments:", parseError);
              // Clear corrupted cache
              await AsyncStorage.removeItem(cacheKey);
              await AsyncStorage.removeItem(`${cacheKey}_timestamp`);
            }
          }
        }

        if (!supabase) {
          console.error("❌ Supabase client not available");
          Alert.alert("Error", "Database connection not available");
          return;
        }

        // Test basic connection
        try {
          console.log(`🔗 Testing database connection...`);
          const { error: testError } = await supabase
            .from('posts')
            .select('id')
            .limit(1);

          if (testError) {
            console.error("❌ Database connection test failed:", testError);
            throw new Error(`Database connection failed: ${testError.message}`);
          }
          console.log(`✅ Database connection test successful`);
        } catch (connectionError) {
          console.error("❌ Connection test error:", connectionError);
          Alert.alert("Connection Error", "Unable to connect to database. Please check your internet connection.");
          return;
        }

        console.log(`🔍 Fetching comments for ${entityType} ${entityId}`);

        // Use optimized function for better performance
        console.log(`📡 Calling get_comments_optimized with:`, { entity_type: entityType, entity_id: entityId });
        const { data, error } = await supabase.rpc('get_comments_optimized', {
          entity_type: entityType,
          entity_id: entityId
        });

        console.log(`📊 Optimized function result:`, { data: data?.length || 0, error });

        if (error) {
          console.error(
            `Supabase error fetching ${entityType} comments:`,
            error
          );
          // Fallback to original query if function fails
          console.log(`🔄 Using fallback query for ${entityType} comments`);
          const { data: fallbackData, error: fallbackError } = await supabase
            .from(table)
            .select(
              `
              *,
              user:profiles!${
                table === "reel_comments"
                  ? "reel_comments_user_id_fkey"
                  : "comments_user_id_fkey"
              } (username, avatar_url)
            `
            )
            .eq(`${entityType}_id`, entityId)
            .order("created_at", { ascending: true });

          console.log(`📊 Fallback query result:`, { data: fallbackData?.length || 0, error: fallbackError });

          if (fallbackError) throw fallbackError;

          const commentsWithDefaultAvatar = (fallbackData || []).map((comment) => ({
            ...comment,
            user: {
              username: comment.user?.username || "Unknown",
              avatar:
                comment.user?.avatar_url || "https://via.placeholder.com/40",
            },
          }));

          const nestedComments = nestComments(commentsWithDefaultAvatar);
          setComments(nestedComments);
          await syncCommentCount(nestedComments);
          await fetchLikeStatus(nestedComments);
          return;
        }

        // Transform optimized function result
        console.log(`✅ Processing ${data?.length || 0} comments from optimized function`);
        const commentsWithDefaultAvatar = (data || []).map((comment: any) => ({
          ...comment,
          user: {
            username: comment.username || "Unknown",
            avatar: comment.avatar_url || "https://via.placeholder.com/40",
          },
        }));

        const nestedComments = nestComments(commentsWithDefaultAvatar);
        console.log(`🌳 Nested comments structure:`, { total: nestedComments.length });
        setComments(nestedComments);

        // Sync comment count with actual count
        await syncCommentCount(nestedComments);

        // Update cache with timestamp
        cacheTimestamp.current = Date.now();
        const cacheData = {
          comments: nestedComments,
          timestamp: cacheTimestamp.current,
          version: 1 // For future cache migrations
        };
        await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
        await AsyncStorage.setItem(`${cacheKey}_timestamp`, cacheTimestamp.current.toString());

        // Fetch like status for all comments
        await fetchLikeStatus(nestedComments);
        console.log(`🎉 Successfully loaded and processed ${nestedComments.length} comments`);
      } catch (error) {
        console.error(`❌ Error fetching ${entityType} comments:`, error);
        Alert.alert("Error", `Failed to load ${entityType} comments. Please check your connection and try again.`);
        // Ensure we don't leave the user in a loading state
        setComments([]);
      }
    };

    const nestComments = useCallback((comments: Comment[]): Comment[] => {
      if (!comments || comments.length === 0) return [];

      const commentMap: { [key: string]: Comment } = {};
      const nested: Comment[] = [];

      // First pass: create map and initialize replies
      for (const comment of comments) {
        comment.replies = [];
        commentMap[comment.id] = comment;
      }

      // Second pass: build hierarchy
      for (const comment of comments) {
        if (comment.parent_comment_id && commentMap[comment.parent_comment_id]) {
          commentMap[comment.parent_comment_id].replies!.push(comment);
        } else if (!comment.parent_comment_id) {
          nested.push(comment);
        }
      }

      return nested;
    }, []);

    // Function to sync comment count with actual comments
    const syncCommentCount = async (nestedComments: Comment[]) => {
      try {
        if (!supabase) {
          console.error("Supabase client not available for count sync");
          return;
        }

        // Count all comments including replies
        const countAllComments = (comments: Comment[]): number => {
          let count = 0;
          for (const comment of comments) {
            count += 1; // Count the comment itself
            if (comment.replies && comment.replies.length > 0) {
              count += countAllComments(comment.replies); // Count replies recursively
            }
          }
          return count;
        };

        const actualCount = countAllComments(nestedComments);

        // Get current count from database
        const { data: entity, error: entityError } = await supabase
          .from(entityTable)
          .select("comments_count")
          .eq("id", entityId)
          .single();

        if (entityError || !entity) {
          console.error(`Error fetching ${entityType} for count sync:`, entityError);
          return;
        }

        // Update count if it doesn't match
        if (entity.comments_count !== actualCount) {
          console.log(`Syncing comment count: DB has ${entity.comments_count}, actual is ${actualCount}`);

          const { error: updateError } = await supabase
            .from(entityTable)
            .update({ comments_count: actualCount })
            .eq("id", entityId);

          if (updateError) {
            console.error(`Error updating ${entityType} comment count:`, updateError);
          }
        }
      } catch (error) {
        console.error("Error syncing comment count:", error);
      }
    };

    const setupSubscription = () => {
      if (!supabase) {
        console.error("Supabase client not available for subscription");
        return;
      }

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
            await fetchComments();
          }
        )
        .subscribe();
    };

    const validateEntityId = async () => {
      if (!supabase) {
        throw new Error("Supabase client not available");
      }

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
      if (!supabase) {
        Alert.alert("Error", "Database connection not available.");
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

        // Note: Comment count is now automatically updated by database triggers
        // No need to manually update comments_count

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
                // Add to deleting set for immediate UI feedback
                setDeletingComments(prev => new Set([...prev, commentId]));

                // Optimistic UI update - remove comment immediately
                const removeCommentFromTree = (comments: Comment[]): Comment[] => {
                  return comments.reduce((acc: Comment[], comment) => {
                    if (comment.id === commentId) {
                      // Skip this comment (delete it)
                      return acc;
                    }

                    if (comment.replies && comment.replies.length > 0) {
                      const updatedReplies = removeCommentFromTree(comment.replies);
                      const wasReplyDeleted = comment.replies.length !== updatedReplies.length;

                      return [...acc, {
                        ...comment,
                        replies: updatedReplies,
                        replies_count: wasReplyDeleted ? Math.max(0, (comment.replies_count || 0) - 1) : comment.replies_count
                      }];
                    }

                    return [...acc, comment];
                  }, []);
                };

                const optimisticComments = removeCommentFromTree(comments);
                setComments(optimisticComments);

                // Update cache immediately
                await AsyncStorage.setItem(cacheKey, JSON.stringify(optimisticComments));

                const { error: deleteError } = await supabase
                  .from(table)
                  .delete()
                  .eq("id", commentId)
                  .eq("user_id", user.id);

                if (deleteError) throw deleteError;

                // Note: Comment count is now automatically updated by database triggers
                // No need to manually update comments_count

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

                // Remove from deleting set
                setDeletingComments(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(commentId);
                  return newSet;
                });

                // Final cache update
                await AsyncStorage.setItem(
                  cacheKey,
                  JSON.stringify(updatedComments)
                );
              } catch (error) {
                console.error(`Error deleting ${entityType} comment:`, error);
                Alert.alert("Error", `Failed to delete ${entityType} comment.`);

                // Remove from deleting set and revert optimistic update
                setDeletingComments(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(commentId);
                  return newSet;
                });

                // Refresh from server to revert changes
                await fetchComments(false);
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
      if (!supabase) {
        Alert.alert("Error", "Database connection not available.");
        return;
      }

      try {
        const isCurrentlyLiked = likedComments.has(commentId);
        console.log(`Toggling like for comment ${commentId}, currently liked: ${isCurrentlyLiked}`);

        // Optimistic UI update
        const newLikedComments = new Set(likedComments);
        if (isCurrentlyLiked) {
          newLikedComments.delete(commentId);
        } else {
          newLikedComments.add(commentId);
        }
        setLikedComments(newLikedComments);

        // Update comments state optimistically
        const updateCommentsLikeCount = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                likes_count: Math.max(0, comment.likes_count + (isCurrentlyLiked ? -1 : 1))
              };
            }
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: updateCommentsLikeCount(comment.replies)
              };
            }
            return comment;
          });
        };

        const updatedComments = updateCommentsLikeCount(comments);
        setComments(updatedComments);

        // Update cache immediately with new structure
        const cacheData = {
          comments: updatedComments,
          timestamp: Date.now(),
          version: 1
        };
        await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));

        const { data: existingLike, error: fetchLikeError } = await supabase
          .from(likeTable)
          .select("id")
          .eq("comment_id", commentId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (fetchLikeError) throw fetchLikeError;

        if (existingLike) {
          console.log(`Removing existing like for comment ${commentId}`);
          const { error: deleteError } = await supabase
            .from(likeTable)
            .delete()
            .eq("id", existingLike.id);
          if (deleteError) throw deleteError;
        } else {
          console.log(`Adding new like for comment ${commentId}`);
          const { error: insertError } = await supabase.from(likeTable).insert({
            comment_id: commentId,
            user_id: user.id,
            created_at: new Date().toISOString(),
          });
          if (insertError) throw insertError;
        }

        console.log(`Successfully updated like status for comment ${commentId}`);

        // Note: Like count is now automatically updated by database triggers
        // No need to refresh comments since we already updated optimistically
      } catch (error) {
        console.error(`Error liking ${entityType} comment:`, error);
        Alert.alert("Error", `Failed to like ${entityType} comment.`);

        // Revert optimistic update on error
        const revertedLikedComments = new Set(likedComments);
        if (isCurrentlyLiked) {
          revertedLikedComments.add(commentId);
        } else {
          revertedLikedComments.delete(commentId);
        }
        setLikedComments(revertedLikedComments);

        // Revert comment count
        const revertCommentsLikeCount = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                likes_count: Math.max(0, comment.likes_count + (isCurrentlyLiked ? 1 : -1))
              };
            }
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: revertCommentsLikeCount(comment.replies)
              };
            }
            return comment;
          });
        };
        setComments(revertCommentsLikeCount(comments));
      }
    };

    const toggleRepliesExpansion = (commentId: string) => {
      setExpandedReplies(prev => {
        const newSet = new Set(prev);
        if (newSet.has(commentId)) {
          newSet.delete(commentId);
        } else {
          newSet.add(commentId);
        }
        return newSet;
      });
    };

    const parseCommentText = (
      text: string,
      mentions: Array<{ user_id: string; username: string }> = []
    ) => {
      const parts: React.ReactElement[] = [];
      const mentionRegex = /@(\w+)/g;
      let lastIndex = 0;
      let match;

      while ((match = mentionRegex.exec(text)) !== null) {
        const mentionStart = match.index;
        const mentionEnd = mentionStart + match[0].length;
        const username = match[1];

        if (mentionStart > lastIndex) {
          parts.push(
            <Text
              key={`text-${lastIndex}`}
              style={[styles.commentText, { color: colors.text }]}
            >
              {text.slice(lastIndex, mentionStart)}
            </Text>
          );
        }

        const mentionedUser = mentions.find((m) => m.username === username);
        if (mentionedUser) {
          parts.push(
            <TouchableOpacity
              key={`mention-${mentionStart}`}
              onPress={() => handleMentionClick(mentionedUser.user_id)}
            >
              <Text style={[styles.commentText, { color: colors.primary }]}>
                {match[0]}
              </Text>
            </TouchableOpacity>
          );
        } else {
          parts.push(
            <Text
              key={`text-${mentionStart}`}
              style={[styles.commentText, { color: colors.text }]}
            >
              {match[0]}
            </Text>
          );
        }

        lastIndex = mentionEnd;
      }

      if (lastIndex < text.length) {
        parts.push(
          <Text
            key={`text-${lastIndex}`}
            style={[styles.commentText, { color: colors.text }]}
          >
            {text.slice(lastIndex)}
          </Text>
        );
      }

      return parts;
    };

    const handleMentionClick = (userId: string) => {
      try {
        if (!userId) {
          console.warn("Invalid user ID for mention click");
          return;
        }
      } catch (error) {
        console.error("Error navigating to user profile:", error);
      }
    };

    const renderComment = useCallback(
      ({ item: comment }: { item: Comment }) => {
        const timeAgo = getTimeAgo(comment.created_at);
        const avatarUri =
          comment.user.avatar || "https://via.placeholder.com/40";
        const isLikedByUser = likedComments.has(comment.id);
        const isDeleting = deletingComments.has(comment.id);

        return (
          <View
            style={[
              styles.commentContainer,
              comment.parent_comment_id && {
                ...styles.replyContainer,
                borderLeftColor: colors.border,
              },
              isDeleting && { opacity: 0.5 },
            ]}
          >
            <View style={styles.commentRow}>
              <TouchableOpacity
                onPress={() => handleMentionClick(comment.user_id)}
              >
                <CachedImage
                  uri={avatarUri}
                  style={styles.avatar}
                  fallbackUri="https://via.placeholder.com/40"
                />
              </TouchableOpacity>
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <TouchableOpacity
                    onPress={() => handleMentionClick(comment.user_id)}
                  >
                    <Text style={[styles.username, { color: colors.text }]}>
                      {comment.user.username}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.time, { color: colors.textSecondary }]}>
                    {timeAgo}
                  </Text>
                </View>
                <Text style={[styles.commentText, { color: colors.text }]}>
                  {parseCommentText(comment.content, comment.mentions)}
                </Text>
                <View style={styles.commentActions}>
                  <TouchableOpacity
                    onPress={() => handleLikeComment(comment.id)}
                    style={styles.actionButton}
                  >
                    <AntDesign
                      name={isLikedByUser ? "heart" : "hearto"}
                      size={16}
                      color={isLikedByUser ? "#FF3040" : colors.textSecondary}
                    />
                    {comment.likes_count > 0 && (
                      <Text
                        style={[
                          styles.likeCount,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {comment.likes_count}
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setReplyingTo(comment)}
                    style={styles.actionButton}
                  >
                    <Text
                      style={[
                        styles.actionText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Reply
                    </Text>
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
                      <Text
                        style={[styles.actionText, { color: colors.error }]}
                      >
                        Delete
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
            {comment.replies && comment.replies.length > 0 && (
              <View style={styles.repliesSection}>
                {!expandedReplies.has(comment.id) ? (
                  <TouchableOpacity
                    onPress={() => toggleRepliesExpansion(comment.id)}
                    style={styles.viewRepliesButton}
                  >
                    <View style={[styles.replyLine, { backgroundColor: colors.border }]} />
                    <Text style={[styles.viewRepliesText, { color: colors.textSecondary }]}>
                      View all {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View>
                    <TouchableOpacity
                      onPress={() => toggleRepliesExpansion(comment.id)}
                      style={styles.hideRepliesButton}
                    >
                      <View style={[styles.replyLine, { backgroundColor: colors.border }]} />
                      <Text style={[styles.hideRepliesText, { color: colors.textSecondary }]}>
                        Hide replies
                      </Text>
                    </TouchableOpacity>
                    <FlatList
                      data={comment.replies}
                      renderItem={renderComment}
                      keyExtractor={(item) => item.id}
                      style={styles.repliesList}
                      showsVerticalScrollIndicator={false}
                    />
                  </View>
                )}
              </View>
            )}
          </View>
        );
      },
      [
        user,
        comments,
        entityType,
        handleLikeComment,
        handleDeleteComment,
        colors,
        likedComments,
        deletingComments,
      ]
    );

    const searchUsers = async (query: string) => {
      try {
        if (!supabase) {
          console.error("Supabase client not available for user search");
          return [];
        }

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

      const cursorPosition = text.length;
      const lastAtSymbolIndex = text.lastIndexOf("@", cursorPosition - 1);

      if (lastAtSymbolIndex !== -1) {
        const query = text.slice(lastAtSymbolIndex + 1, cursorPosition);
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

      mentionInputRef.current?.focus();
    };

    const MentionsList = () => (
      <View
        style={[
          styles.mentionsContainer,
          {
            backgroundColor: colors.background,
            borderColor: isDarkMode
              ? "rgba(255, 255, 255, 0.2)"
              : "rgba(0, 0, 0, 0.2)",
          },
        ]}
      >
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={[
                styles.mentionItem,
                { borderBottomColor: `${colors.primary}10` },
              ]}
              onPress={() => handleMentionSelect(user)}
            >
              <Text style={[styles.mentionText, { color: colors.primary }]}>
                @{user.username}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text
            style={[styles.noMentionsText, { color: colors.textSecondary }]}
          >
            No users found
          </Text>
        )}
      </View>
    );

    const getTimeAgo = (dateString: string) => {
      const now = new Date();
      const commentDate = new Date(dateString);
      const diffMs = now.getTime() - commentDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffDays > 0) return `${diffDays}d`;
      if (diffHours > 0) return `${diffHours}h`;
      if (diffMins > 0) return `${diffMins}m`;
      return "just now";
    };

    // Debug logging for render
    console.log(`🎨 Comments modal rendering:`, {
      visible,
      entityType,
      entityId,
      loading,
      commentsCount: comments.length,
      userLoaded: !!user,
      userAvatar: user?.avatar
    });

    return (
      <SafeAreaView style={styles.modalContainer}>
        <Modal
          isVisible={visible}
          style={styles.modal}
          animationIn="slideInUp"
          animationOut="slideOutDown"
          backdropOpacity={0.5}
          onBackButtonPress={onClose}
          onBackdropPress={onClose}
          avoidKeyboard={true}
        >
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: `${colors.primary}20` }]}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <AntDesign name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text
                style={[styles.modalTitle, { color: colors.text }]}
                className="font-rubik-bold"
              >
                Comments
              </Text>
              <View style={{ width: 24 }} />
            </View>
          <View style={styles.contentContainer}>
            <View style={styles.commentsContainer}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text
                    style={[styles.loadingText, { color: colors.text }]}
                    className="font-rubik-medium"
                  >
                    Loading comments...
                  </Text>
                </View>
              ) : comments.length === 0 ? (
                <View style={styles.noCommentsContainer}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={48}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[styles.noCommentsText, { color: colors.text }]}
                    className="font-rubik-medium"
                  >
                    No comments yet
                  </Text>
                  <Text
                    style={[
                      styles.noCommentsSubtext,
                      { color: colors.textSecondary },
                    ]}
                    className="font-rubik-regular"
                  >
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
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: "#000000", borderTopColor: "#333" },
              ]}
            >
              {replyingTo && (
                <View
                  style={[
                    styles.replyingToContainer,
                    { backgroundColor: isDarkMode ? "#222" : "#f0f0f0" },
                  ]}
                >
                  <Text
                    style={[
                      styles.replyingToText,
                      { color: colors.textSecondary },
                    ]}
                    className="font-rubik-medium"
                  >
                    Replying to @{replyingTo.user.username}
                  </Text>
                  <TouchableOpacity onPress={() => setReplyingTo(null)}>
                    <Ionicons
                      name="close"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              )}
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: isDarkMode ? "#222" : "#f0f0f0",
                    borderColor: isDarkMode ? "#333" : "#ddd",
                  },
                ]}
              >
                <CachedImage
                  uri={user?.avatar || "https://via.placeholder.com/40"}
                  style={styles.inputAvatar}
                  fallbackUri="https://via.placeholder.com/40"
                  onError={(error) => {
                    console.log("❌ Avatar image failed to load:", error.nativeEvent.error);
                    console.log("❌ Avatar URI was:", user?.avatar);
                  }}
                  onLoad={() => {
                    console.log("✅ Avatar image loaded successfully:", user?.avatar);
                  }}
                />
                <TextInput
                  ref={mentionInputRef}
                  style={[styles.input, { color: colors.text }]}
                  placeholder={
                    replyingTo
                      ? `Reply to @${replyingTo.user.username}...`
                      : `Add a comment for ${
                          entityOwnerUsername || `this ${entityType}`
                        }...`
                  }
                  placeholderTextColor={colors.textSecondary}
                  value={newComment}
                  onChangeText={handleTextChange}
                  multiline
                  returnKeyType="send"
                  onSubmitEditing={handleAddComment}
                  autoFocus={true}
                />
                <TouchableOpacity
                  onPress={handleAddComment}
                  style={styles.sendButton}
                  disabled={submitting || !newComment.trim()}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons
                      name="send"
                      size={20}
                      color={
                        newComment.trim() ? colors.primary : colors.textTertiary
                      }
                    />
                  )}
                </TouchableOpacity>
              </View>
              {showMentionsList && <MentionsList />}
            </View>
          </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }
);

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  commentsContainer: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 10,
    color: "#999",
  },
  noCommentsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  noCommentsText: {
    fontSize: 16,
    marginTop: 10,
    color: "#fff",
  },
  noCommentsSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 5,
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    paddingBottom: 10,
  },
  commentContainer: {
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  replyContainer: {
    marginLeft: 50,
    marginTop: 5,
    borderBottomWidth: 0,
    paddingLeft: 10,
    borderLeftWidth: 2,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginRight: 5,
  },
  time: {
    fontSize: 12,
    color: "#999",
  },
  commentText: {
    fontSize: 14,
    color: "#fff",
    lineHeight: 18,
    marginBottom: 5,
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  actionButton: {
    marginRight: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  actionText: {
    fontSize: 12,
    color: "#999",
    marginLeft: 5,
  },
  likeCount: {
    fontSize: 12,
    color: "#999",
    marginLeft: 5,
  },
  repliesSection: {
    marginTop: 8,
    marginLeft: 50,
  },
  repliesList: {
    marginTop: 5,
  },
  viewRepliesButton: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
  },
  hideRepliesButton: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
  },
  viewRepliesText: {
    fontSize: 12,
    marginLeft: 8,
  },
  hideRepliesText: {
    fontSize: 12,
    marginLeft: 8,
  },
  replyLine: {
    width: 24,
    height: 1,
  },
  inputContainer: {
    paddingHorizontal: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
  },
  replyingToContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  replyingToText: {
    fontSize: 13,
    color: "#999",
    flex: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#fff",
    paddingVertical: 0,
    paddingHorizontal: 10,
  },
  sendButton: {
    padding: 5,
  },
  mentionsContainer: {
    position: "absolute",
    bottom: "100%",
    left: 10,
    right: 10,
    borderRadius: 10,
    maxHeight: 200,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#222",
  },
  mentionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  mentionText: {
    fontSize: 14,
    color: "#0095f6",
  },
  noMentionsText: {
    padding: 10,
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});

export default CommentsModal;
