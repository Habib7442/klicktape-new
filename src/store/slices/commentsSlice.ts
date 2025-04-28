import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Comment {
  $id: string;
  content: string;
  userId: string;
  parentCommentId?: string;
  mentions?: Array<{
    userId: string;
    username: string;
    avatar: string;
  }>;
  user: {
    userId: string;
    username: string;
    avatar: string;
  };
}

interface CommentsState {
  comments: {
    [postId: string]: Comment[];
  };
  lastFetched: {
    [postId: string]: number;
  };
}

const initialState: CommentsState = {
  comments: {},
  lastFetched: {},
};

const commentsSlice = createSlice({
  name: 'comments',
  initialState,
  reducers: {
    setComments: (state, action: PayloadAction<{ postId: string; comments: Comment[] }>) => {
      const { postId, comments } = action.payload;
      state.comments[postId] = comments;
      state.lastFetched[postId] = Date.now();
    },
    addComment: (state, action: PayloadAction<{ postId: string; comment: Comment }>) => {
      const { postId, comment } = action.payload;
      if (!state.comments[postId]) {
        state.comments[postId] = [];
      }
      state.comments[postId].unshift(comment);
    },
    deleteComment: (state, action: PayloadAction<{ postId: string; commentId: string }>) => {
      const { postId, commentId } = action.payload;
      if (state.comments[postId]) {
        state.comments[postId] = state.comments[postId].filter(
          comment => comment.$id !== commentId
        );
      }
    },
  },
});

export const { setComments, addComment, deleteComment } = commentsSlice.actions;
export default commentsSlice.reducer;