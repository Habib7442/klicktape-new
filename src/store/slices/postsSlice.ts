import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Post } from '@/src/types/post';

interface PostsState {
  posts: Post[];
  likedPosts: Record<string, boolean>;
  bookmarkedPosts: Record<string, boolean>;
}

const initialState: PostsState = {
  posts: [],
  likedPosts: {},
  bookmarkedPosts: {},
};

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    setPosts: (state, action: PayloadAction<Post[]>) => {
      // Initialize liked and bookmarked status ONLY from API response
      // Don't use the persisted state to determine if a post is liked
      const newPosts = action.payload.map(post => ({
        ...post,
        likes_count: Math.max(0, post.likes_count),
        // Only use the API response to determine if a post is liked
        is_liked: post.is_liked === true ? true : false,
        is_bookmarked: post.is_bookmarked === true ? true : false,
      }));

      // Reset and update the liked/bookmarked state maps based on API response
      // This ensures we don't carry over likes from previous user sessions
      state.likedPosts = {};
      state.bookmarkedPosts = {};

      newPosts.forEach(post => {
        if (post.is_liked) state.likedPosts[post.id] = true;
        if (post.is_bookmarked) state.bookmarkedPosts[post.id] = true;
      });

      state.posts = newPosts;
    },
    toggleLike: (state, action: PayloadAction<string>) => {
      const postId = action.payload;
      const isLiked = !state.likedPosts[postId];

      state.likedPosts[postId] = isLiked;

      state.posts = state.posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            is_liked: isLiked,
            likes_count: isLiked ? post.likes_count + 1 : Math.max(0, post.likes_count - 1),
          };
        }
        return post;
      });
    },
    toggleBookmark: (state, action: PayloadAction<string>) => {
      const postId = action.payload;
      const isBookmarked = !state.bookmarkedPosts[postId];

      state.bookmarkedPosts[postId] = isBookmarked;

      state.posts = state.posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            is_bookmarked: isBookmarked,
          };
        }
        return post;
      });
    },
    // Optional: Add a clearPosts reducer for cleanup
    clearPosts: (state) => {
      state.posts = [];
      state.likedPosts = {};
      state.bookmarkedPosts = {};
    },
  },
});

export const { setPosts, toggleLike, toggleBookmark, clearPosts } = postsSlice.actions;
export default postsSlice.reducer;