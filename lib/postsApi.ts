import { supabase } from "./supabase";
import { Platform } from "react-native";

export const postsAPI = {
  uploadImage: async (file: {
    uri: string;
    name?: string;
    type: string;
    size: number;
  }) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      console.log("Authenticated user:", user.id);

      const fileExt = file.name?.split(".").pop()?.toLowerCase() || "jpg";
      const fileName =
        file.name ||
        `post_${Date.now()}_${Math.floor(Math.random() * 1000000)}.${fileExt}`;
      const filePath = `posts/${fileName}`;

      console.log("Uploading file from URI:", file.uri);

      let normalizedUri = file.uri;
      if (Platform.OS === "android" && !normalizedUri.startsWith("file://")) {
        normalizedUri = `file://${normalizedUri}`;
      }

      const formData = new FormData();
      formData.append("file", {
        uri: normalizedUri,
        name: fileName,
        type: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
      } as any);

      const { error } = await supabase.storage
        .from("media")
        .upload(filePath, formData, {
          contentType: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
          upsert: false,
        });

      if (error) {
        console.error("Storage upload error:", error.message, error);
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      const { data } = supabase.storage.from("media").getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error("Failed to get public URL for uploaded image");
      }

      return { fileId: filePath, url: data.publicUrl };
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  },

  createPost: async (
    imageFiles: { uri: string; name?: string; type: string; size: number }[],
    caption: string,
    userId: string
  ) => {
    try {
      // Check if user has a profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId) // profiles.id stores auth.users.id
        .single();

      if (profileError || !profile) {
        // Create a profile if it doesn't exist
        const username = `user_${Math.random().toString(36).substring(2, 10)}`;
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: userId, // profiles.id = auth.users.id
            username,
            avatar_url: "",
          })
          .select()
          .single();

        if (insertError || !newProfile) {
          throw new Error(`Failed to create user profile: ${insertError?.message}`);
        }
        profile = newProfile;
      }

      // Upload images
      const uploadedFiles = await Promise.all(
        imageFiles.map((file) => postsAPI.uploadImage(file))
      );
      const imageUrls = uploadedFiles.map((file) => file.url);

      // Create post with profiles.id
      const { data, error } = await supabase
        .from("posts")
        .insert({
          user_id: profile.id, // profiles.id (same as auth.users.id)
          image_urls: imageUrls,
          caption,
          created_at: new Date().toISOString(),
          likes_count: 0,
          comments_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      throw new Error(`Failed to create post: ${error.message}`);
    }
  },

  getPosts: async (page = 1, limit = 5) => {
    try {
      const offset = (page - 1) * limit;
      const { data: posts, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          profiles:profiles!posts_user_id_fkey (username, avatar_url)
        `
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error || !posts) return [];

      return posts.map((post) => ({
        ...post,
        user: post.profiles || {
          username: "Unknown User",
          avatar: "https://via.placeholder.com/150",
        },
      }));
    } catch (error) {
      console.error("Error in getPosts:", error);
      return [];
    }
  },

  getPost: async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          profiles:profiles!posts_user_id_fkey (username, avatar_url)
        `
        )
        .eq("id", postId)
        .single();

      if (error) throw error;
      return {
        ...post,
        user: post.profiles || {
          username: "Unknown User",
          avatar: "https://via.placeholder.com/150",
        },
      };
    } catch (error) {
      console.error("Error fetching post:", error);
      throw error;
    }
  },

  toggleLike: async (postId: string, userId: string) => {
    try {
      const { data: user, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId) // profiles.id = auth.users.id
        .single();

      if (userError || !user) throw new Error("User not found");

      const { data: post, error: postError } = await supabase
        .from("posts")
        .select("user_id")
        .eq("id", postId)
        .single();

      if (postError || !post) throw new Error("Post not found");

      const { data: existingLike, error: likeError } = await supabase
        .from("likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("post_id", postId);

      if (likeError) throw likeError;

      if (existingLike && existingLike.length > 0) {
        await supabase.from("likes").delete().eq("id", existingLike[0].id);
        return false;
      } else {
        await supabase.from("likes").insert({
          user_id: user.id,
          post_id: postId,
          created_at: new Date().toISOString(),
        });

        if (post.user_id !== user.id) {
          await supabase.from("notifications").insert({
            receiver_id: post.user_id,
            sender_id: user.id,
            type: "like",
            post_id: postId,
            created_at: new Date().toISOString(),
            is_read: false,
          });
        }

        return true;
      }
    } catch (error: any) {
      throw new Error(`Failed to toggle like: ${error.message}`);
    }
  },

  addComment: async (
    postId: string,
    userId: string,
    content: string,
    parentCommentId: string | null = null
  ) => {
    try {
      const { data: user, error: userError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", userId) // profiles.id = auth.users.id
        .single();

      if (userError || !user) throw new Error("User not found");

      const { data: post, error: postError } = await supabase
        .from("posts")
        .select("id, user_id, comments_count")
        .eq("id", postId)
        .single();

      if (postError || !post) throw new Error("Post not found");

      const { data: comment, error: commentError } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          content,
          parent_comment_id: parentCommentId,
          created_at: new Date().toISOString(),
          replies_count: 0,
        })
        .select()
        .single();

      if (commentError) throw commentError;

      const operations: Promise<any>[] = [];

      operations.push(
        supabase
          .from("posts")
          .update({ comments_count: (post.comments_count || 0) + 1 })
          .eq("id", postId)
      );

      if (parentCommentId) {
        const { data: parentComment, error: parentError } = await supabase
          .from("comments")
          .select("id, user_id, replies_count")
          .eq("id", parentCommentId)
          .single();

        if (parentError || !parentComment)
          throw new Error("Parent comment not found");

        operations.push(
          supabase
            .from("comments")
            .update({ replies_count: (parentComment.replies_count || 0) + 1 })
            .eq("id", parentCommentId)
        );

        if (parentComment.user_id !== user.id) {
          operations.push(
            supabase.from("notifications").insert({
              receiver_id: parentComment.user_id,
              sender_id: user.id,
              type: "comment",
              post_id: postId,
              comment_id: comment.id,
              created_at: new Date().toISOString(),
              is_read: false,
            })
          );
        }
      }

      if (post.user_id !== user.id) {
        operations.push(
          supabase.from("notifications").insert({
            receiver_id: post.user_id,
            sender_id: user.id,
            type: "comment",
            post_id: postId,
            comment_id: comment.id,
            created_at: new Date().toISOString(),
            is_read: false,
          })
        );
      }

      await Promise.all(operations);

      return {
        ...comment,
        user: {
          username: user.username,
          avatar: user.avatar_url,
        },
      };
    } catch (error) {
      console.error("Error adding comment:", error);
      throw error;
    }
  },

  getComments: async (postId: string) => {
    try {
      const { data: comments, error } = await supabase
        .from("comments")
        .select(
          `
          *,
          profiles:profiles!comments_user_id_fkey (username, avatar_url)
        `
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      return comments.map((comment) => ({
        ...comment,
        user: comment.profiles || {
          username: "Unknown User",
          avatar: "https://via.placeholder.com/150",
        },
      }));
    } catch (error) {
      console.error("Error fetching comments:", error);
      throw error;
    }
  },

  deleteComment: async (commentId: string, postId: string) => {
    try {
      const { data: comment, error: commentError } = await supabase
        .from("comments")
        .select("parent_comment_id")
        .eq("id", commentId)
        .single();

      if (commentError || !comment) throw new Error("Comment not found");

      await supabase.from("comments").delete().eq("id", commentId);

      const { data: post, error: postError } = await supabase
        .from("posts")
        .select("comments_count")
        .eq("id", postId)
        .single();

      if (postError || !post) throw new Error("Post not found");

      await supabase
        .from("posts")
        .update({ comments_count: Math.max(0, (post.comments_count || 0) - 1) })
        .eq("id", postId);

      if (comment.parent_comment_id) {
        const { data: parentComment, error: parentError } = await supabase
          .from("comments")
          .select("replies_count")
          .eq("id", comment.parent_comment_id)
          .single();

        if (parentError || !parentComment)
          throw new Error("Parent comment not found");

        await supabase
          .from("comments")
          .update({
            replies_count: Math.max(0, (parentComment.replies_count || 0) - 1),
          })
          .eq("id", comment.parent_comment_id);
      }

      return true;
    } catch (error: any) {
      throw new Error(`Failed to delete comment: ${error.message}`);
    }
  },

  toggleBookmark: async (postId: string, userId: string) => {
    try {
      const { data: user, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId) // profiles.id = auth.users.id
        .single();

      if (userError || !user) throw new Error("User not found");

      const { data: existingBookmark, error: bookmarkError } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("post_id", postId);

      if (bookmarkError) throw bookmarkError;

      if (existingBookmark && existingBookmark.length > 0) {
        await supabase
          .from("bookmarks")
          .delete()
          .eq("id", existingBookmark[0].id);
        return false;
      } else {
        await supabase.from("bookmarks").insert({
          user_id: user.id,
          post_id: postId,
          created_at: new Date().toISOString(),
        });
        return true;
      }
    } catch (error: any) {
      throw new Error(`Failed to toggle bookmark: ${error.message}`);
    }
  },

  getBookmarkedPosts: async (userId: string) => {
    try {
      const { data: user, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId) // profiles.id = auth.users.id
        .single();

      if (userError || !user) throw new Error("User not found");

      const { data: bookmarks, error: bookmarkError } = await supabase
        .from("bookmarks")
        .select("post_id")
        .eq("user_id", user.id);

      if (bookmarkError) throw bookmarkError;

      const postIds = bookmarks.map((bookmark) => bookmark.post_id);
      if (postIds.length === 0) return [];

      const { data: posts, error: postsError } = await supabase
        .from("posts")
        .select(
          `
          *,
          profiles:profiles!posts_user_id_fkey (username, avatar_url)
        `
        )
        .in("id", postIds);

      if (postsError) throw postsError;

      return posts.map((post) => ({
        ...post,
        user: post.profiles || {
          username: "Unknown User",
          avatar: "https://via.placeholder.com/150",
        },
      }));
    } catch (error: any) {
      throw new Error(`Failed to fetch bookmarked posts: ${error.message}`);
    }
  },

  getUserProfile: async (userId: string) => {
    try {
      const { data: user, error: userError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", userId) // profiles.id = auth.users.id
        .single();

      if (userError || !user) throw new Error("User not found");

      const [{ count: followersCount }, { count: followingCount }] =
        await Promise.all([
          supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("following_id", user.id),
          supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("follower_id", user.id),
        ]);

      return {
        ...user,
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
      };
    } catch (error) {
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }
  },

  searchUsers: async (searchTerm: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", `${searchTerm}%`)
        .order("username", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Search users error:", error);
      throw error;
    }
  },

  getUserPosts: async (userId: string) => {
    try {
      const { data: user, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId) // profiles.id = auth.users.id
        .single();

      if (userError || !user) throw new Error("User not found");

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch user posts: ${error.message}`);
    }
  },

  deletePost: async (postId: string) => {
    try {
      const { data: post, error: postError } = await supabase
        .from("posts")
        .select("image_urls")
        .eq("id", postId)
        .single();

      if (postError || !post) throw new Error("Post not found");

      if (post.image_urls && Array.isArray(post.image_urls)) {
        await Promise.all(
          post.image_urls.map(async (imageUrl) => {
            try {
              const filePath = imageUrl.split("/").slice(-2).join("/");
              await supabase.storage.from("media").remove([filePath]);
            } catch (error) {
              console.error(`Failed to delete image ${imageUrl}:`, error);
            }
          })
        );
      }

      await Promise.all([
        supabase.from("likes").delete().eq("post_id", postId),
        supabase.from("comments").delete().eq("post_id", postId),
        supabase.from("bookmarks").delete().eq("post_id", postId),
      ]);

      await supabase.from("posts").delete().eq("id", postId);

      return true;
    } catch (error) {
      console.error("Error in deletePost:", error);
      throw new Error(`Failed to delete post: ${error.message}`);
    }
  },

  toggleFollow: async (targetUserId: string, currentUserId: string) => {
    try {
      const { data: currentUser, error: currentUserError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", currentUserId) // profiles.id = auth.users.id
        .single();

      if (currentUserError || !currentUser)
        throw new Error("Current user not found");

      const { data: targetUser, error: targetUserError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", targetUserId) // profiles.id = auth.users.id
        .single();

      if (targetUserError || !targetUser)
        throw new Error("Target user not found");

      const { data: existingFollow, error: followError } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUser.id)
        .eq("following_id", targetUser.id);

      if (followError) throw followError;

      if (existingFollow && existingFollow.length > 0) {
        await supabase.from("follows").delete().eq("id", existingFollow[0].id);
        return false;
      } else {
        await supabase.from("follows").insert({
          follower_id: currentUser.id,
          following_id: targetUser.id,
          created_at: new Date().toISOString(),
        });

        await supabase.from("notifications").insert({
          receiver_id: targetUser.id,
          sender_id: currentUser.id,
          type: "follow",
          created_at: new Date().toISOString(),
          is_read: false,
        });

        return true;
      }
    } catch (error) {
      console.error("Toggle follow error:", error);
      throw error;
    }
  },

  checkFollowing: async (targetUserId: string, currentUserId: string) => {
    try {
      const { data: currentUser, error: currentUserError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", currentUserId) // profiles.id = auth.users.id
        .single();

      if (currentUserError || !currentUser)
        throw new Error("Current user not found");

      const { data: targetUser, error: targetUserError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", targetUserId) // profiles.id = auth.users.id
        .single();

      if (targetUserError || !targetUser)
        throw new Error("Target user not found");

      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUser.id)
        .eq("following_id", targetUser.id);

      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      console.error("Check following error:", error);
      throw error;
    }
  },

  updateUserProfile: async (userId: string, data: Partial<any>) => {
    try {
      const { data: user, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId) // profiles.id = auth.users.id
        .single();

      if (userError || !user) throw new Error("User not found");

      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key]
      );

      const { data: updatedUser, error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      return updatedUser;
    } catch (error) {
      console.error("Update error:", error);
      throw new Error(
        `Failed to update profile: ${error.message || "Unknown error"}`
      );
    }
  },

  getExplorePosts: async () => {
    try {
      const { data: posts, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          profiles:profiles!posts_user_id_fkey (username, avatar_url)
        `
        )
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;

      const combinedPosts = posts.map((post) => ({
        ...post,
        type: "image",
        user: post.profiles || {
          username: "Unknown User",
          avatar: "https://via.placeholder.com/150",
        },
      }));

      return combinedPosts.sort(() => Math.random() - 0.5);
    } catch (error) {
      console.error("Error fetching explore posts:", error);
      throw error;
    }
  },
};