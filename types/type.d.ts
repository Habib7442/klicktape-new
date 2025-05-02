import { TouchableOpacityProps } from 'react-native';
import React from 'react';

export interface Comment {
  id: string;
  content: string;
  user_id: string;
  post_id: string;
  parent_comment_id?: string;
  created_at: string;
  likes_count: number;
  user: {
    username: string;
    avatar: string;
  };
  replies?: Comment[];
  mentions?: Array<{
    id: string;
    username: string;
  }>;
}

export interface ReelComment {
  id: string;
  content: string;
  user_id: string;
  reel_id: string;
  parent_comment_id?: string;
  created_at: string;
  likes_count: number;
  user: {
    username: string;
    avatar: string;
  };
  replies?: ReelComment[];
  mentions?: Array<{
    id: string;
    username: string;
  }>;
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
  user: {
    id: string;
    username: string;
    avatar_url: string;
  };
  comments?: Comment[];
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  bio?: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  reels_count: number;
  created_at: string;
  updated_at: string;
}

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  bgVariant?: "primary" | "secondary" | "danger" | "outline" | "success";
  textVariant?: "primary" | "default" | "secondary" | "danger" | "success";
  IconLeft?: React.ComponentType<any>;
  IconRight?: React.ComponentType<any>;
  className?: string;
  onPress?: TouchableOpacityProps['onPress'];
}

export interface Reel {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string;
  caption: string;
  music: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  is_liked: boolean;
  is_bookmarked?: boolean;
  user: {
    id: string;
    username: string;
    avatar_url: string;
  };
  comments?: ReelComment[];
}

export interface Room {
  id: string;
  name: string;
  topic: string;
  creator_id: string;
  created_at: string;
  participants_count: number;
  creator: {
    username: string;
    avatar_url: string;
  };
}

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user: {
    username: string;
    avatar_url: string;
  };
}