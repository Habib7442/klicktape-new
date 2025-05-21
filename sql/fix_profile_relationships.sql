-- Fix foreign key relationships between tables and profiles
-- This script ensures all user-related foreign keys point to the profiles table

-- Start a transaction to ensure all operations succeed or fail together
BEGIN;

-- 1. Fix notifications table relationships
-- First, check if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        -- Drop existing foreign keys if they exist
        ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_sender_id_fkey;
        ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;

        -- Add new foreign keys pointing to profiles
        ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_sender_id_fkey
        FOREIGN KEY (sender_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_recipient_id_fkey
        FOREIGN KEY (recipient_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Fixed notifications table relationships';
    ELSE
        RAISE NOTICE 'Table notifications does not exist, skipping';
    END IF;
END
$$;

-- 2. Fix reels table relationships
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reels') THEN
        -- Drop existing foreign key if it exists
        ALTER TABLE public.reels DROP CONSTRAINT IF EXISTS reels_user_id_fkey;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.reels
        ADD CONSTRAINT reels_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Fixed reels table relationships';
    ELSE
        RAISE NOTICE 'Table reels does not exist, skipping';
    END IF;
END
$$;

-- 3. Fix posts table relationships
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'posts') THEN
        -- Drop existing foreign keys if they exist
        ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
        ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS fk_posts_user;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.posts
        ADD CONSTRAINT fk_posts_user
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Fixed posts table relationships';
    ELSE
        RAISE NOTICE 'Table posts does not exist, skipping';
    END IF;
END
$$;

-- 4. Fix comments table relationships
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comments') THEN
        -- Drop existing foreign key if it exists
        ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.comments
        ADD CONSTRAINT comments_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Fixed comments table relationships';
    ELSE
        RAISE NOTICE 'Table comments does not exist, skipping';
    END IF;
END
$$;

-- 5. Fix likes table relationships
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'likes') THEN
        -- Drop existing foreign key if it exists
        ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.likes
        ADD CONSTRAINT likes_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Fixed likes table relationships';
    ELSE
        RAISE NOTICE 'Table likes does not exist, skipping';
    END IF;
END
$$;

