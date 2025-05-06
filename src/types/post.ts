// Shared types for posts and related entities

export interface User {
  username: string;
  avatar_url: string;
}

export interface Post {
  id: string;
  image_urls: string[];
  caption: string;
  user_id: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  user: User;
  // Add any other properties that might be needed
  likes?: Array<{ user_id: string }>;
  bookmarks?: Array<{ user_id: string }>;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: User;
}
