import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { reelsAPI } from "@/lib/reelsApi";
import { Reel } from "@/types/type";

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

interface ReelsState {
  reels: Reel[];
  comments: { [entityId: string]: Comment[] };
  likedCommentIds: string[];
  loading: boolean;
  error: string | null;
  offset: number;
  hasMore: boolean;
  lastFetched: number | null;
  likedReelIds: string[];
}

const initialState: ReelsState = {
  reels: [],
  comments: {},
  likedCommentIds: [],
  loading: false,
  error: null,
  offset: 0,
  hasMore: true,
  lastFetched: null,
  likedReelIds: [],
};

export const fetchReels = createAsyncThunk<
  { reels: Reel[]; hasMore: boolean },
  { offset: number; limit: number; forceRefresh: boolean },
  { rejectValue: string }
>("reels/fetchReels", async ({ offset, limit, forceRefresh }, { getState, rejectWithValue }) => {
  try {
    const state = getState() as { reels: ReelsState };
    const isCacheValid =
      !forceRefresh &&
      state.reels.lastFetched &&
      Date.now() - state.reels.lastFetched < 5 * 60 * 1000; // 5 minutes

    if (isCacheValid && offset === 0 && state.reels.reels.length > 0) {
      return { reels: state.reels.reels, hasMore: state.reels.hasMore };
    }

    const reels = await reelsAPI.getReels(limit, offset, state.reels.likedReelIds);
    return { reels, hasMore: reels.length === limit };
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to fetch reels");
  }
});

export const toggleLike = createAsyncThunk<
  { reelId: string; is_liked: boolean; likes_count: number },
  { reelId: string; isLiked: boolean },
  { rejectValue: string }
>("reels/toggleLike", async ({ reelId, isLiked }, { rejectWithValue }) => {
  try {
    // Pass the current state to the API, which will toggle it
    const result = await reelsAPI.toggleReelLike(reelId, isLiked);
    return {
      reelId,
      is_liked: result.is_liked,
      likes_count: result.likes_count,
    };
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to toggle like");
  }
});

export const fetchComments = createAsyncThunk<
  { entityId: string; comments: Comment[] },
  { entityType: "post" | "reel"; entityId: string },
  { rejectValue: string }
>("reels/fetchComments", async ({ entityType, entityId }, { rejectWithValue }) => {
  try {
    const comments = await reelsAPI.getComments(entityType, entityId);
    return { entityId, comments };
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to fetch comments");
  }
});

export const addComment = createAsyncThunk<
  { entityId: string; comment: Comment },
  {
    entityType: "post" | "reel";
    entityId: string;
    content: string;
    parentCommentId: string | null;
    userId: string;
    user: { username: string; avatar: string };
  },
  { rejectValue: string }
>("reels/addComment", async (args, { rejectWithValue }) => {
  try {
    const comment = await reelsAPI.addComment(args);
    return { entityId: args.entityId, comment };
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to add comment");
  }
});

export const deleteComment = createAsyncThunk<
  { entityId: string; commentId: string; parentCommentId: string | null },
  {
    entityType: "post" | "reel";
    entityId: string;
    commentId: string;
    parentCommentId: string | null;
    userId: string;
  },
  { rejectValue: string }
>("reels/deleteComment", async (args, { rejectWithValue }) => {
  try {
    await reelsAPI.deleteComment(args);
    return {
      entityId: args.entityId,
      commentId: args.commentId,
      parentCommentId: args.parentCommentId,
    };
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to delete comment");
  }
});

export const toggleCommentLike = createAsyncThunk<
  { entityId: string; commentId: string; isLiked: boolean; likes_count: number },
  {
    entityType: "post" | "reel";
    entityId: string;
    commentId: string;
    userId: string;
  },
  { rejectValue: string }
>("reels/toggleCommentLike", async ({ entityType, entityId, commentId, userId }, { getState, rejectWithValue }) => {
  try {
    const state = getState() as { reels: ReelsState };
    const isLiked = state.reels.likedCommentIds.includes(commentId);
    const result = await reelsAPI.toggleCommentLike(entityType, commentId, isLiked, userId);
    return { entityId, commentId, isLiked: result.is_liked, likes_count: result.likes_count };
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to toggle comment like");
  }
});