-- 6. Fix follows table relationships
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'follows') THEN
        -- Drop existing foreign keys if they exist
        ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;
        ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_following_id_fkey;

        -- Add new foreign keys pointing to profiles
        ALTER TABLE public.follows
        ADD CONSTRAINT follows_follower_id_fkey
        FOREIGN KEY (follower_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        ALTER TABLE public.follows
        ADD CONSTRAINT follows_following_id_fkey
        FOREIGN KEY (following_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Fixed follows table relationships';
    ELSE
        RAISE NOTICE 'Table follows does not exist, skipping';
    END IF;
END
$$;

-- 7. Fix bookmarks table relationships
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookmarks') THEN
        -- Drop existing foreign key if it exists
        ALTER TABLE public.bookmarks DROP CONSTRAINT IF EXISTS bookmarks_user_id_fkey;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.bookmarks
        ADD CONSTRAINT bookmarks_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Fixed bookmarks table relationships';
    ELSE
        RAISE NOTICE 'Table bookmarks does not exist, skipping';
    END IF;
END
$$;

-- 8. Fix reel_comments table relationships
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reel_comments') THEN
        -- Drop existing foreign key if it exists
        ALTER TABLE public.reel_comments DROP CONSTRAINT IF EXISTS reel_comments_user_id_fkey;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.reel_comments
        ADD CONSTRAINT reel_comments_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Fixed reel_comments table relationships';
    ELSE
        RAISE NOTICE 'Table reel_comments does not exist, skipping';
    END IF;
END
$$;

-- 9. Fix reel_likes table relationships
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reel_likes') THEN
        -- Drop existing foreign key if it exists
        ALTER TABLE public.reel_likes DROP CONSTRAINT IF EXISTS reel_likes_user_id_fkey;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.reel_likes
        ADD CONSTRAINT reel_likes_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Fixed reel_likes table relationships';
    ELSE
        RAISE NOTICE 'Table reel_likes does not exist, skipping';
    END IF;
END
$$;

-- 10. Fix comment_likes table relationships
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comment_likes') THEN
        -- Drop existing foreign key if it exists
        ALTER TABLE public.comment_likes DROP CONSTRAINT IF EXISTS comment_likes_user_id_fkey;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.comment_likes
        ADD CONSTRAINT comment_likes_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Fixed comment_likes table relationships';
    ELSE
        RAISE NOTICE 'Table comment_likes does not exist, skipping';
    END IF;
END
$$;

-- 11. Fix reel_comment_likes table relationships
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reel_comment_likes') THEN
        -- Drop existing foreign key if it exists
        ALTER TABLE public.reel_comment_likes DROP CONSTRAINT IF EXISTS reel_comment_likes_user_id_fkey;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.reel_comment_likes
        ADD CONSTRAINT reel_comment_likes_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Fixed reel_comment_likes table relationships';
    ELSE
        RAISE NOTICE 'Table reel_comment_likes does not exist, skipping';
    END IF;
END
$$;

-- 12. Fix messages table relationships
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
        -- Drop existing foreign keys if they exist
        ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
        ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;

        -- Add new foreign keys pointing to profiles
        ALTER TABLE public.messages
        ADD CONSTRAINT messages_sender_id_fkey
        FOREIGN KEY (sender_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        ALTER TABLE public.messages
        ADD CONSTRAINT messages_receiver_id_fkey
        FOREIGN KEY (receiver_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Fixed messages table relationships';
    ELSE
        RAISE NOTICE 'Table messages does not exist, skipping';
    END IF;
END
$$;

-- 13. Fix room_messages table relationships
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'room_messages') THEN
        -- Drop existing foreign key if it exists
        ALTER TABLE public.room_messages DROP CONSTRAINT IF EXISTS room_messages_sender_id_fkey;
        ALTER TABLE public.room_messages DROP CONSTRAINT IF EXISTS fk_room_messages_sender_id;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.room_messages
        ADD CONSTRAINT room_messages_sender_id_fkey
        FOREIGN KEY (sender_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Fixed room_messages table relationships';
    ELSE
        RAISE NOTICE 'Table room_messages does not exist, skipping';
    END IF;
END
$$;

-- 14. Fix room_participants table relationships
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'room_participants') THEN
        -- Drop existing foreign key if it exists
        ALTER TABLE public.room_participants DROP CONSTRAINT IF EXISTS room_participants_user_id_fkey;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.room_participants
        ADD CONSTRAINT room_participants_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Fixed room_participants table relationships';
    ELSE
        RAISE NOTICE 'Table room_participants does not exist, skipping';
    END IF;
END
$$;

-- 15. Fix rooms table relationships
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rooms') THEN
        -- Drop existing foreign key if it exists
        ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_creator_id_fkey;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.rooms
        ADD CONSTRAINT rooms_creator_id_fkey
        FOREIGN KEY (creator_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Fixed rooms table relationships';
    ELSE
        RAISE NOTICE 'Table rooms does not exist, skipping';
    END IF;
END
$$;

-- 16. Fix stories table relationships
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stories') THEN
        -- Drop existing foreign key if it exists
        ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS fk_stories_user;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.stories
        ADD CONSTRAINT fk_stories_user
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Fixed stories table relationships';
    ELSE
        RAISE NOTICE 'Table stories does not exist, skipping';
    END IF;
END
$$;

-- 17. Fix public_keys table relationships
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'public_keys') THEN
        -- Drop existing foreign keys if they exist
        ALTER TABLE public.public_keys DROP CONSTRAINT IF EXISTS public_keys_user_id_fkey;
        ALTER TABLE public.public_keys DROP CONSTRAINT IF EXISTS fk_user_id;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.public_keys
        ADD CONSTRAINT public_keys_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Fixed public_keys table relationships';
    ELSE
        RAISE NOTICE 'Table public_keys does not exist, skipping';
    END IF;
END
$$;

-- 18. Fix typing_status table relationships
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'typing_status') THEN
        -- Drop existing foreign key if it exists
        ALTER TABLE public.typing_status DROP CONSTRAINT IF EXISTS typing_status_user_id_fkey;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.typing_status
        ADD CONSTRAINT typing_status_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Fixed typing_status table relationships';
    ELSE
        RAISE NOTICE 'Table typing_status does not exist, skipping';
    END IF;
END
$$;

-- 19. Fix reel_views table relationships
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reel_views') THEN
        -- Drop existing foreign key if it exists
        ALTER TABLE public.reel_views DROP CONSTRAINT IF EXISTS reel_views_user_id_fkey;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.reel_views
        ADD CONSTRAINT reel_views_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Fixed reel_views table relationships';
    ELSE
        RAISE NOTICE 'Table reel_views does not exist, skipping';
    END IF;
END
$$;

-- Commit the transaction
COMMIT;
