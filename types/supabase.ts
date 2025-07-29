export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          email: string | null
          avatar_url: string | null
          bio: string | null
          account_type: string | null
          gender: string | null
          anonymous_room_name: string | null
          created_at: string | null
          updated_at: string | null
          public_key: string | null
          is_active: boolean | null
          name: string | null
        }
        Insert: {
          id: string
          username?: string | null
          email?: string | null
          avatar_url?: string | null
          bio?: string | null
          account_type?: string | null
          gender?: string | null
          anonymous_room_name?: string | null
          created_at?: string | null
          updated_at?: string | null
          public_key?: string | null
          is_active?: boolean | null
          name?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          email?: string | null
          avatar_url?: string | null
          bio?: string | null
          account_type?: string | null
          gender?: string | null
          anonymous_room_name?: string | null
          created_at?: string | null
          updated_at?: string | null
          public_key?: string | null
          is_active?: boolean | null
          name?: string | null
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          caption: string | null
          image_urls: string[]
          created_at: string
          likes_count: number
          comments_count: number
          bookmarks_count: number
          hashtags: string[] | null
          genre: string | null
          tagged_users: string[] | null
          collaborators: string[] | null
        }
        Insert: {
          id?: string
          user_id: string
          caption?: string | null
          image_urls: string[]
          created_at?: string
          likes_count?: number
          comments_count?: number
          bookmarks_count?: number
          hashtags?: string[] | null
          genre?: string | null
          tagged_users?: string[] | null
          collaborators?: string[] | null
        }
        Update: {
          id?: string
          user_id?: string
          caption?: string | null
          image_urls?: string[]
          created_at?: string
          likes_count?: number
          comments_count?: number
          bookmarks_count?: number
          hashtags?: string[] | null
          genre?: string | null
          tagged_users?: string[] | null
          collaborators?: string[] | null
        }
      }
      reels: {
        Row: {
          id: string
          user_id: string
          video_url: string
          thumbnail_url: string
          caption: string | null
          music: string | null
          created_at: string
          likes_count: number
          comments_count: number
          views_count: number
          bookmarks_count: number
          hashtags: string[] | null
          genre: string | null
          tagged_users: string[] | null
          collaboration_users: string[] | null
        }
        Insert: {
          id?: string
          user_id: string
          video_url: string
          thumbnail_url: string
          caption?: string | null
          music?: string | null
          created_at?: string
          likes_count?: number
          comments_count?: number
          views_count?: number
          bookmarks_count?: number
          hashtags?: string[] | null
          genre?: string | null
          tagged_users?: string[] | null
          collaboration_users?: string[] | null
        }
        Update: {
          id?: string
          user_id?: string
          video_url?: string
          thumbnail_url?: string
          caption?: string | null
          music?: string | null
          created_at?: string
          likes_count?: number
          comments_count?: number
          views_count?: number
          bookmarks_count?: number
          hashtags?: string[] | null
          genre?: string | null
          tagged_users?: string[] | null
          collaboration_users?: string[] | null
        }
      }
      stories: {
        Row: {
          id: string
          user_id: string
          image_url: string
          caption: string | null
          created_at: string
          expires_at: string
          viewed_by: string[]
          is_active: boolean
          story_order: number
          duration: number
          story_type: string
          music_url: string | null
          thumbnail_url: string | null
        }
        Insert: {
          id?: string
          user_id: string
          image_url: string
          caption?: string | null
          created_at?: string
          expires_at: string
          viewed_by?: string[]
          is_active?: boolean
          story_order?: number
          duration?: number
          story_type?: string
          music_url?: string | null
          thumbnail_url?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          image_url?: string
          caption?: string | null
          created_at?: string
          expires_at?: string
          viewed_by?: string[]
          is_active?: boolean
          story_order?: number
          duration?: number
          story_type?: string
          music_url?: string | null
          thumbnail_url?: string | null
        }
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          content: string
          message_type: string
          is_read: boolean
          status: string
          created_at: string
          updated_at: string
          reply_to_id: string | null
          shared_post_id: string | null
          shared_reel_id: string | null
          reactions: Json | null
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          content: string
          message_type?: string
          is_read?: boolean
          status?: string
          created_at?: string
          updated_at?: string
          reply_to_id?: string | null
          shared_post_id?: string | null
          shared_reel_id?: string | null
          reactions?: Json | null
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          content?: string
          message_type?: string
          is_read?: boolean
          status?: string
          created_at?: string
          updated_at?: string
          reply_to_id?: string | null
          shared_post_id?: string | null
          shared_reel_id?: string | null
          reactions?: Json | null
        }
      }
      likes: {
        Row: {
          id: string
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string
          sender_id: string
          type: string
          content: string | null
          is_read: boolean
          created_at: string
          post_id: string | null
          reel_id: string | null
        }
        Insert: {
          id?: string
          recipient_id: string
          sender_id: string
          type: string
          content?: string | null
          is_read?: boolean
          created_at?: string
          post_id?: string | null
          reel_id?: string | null
        }
        Update: {
          id?: string
          recipient_id?: string
          sender_id?: string
          type?: string
          content?: string | null
          is_read?: boolean
          created_at?: string
          post_id?: string | null
          reel_id?: string | null
        }
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewer_id: string
          view_duration: number
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          story_id: string
          viewer_id: string
          view_duration?: number
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          story_id?: string
          viewer_id?: string
          view_duration?: number
          completed?: boolean
          created_at?: string
        }
      }
      bookmarks: {
        Row: {
          id: string
          user_id: string
          post_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
          created_at?: string | null
        }
      }
      comments: {
        Row: {
          id: string
          user_id: string
          post_id: string
          content: string
          created_at: string | null
          likes_count: number | null
          parent_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          content: string
          created_at?: string | null
          likes_count?: number | null
          parent_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
          content?: string
          created_at?: string | null
          likes_count?: number | null
          parent_id?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_stories_feed_enhanced: {
        Args: { limit_count: number }
        Returns: Array<{
          user_id: string
          username: string
          avatar_url: string | null
          story_count: number
          latest_story_time: string
          has_unviewed: boolean
          stories: Json
        }>
      }
      get_user_stories_enhanced: {
        Args: { target_user_id: string }
        Returns: Array<{
          id: string
          user_id: string
          image_url: string
          caption: string | null
          created_at: string
          expires_at: string
          story_order: number
          duration: number
          story_type: string
          is_viewed: boolean
        }>
      }
      mark_story_viewed: {
        Args: { story_id: string; view_duration?: number }
        Returns: boolean
      }
      cleanup_expired_stories: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_user_followers: {
        Args: { target_user_id: string }
        Returns: Array<{
          id: string
          username: string
          avatar_url: string | null
          is_following: boolean
        }>
      }
      get_user_following: {
        Args: { target_user_id: string }
        Returns: Array<{
          id: string
          username: string
          avatar_url: string | null
          is_following: boolean
        }>
      }
      create_story_enhanced: {
        Args: {
          p_image_url: string
          p_caption?: string
          p_story_type?: string
          p_duration?: number
        }
        Returns: string
      }
    }
    Enums: {
      gender_enum: 'male' | 'female' | 'other'
      account_type: 'personal' | 'creator' | 'business'
    }
  }
}
