import { supabase } from "./supabase";
import { Reel } from "@/types/type";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

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

export const reelsAPI = {
  getReels: async (limit: number = 10, offset: number = 0, likedReelIds: string[] = []) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // First, get the user's liked reels
      const { data: likedReels } = await supabase
        .from('reel_likes')
        .select('reel_id')
        .eq('user_id', user.id);

      const userLikedReelIds = likedReels?.map(like => like.reel_id) || [];

      // Then fetch the reels with profiles instead of users
      const { data, error } = await supabase
        .from("reels")
        .select(`
          *,
          user:profiles!reels_user_id_fkey (username, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw new Error(`Failed to fetch reels: ${error.message}`);

      const reels = data.map((reel) => ({
        ...reel,
        is_liked: userLikedReelIds.includes(reel.id),
        user: {
          ...reel.user,
          avatar: reel.user?.avatar_url || "https://via.placeholder.com/150"
        }
      })) as Reel[];

      const invalidReels = reels.filter((reel) => !reel.id || typeof reel.id !== "string");
      if (invalidReels.length > 0) {
        console.warn("Invalid reels in getReels:", invalidReels);
      }

      return reels;
    } catch (error: any) {
      console.error("getReels error:", error);
      throw new Error(`Failed to fetch reels: ${error.message}`);
    }
  },

  toggleReelLike: async (reelId: string, isLiked: boolean) => {
    try {
      if (!reelId || typeof reelId !== "string" || reelId === "undefined") {
        console.error("Invalid reelId:", reelId);
        throw new Error("Invalid reel ID");
      }
      console.log("toggleReelLike:", { reelId, isLiked });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Call the RPC function to toggle the like
      const { data, error } = await supabase
        .rpc("toggle_reel_like", {
          p_reel_id: reelId,
          p_user_id: user.id,
          p_is_liked: isLiked,
        });

      if (error) {
        console.error("Error calling toggle_reel_like:", error);
        throw new Error(`Failed to toggle like: ${error.message}`);
      }

      if (!data) {
        console.error("No data returned from toggle_reel_like");
        throw new Error("Failed to toggle like: No data returned");
      }

      console.log("toggle_reel_like result:", data);

      // Return the updated state from the database
      return {
        is_liked: data.is_liked,
        likes_count: data.likes_count
      };
    } catch (error: any) {
      console.error("toggleReelLike error:", error);
      throw new Error(`Failed to toggle like: ${error.message}`);
    }
  },

  getComments: async (entityType: "post" | "reel", entityId: string) => {
    try {
      const table = entityType === "reel" ? "reel_comments" : "comments";
      const cacheKey = `${entityType}_comments_${entityId}`;

      const { data, error } = await supabase
        .from(table)
        .select(`
          *,
          user:profiles!comments_user_id_fkey(username, avatar_url)
        `)
        .eq(`${entityType}_id`, entityId)
        .order("created_at", { ascending: true });

      if (error) throw new Error(`Failed to fetch ${entityType} comments: ${error.message}`);

      const commentsWithDefaultAvatar = data.map((comment) => ({
        ...comment,
        user: {
          username: comment.user?.username || "Unknown",
          avatar: comment.user?.avatar_url || "https://via.placeholder.com/40",
        },
      }));

      const nestedComments = nestComments(commentsWithDefaultAvatar);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(nestedComments));
      return nestedComments;
    } catch (error: any) {
      console.error(`getComments error for ${entityType}:`, error);
      throw new Error(`Failed to fetch ${entityType} comments: ${error.message}`);
    }
  },

  addComment: async ({
    entityType,
    entityId,
    content,
    parentCommentId,
    userId,
    user,
  }: {
    entityType: "post" | "reel";
    entityId: string;
    content: string;
    parentCommentId: string | null;
    userId: string;
    user: { username: string; avatar: string };
  }) => {
    try {
      const table = entityType === "reel" ? "reel_comments" : "comments";
      const entityTable = entityType === "reel" ? "reels" : "posts";
      const cacheKey = `${entityType}_comments_${entityId}`;

      const { data: newCommentData, error: insertError } = await supabase
        .from(table)
        .insert({
          [`${entityType}_id`]: entityId,
          user_id: userId,
          content,
          parent_comment_id: parentCommentId,
          created_at: new Date().toISOString(),
          likes_count: 0,
          replies_count: 0,
        })
        .select()
        .single();

      if (insertError) throw new Error(`Failed to insert ${entityType} comment: ${insertError.message}`);

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

      if (parentCommentId) {
        const { data: parentComment, error: parentError } = await supabase
          .from(table)
          .select("replies_count")
          .eq("id", parentCommentId)
          .single();

        if (parentError || !parentComment) throw new Error("Parent comment not found");

        await supabase
          .from(table)
          .update({ replies_count: (parentComment.replies_count || 0) + 1 })
          .eq("id", parentCommentId);
      }

      const newComment: Comment = {
        ...newCommentData,
        user,
        replies: [],
      };

      const cachedComments = await AsyncStorage.getItem(cacheKey);
      let updatedComments: Comment[] = cachedComments ? JSON.parse(cachedComments) : [];
      if (parentCommentId) {
        updatedComments = updatedComments.map((comment) =>
          comment.id === parentCommentId
            ? {
                ...comment,
                replies: [...(comment.replies || []), newComment],
                replies_count: (comment.replies_count || 0) + 1,
              }
            : comment
        );
      } else {
        updatedComments.push(newComment);
      }
      await AsyncStorage.setItem(cacheKey, JSON.stringify(updatedComments));

      return newComment;
    } catch (error: any) {
      console.error(`addComment error for ${entityType}:`, error);
      throw new Error(`Failed to add ${entityType} comment: ${error.message}`);
    }
  },

  deleteComment: async ({
    entityType,
    entityId,
    commentId,
    parentCommentId,
    userId,
  }: {
    entityType: "post" | "reel";
    entityId: string;
    commentId: string;
    parentCommentId: string | null;
    userId: string;
  }) => {
    try {
      const table = entityType === "reel" ? "reel_comments" : "comments";
      const entityTable = entityType === "reel" ? "reels" : "posts";
      const cacheKey = `${entityType}_comments_${entityId}`;

      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq("id", commentId)
        .eq("user_id", userId);

      if (deleteError) throw new Error(`Failed to delete ${entityType} comment: ${deleteError.message}`);

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

      const cachedComments = await AsyncStorage.getItem(cacheKey);
      let updatedComments: Comment[] = cachedComments ? JSON.parse(cachedComments) : [];
      if (parentCommentId) {
        updatedComments = updatedComments.map((comment) =>
          comment.id === parentCommentId
            ? {
                ...comment,
                replies: (comment.replies || []).filter((reply) => reply.id !== commentId),
                replies_count: Math.max(0, (comment.replies_count || 0) - 1),
              }
            : comment
        );
      } else {
        updatedComments = updatedComments.filter((comment) => comment.id !== commentId);
      }
      await AsyncStorage.setItem(cacheKey, JSON.stringify(updatedComments));
    } catch (error: any) {
      console.error(`deleteComment error for ${entityType}:`, error);
      throw new Error(`Failed to delete ${entityType} comment: ${error.message}`);
    }
  },

  toggleCommentLike: async (
    entityType: "post" | "reel",
    commentId: string,
    isLiked: boolean,
    userId: string
  ) => {
    try {
      if (!commentId || typeof commentId !== "string" || commentId === "undefined") {
        console.error("Invalid commentId:", commentId);
        throw new Error("Invalid comment ID");
      }

      const table = entityType === "reel" ? "reel_comments" : "comments";
      const likeTable = entityType === "reel" ? "reel_comment_likes" : "comment_likes";

      const { data, error } = await supabase.rpc(
        entityType === "reel" ? "toggle_reel_comment_like" : "toggle_comment_like",
        {
          p_comment_id: commentId,
          p_user_id: userId,
          p_is_liked: isLiked,
        }
      );

      if (error) {
        console.error(`Error calling toggle_${entityType}_comment_like:`, error);
        throw new Error(`Failed to toggle ${entityType} comment like: ${error.message}`);
      }

      if (!data) {
        console.error(`No data returned from toggle_${entityType}_comment_like`);
        throw new Error(`Failed to toggle ${entityType} comment like: No data returned`);
      }

      console.log(`toggle_${entityType}_comment_like result:`, data);
      return { is_liked: data.is_liked, likes_count: data.likes_count };
    } catch (error: any) {
      console.error(`toggleCommentLike error for ${entityType}:`, error);
      throw new Error(`Failed to toggle ${entityType} comment like: ${error.message}`);
    }
  },

  uploadFile: async (file: { uri: string; name: string; type: string }) => {
    try {
      let normalizedUri = file.uri;
      if (Platform.OS === 'android' && !file.uri.startsWith('file://')) {
        normalizedUri = `file://${file.uri}`;
      }

      const formData = new FormData();
      formData.append('file', {
        uri: normalizedUri,
        name: file.name,
        type: file.type,
      } as any);

      const { data, error } = await supabase.storage
        .from('media')
        .upload(`reels/${file.name}`, formData, {
          contentType: file.type,
          upsert: true,
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(`reels/${file.name}`);

      return publicUrl;
    } catch (error: any) {
      console.error('uploadFile error:', error);
      throw new Error(`File upload failed: ${error.message}`);
    }
  },

  createReel: async (videoUrl: string, caption: string, music: string, thumbnailUrl: string, userId: string) => {
    try {
      const { data, error } = await supabase
        .from("reels")
        .insert({
          video_url: videoUrl,
          caption,
          music,
          thumbnail_url: thumbnailUrl,
          user_id: userId,
          created_at: new Date().toISOString(),
          comments_count: 0,
          likes_count: 0,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating reel:", error);
        throw new Error(`Failed to create reel: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error("createReel error:", error);
      throw new Error(`Failed to create reel: ${error.message}`);
    }
  },
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