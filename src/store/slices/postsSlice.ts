import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  username: string;
  avatar: string;
}

interface Post {
  id: string; // Changed from $id to match Supabase
  image_urls: string[]; // Changed from imageUrls to match Supabase
  caption: string;
  user_id: string; // Changed from userId
  created_at: string; // Changed from createdAt
  likes_count: number; // Changed from likesCount
  comments_count: number; // Changed from commentsCount
  is_liked?: boolean; // Changed from isLiked
  is_bookmarked?: boolean; // Changed from isBookmarked
  user: User;
}

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
      // Initialize liked and bookmarked status from API response
      const newPosts = action.payload.map(post => ({
        ...post,
        likes_count: Math.max(0, post.likes_count),
        is_liked: post.is_liked || state.likedPosts[post.id] || false,
        is_bookmarked: post.is_bookmarked || state.bookmarkedPosts[post.id] || false,
      }));

      // Update the liked/bookmarked state maps
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