-- Add CASCADE DELETE to second-level foreign key constraints
-- This script modifies existing foreign key constraints to enable automatic deletion of related records

DO $$
BEGIN
    -- Post-related cascades
    
    -- Drop and recreate foreign keys with CASCADE DELETE for post_likes table
    ALTER TABLE IF EXISTS public.post_likes 
        DROP CONSTRAINT IF EXISTS post_likes_post_id_fkey;
    
    ALTER TABLE IF EXISTS public.post_likes
        ADD CONSTRAINT post_likes_post_id_fkey
        FOREIGN KEY (post_id)
        REFERENCES public.posts(id)
        ON DELETE CASCADE;
    
    -- Drop and recreate foreign keys with CASCADE DELETE for post_comments table
    ALTER TABLE IF EXISTS public.post_comments 
        DROP CONSTRAINT IF EXISTS post_comments_post_id_fkey;
    
    ALTER TABLE IF EXISTS public.post_comments
        ADD CONSTRAINT post_comments_post_id_fkey
        FOREIGN KEY (post_id)
        REFERENCES public.posts(id)
        ON DELETE CASCADE;
    
    -- Drop and recreate foreign keys with CASCADE DELETE for likes table
    ALTER TABLE IF EXISTS public.likes 
        DROP CONSTRAINT IF EXISTS likes_post_id_fkey;
    
    ALTER TABLE IF EXISTS public.likes
        ADD CONSTRAINT likes_post_id_fkey
        FOREIGN KEY (post_id)
        REFERENCES public.posts(id)
        ON DELETE CASCADE;
    
    -- Drop and recreate foreign keys with CASCADE DELETE for comments table
    ALTER TABLE IF EXISTS public.comments 
        DROP CONSTRAINT IF EXISTS comments_post_id_fkey;
    
    ALTER TABLE IF EXISTS public.comments
        ADD CONSTRAINT comments_post_id_fkey
        FOREIGN KEY (post_id)
        REFERENCES public.posts(id)
        ON DELETE CASCADE;
    
    -- Drop and recreate foreign keys with CASCADE DELETE for bookmarks table
    ALTER TABLE IF EXISTS public.bookmarks 
        DROP CONSTRAINT IF EXISTS bookmarks_post_id_fkey;
    
    ALTER TABLE IF EXISTS public.bookmarks
        ADD CONSTRAINT bookmarks_post_id_fkey
        FOREIGN KEY (post_id)
        REFERENCES public.posts(id)
        ON DELETE CASCADE;
    
    -- Reel-related cascades
    
    -- Drop and recreate foreign keys with CASCADE DELETE for reel_likes table
    ALTER TABLE IF EXISTS public.reel_likes 
        DROP CONSTRAINT IF EXISTS reel_likes_reel_id_fkey;
    
    ALTER TABLE IF EXISTS public.reel_likes
        ADD CONSTRAINT reel_likes_reel_id_fkey
        FOREIGN KEY (reel_id)
        REFERENCES public.reels(id)
        ON DELETE CASCADE;
    
    -- Drop and recreate foreign keys with CASCADE DELETE for reel_comments table
    ALTER TABLE IF EXISTS public.reel_comments 
        DROP CONSTRAINT IF EXISTS reel_comments_reel_id_fkey;
    
    ALTER TABLE IF EXISTS public.reel_comments
        ADD CONSTRAINT reel_comments_reel_id_fkey
        FOREIGN KEY (reel_id)
        REFERENCES public.reels(id)
        ON DELETE CASCADE;
    
    -- Drop and recreate foreign keys with CASCADE DELETE for reel_views table
    ALTER TABLE IF EXISTS public.reel_views 
        DROP CONSTRAINT IF EXISTS reel_views_reel_id_fkey;
    
    ALTER TABLE IF EXISTS public.reel_views
        ADD CONSTRAINT reel_views_reel_id_fkey
        FOREIGN KEY (reel_id)
        REFERENCES public.reels(id)
        ON DELETE CASCADE;
    
    -- Room-related cascades
    
    -- Drop and recreate foreign keys with CASCADE DELETE for room_messages table
    ALTER TABLE IF EXISTS public.room_messages 
        DROP CONSTRAINT IF EXISTS room_messages_room_id_fkey;
    
    ALTER TABLE IF EXISTS public.room_messages
        ADD CONSTRAINT room_messages_room_id_fkey
        FOREIGN KEY (room_id)
        REFERENCES public.rooms(id)
        ON DELETE CASCADE;
    
    -- Drop and recreate foreign keys with CASCADE DELETE for room_participants table
    ALTER TABLE IF EXISTS public.room_participants 
        DROP CONSTRAINT IF EXISTS room_participants_room_id_fkey;
    
    ALTER TABLE IF EXISTS public.room_participants
        ADD CONSTRAINT room_participants_room_id_fkey
        FOREIGN KEY (room_id)
        REFERENCES public.rooms(id)
        ON DELETE CASCADE;
    
    -- Comment-related cascades
    
    -- Drop and recreate foreign keys with CASCADE DELETE for comment_likes table
    ALTER TABLE IF EXISTS public.comment_likes 
        DROP CONSTRAINT IF EXISTS comment_likes_comment_id_fkey;
    
    ALTER TABLE IF EXISTS public.comment_likes
        ADD CONSTRAINT comment_likes_comment_id_fkey
        FOREIGN KEY (comment_id)
        REFERENCES public.comments(id)
        ON DELETE CASCADE;
    
    -- Drop and recreate foreign keys with CASCADE DELETE for reel_comment_likes table
    ALTER TABLE IF EXISTS public.reel_comment_likes 
        DROP CONSTRAINT IF EXISTS reel_comment_likes_comment_id_fkey;
    
    ALTER TABLE IF EXISTS public.reel_comment_likes
        ADD CONSTRAINT reel_comment_likes_comment_id_fkey
        FOREIGN KEY (comment_id)
        REFERENCES public.reel_comments(id)
        ON DELETE CASCADE;
    
    -- Handle nested comments (parent-child relationships)
    ALTER TABLE IF EXISTS public.comments 
        DROP CONSTRAINT IF EXISTS comments_parent_comment_id_fkey;
    
    ALTER TABLE IF EXISTS public.comments
        ADD CONSTRAINT comments_parent_comment_id_fkey
        FOREIGN KEY (parent_comment_id)
        REFERENCES public.comments(id)
        ON DELETE CASCADE;
    
    ALTER TABLE IF EXISTS public.reel_comments 
        DROP CONSTRAINT IF EXISTS reel_comments_parent_comment_id_fkey;
    
    ALTER TABLE IF EXISTS public.reel_comments
        ADD CONSTRAINT reel_comments_parent_comment_id_fkey
        FOREIGN KEY (parent_comment_id)
        REFERENCES public.reel_comments(id)
        ON DELETE CASCADE;
END
$$;