const reelsSlice = createSlice({
  name: "reels",
  initialState,
  reducers: {
    resetReels: (state) => {
      state.reels = [];
      state.offset = 0;
      state.hasMore = true;
      state.lastFetched = null;
      state.error = null;
    },
    setComments: (state, action) => {
      const { entityId, comments } = action.payload;
      state.comments[entityId] = comments;
    },
    // Add a new reducer for optimistic updates
    optimisticToggleLike: (state, action) => {
      const { reelId, is_liked, likes_count } = action.payload;
      const reel = state.reels.find((r) => r.id === reelId);
      if (reel) {
        // Update the reel with the optimistic values
        reel.is_liked = is_liked;
        reel.likes_count = likes_count;

        // Update the liked reels array
        if (is_liked) {
          if (!state.likedReelIds.includes(reelId)) {
            state.likedReelIds.push(reelId);
          }
        } else {
          state.likedReelIds = state.likedReelIds.filter((id) => id !== reelId);
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReels.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReels.fulfilled, (state, action) => {
        state.loading = false;
        const validReels = action.payload.reels.filter(
          (reel) => reel.id && typeof reel.id === "string" && reel.id !== "undefined"
        );
        if (validReels.length < action.payload.reels.length) {
          console.warn(
            "Filtered out invalid reels:",
            action.payload.reels.filter((reel) => !reel.id || typeof reel.id !== "string")
          );
        }
        const existingIds = new Set(state.reels.map((reel) => reel.id));
        const newReels = validReels.filter((reel) => !existingIds.has(reel.id));
        state.reels = state.offset === 0 ? newReels : [...state.reels, ...newReels];
        state.offset += newReels.length;
        state.hasMore = action.payload.hasMore;
        state.lastFetched = Date.now();
      })
      .addCase(fetchReels.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch reels";
      })
      .addCase(toggleLike.pending, (state) => {
        state.error = null;
      })
      .addCase(toggleLike.fulfilled, (state, action) => {
        // We don't need to update the UI state here since we're using optimistic updates
        // The API response is just a confirmation that the operation succeeded
        // If we update the state here, it might cause flickering if the API response
        // comes back quickly after the optimistic update

        // However, we should still update the likedReelIds array for consistency
        const { reelId, is_liked } = action.payload;

        // Update the liked reels array
        if (is_liked) {
          if (!state.likedReelIds.includes(reelId)) {
            state.likedReelIds.push(reelId);
          }
        } else {
          state.likedReelIds = state.likedReelIds.filter((id) => id !== reelId);
        }
      })
      .addCase(toggleLike.rejected, (state, action) => {
        state.error = action.payload || "Failed to toggle like";
      })
      .addCase(fetchComments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.loading = false;
        state.comments[action.payload.entityId] = action.payload.comments;
      })
      .addCase(fetchComments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch comments";
      })
      .addCase(addComment.fulfilled, (state, action) => {
        const { entityId, comment } = action.payload;
        const comments = state.comments[entityId] || [];
        if (comment.parent_comment_id) {
          state.comments[entityId] = comments.map((c) =>
            c.id === comment.parent_comment_id
              ? {
                  ...c,
                  replies: [...(c.replies || []), comment],
                  replies_count: (c.replies_count || 0) + 1,
                }
              : c
          );
        } else {
          state.comments[entityId] = [...comments, comment];
        }
        const reel = state.reels.find((r) => r.id === entityId);
        if (reel) {
          reel.comments_count = (reel.comments_count || 0) + 1;
        }
      })
      .addCase(addComment.rejected, (state, action) => {
        state.error = action.payload || "Failed to add comment";
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        const { entityId, commentId, parentCommentId } = action.payload;
        const comments = state.comments[entityId] || [];
        if (parentCommentId) {
          state.comments[entityId] = comments.map((c) =>
            c.id === parentCommentId
              ? {
                  ...c,
                  replies: (c.replies || []).filter((r) => r.id !== commentId),
                  replies_count: Math.max(0, (c.replies_count || 0) - 1),
                }
              : c
          );
        } else {
          state.comments[entityId] = comments.filter((c) => c.id !== commentId);
        }
        const reel = state.reels.find((r) => r.id === entityId);
        if (reel) {
          reel.comments_count = Math.max(0, (reel.comments_count || 0) - 1);
        }
      })
      .addCase(deleteComment.rejected, (state, action) => {
        state.error = action.payload || "Failed to delete comment";
      })
      .addCase(toggleCommentLike.fulfilled, (state, action) => {
        const { entityId, commentId, isLiked, likes_count } = action.payload;
        const comments = state.comments[entityId] || [];
        state.comments[entityId] = comments.map((comment) => {
          if (comment.id === commentId) {
            return { ...comment, likes_count };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map((reply) =>
                reply.id === commentId ? { ...reply, likes_count } : reply
              ),
            };
          }
          return comment;
        });
        if (isLiked) {
          state.likedCommentIds = state.likedCommentIds.filter((id) => id !== commentId);
        } else {
          if (!state.likedCommentIds.includes(commentId)) {
            state.likedCommentIds.push(commentId);
          }
        }
      })
      .addCase(toggleCommentLike.rejected, (state, action) => {
        state.error = action.payload || "Failed to toggle comment like";
      });
  },
});

export const { resetReels, setComments, optimisticToggleLike } = reelsSlice.actions;

export const selectReels = (state: { reels: ReelsState }) => state.reels.reels;
export const selectLoading = (state: { reels: ReelsState }) => state.reels.loading;
export const selectHasMore = (state: { reels: ReelsState }) => state.reels.hasMore;
export const selectLikedReelIds = (state: { reels: ReelsState }) => state.reels.likedReelIds;
export const selectComments = (state: { reels: ReelsState }) => state.reels.comments;
export const selectLikedCommentIds = (state: { reels: ReelsState }) => state.reels.likedCommentIds;

export default reelsSlice.reducer;