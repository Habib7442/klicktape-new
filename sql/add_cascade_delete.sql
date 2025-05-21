-- Add CASCADE DELETE to foreign key constraints
-- This script modifies existing foreign key constraints to enable automatic deletion of related records

-- First, let's identify all foreign keys that reference user IDs
DO $$
DECLARE
    fk_record RECORD;
BEGIN
    -- Drop and recreate foreign keys with CASCADE DELETE for profiles table
    ALTER TABLE IF EXISTS public.profiles 
        DROP CONSTRAINT IF EXISTS profiles_id_fkey;
    
    ALTER TABLE IF EXISTS public.profiles
        ADD CONSTRAINT profiles_id_fkey
        FOREIGN KEY (id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    
    -- Drop and recreate foreign keys with CASCADE DELETE for public_keys table
    ALTER TABLE IF EXISTS public.public_keys 
        DROP CONSTRAINT IF EXISTS public_keys_user_id_fkey;
    
    ALTER TABLE IF EXISTS public.public_keys
        ADD CONSTRAINT public_keys_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    
    -- Drop and recreate foreign keys with CASCADE DELETE for posts table
    ALTER TABLE IF EXISTS public.posts 
        DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
    
    ALTER TABLE IF EXISTS public.posts
        ADD CONSTRAINT posts_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    
    -- Drop and recreate foreign keys with CASCADE DELETE for likes table
    ALTER TABLE IF EXISTS public.likes 
        DROP CONSTRAINT IF EXISTS likes_user_id_fkey;
    
    ALTER TABLE IF EXISTS public.likes
        ADD CONSTRAINT likes_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    
    -- Drop and recreate foreign keys with CASCADE DELETE for comments table
    ALTER TABLE IF EXISTS public.comments 
        DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
    
    ALTER TABLE IF EXISTS public.comments
        ADD CONSTRAINT comments_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    
    -- Drop and recreate foreign keys with CASCADE DELETE for follows table
    ALTER TABLE IF EXISTS public.follows 
        DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;
    
    ALTER TABLE IF EXISTS public.follows
        ADD CONSTRAINT follows_follower_id_fkey
        FOREIGN KEY (follower_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    
    ALTER TABLE IF EXISTS public.follows 
        DROP CONSTRAINT IF EXISTS follows_following_id_fkey;
    
    ALTER TABLE IF EXISTS public.follows
        ADD CONSTRAINT follows_following_id_fkey
        FOREIGN KEY (following_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    
    -- Drop and recreate foreign keys with CASCADE DELETE for messages table
    ALTER TABLE IF EXISTS public.messages 
        DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
    
    ALTER TABLE IF EXISTS public.messages
        ADD CONSTRAINT messages_sender_id_fkey
        FOREIGN KEY (sender_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    
    ALTER TABLE IF EXISTS public.messages 
        DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;
    
    ALTER TABLE IF EXISTS public.messages
        ADD CONSTRAINT messages_receiver_id_fkey
        FOREIGN KEY (receiver_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    
    -- Drop and recreate foreign keys with CASCADE DELETE for notifications table
    ALTER TABLE IF EXISTS public.notifications 
        DROP CONSTRAINT IF EXISTS notifications_sender_id_fkey;
    
    ALTER TABLE IF EXISTS public.notifications
        ADD CONSTRAINT notifications_sender_id_fkey
        FOREIGN KEY (sender_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    
    ALTER TABLE IF EXISTS public.notifications 
        DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;
    
    ALTER TABLE IF EXISTS public.notifications
        ADD CONSTRAINT notifications_recipient_id_fkey
        FOREIGN KEY (recipient_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    
    -- Drop and recreate foreign keys with CASCADE DELETE for reels table
    ALTER TABLE IF EXISTS public.reels 
        DROP CONSTRAINT IF EXISTS reels_user_id_fkey;
    
    ALTER TABLE IF EXISTS public.reels
        ADD CONSTRAINT reels_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    
    -- Drop and recreate foreign keys with CASCADE DELETE for room_participants table
    ALTER TABLE IF EXISTS public.room_participants 
        DROP CONSTRAINT IF EXISTS room_participants_user_id_fkey;
    
    ALTER TABLE IF EXISTS public.room_participants
        ADD CONSTRAINT room_participants_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    
    -- Drop and recreate foreign keys with CASCADE DELETE for bookmarks table
    ALTER TABLE IF EXISTS public.bookmarks 
        DROP CONSTRAINT IF EXISTS bookmarks_user_id_fkey;
    
    ALTER TABLE IF EXISTS public.bookmarks
        ADD CONSTRAINT bookmarks_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
END
$$;
