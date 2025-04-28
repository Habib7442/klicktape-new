import { TouchableOpacityProps } from 'react-native';
import React from 'react';

export interface Comment {
    $id: string;
    content: string;
    userId: string;
    parentCommentId?: string;
    timestamp?: string;
    user: {
      userId: string;
      username: string;
      avatar: string;
    };
    replies?: Comment[];
  }
  
  export interface ReelComment {
    $id: string;
    content: string;
    userId: string;
    parentCommentId?: string;
    timestamp?: string;
    user: {
      userId: string;
      username: string;
      avatar: string;
    };
    replies?: ReelComment[];
  }
  
  export interface Post {
    $id: string;
    imageUrls: string[];
    caption: string;
    userId: string;
    createdAt: string;
    likesCount: number;
    commentsCount: number;
    isLiked?: boolean;
    isBookmarked?: boolean;
    user: {
      username: string;
      avatar: string;
    };
    comments: Comment[];
  }
  // User profile type
  export interface UserProfile {
    id: string;
    email: string;
    username: string;
    gender: "male" | "female" | "other";
    created_at?: string;
  }

  declare interface ButtonProps extends TouchableOpacityProps {
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
    is_liked: boolean; // Added
    user: {
      username: string;
      avatar: string;
    };
  }