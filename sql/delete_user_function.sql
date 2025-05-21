-- Create a function to safely delete a user and all related data
CREATE OR REPLACE FUNCTION public.delete_user(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    -- Start a transaction to ensure all operations succeed or fail together
    BEGIN
        -- Delete from all tables that reference the user
        -- First level - direct references to user_id
        
        -- Delete from profiles
        DELETE FROM public.profiles WHERE id = user_id_param;
        
        -- Delete from public_keys
        DELETE FROM public.public_keys WHERE user_id = user_id_param;
        
        -- Delete from posts (this will cascade to likes, comments, etc. if CASCADE DELETE is set up)
        DELETE FROM public.posts WHERE user_id = user_id_param;
        
        -- Delete from likes
        DELETE FROM public.likes WHERE user_id = user_id_param;
        
        -- Delete from comments
        DELETE FROM public.comments WHERE user_id = user_id_param;
        
        -- Delete from follows where user is follower or following
        DELETE FROM public.follows WHERE follower_id = user_id_param OR following_id = user_id_param;
        
        -- Delete from messages where user is sender or receiver
        DELETE FROM public.messages WHERE sender_id = user_id_param OR receiver_id = user_id_param;
        
        -- Delete from notifications where user is sender or recipient
        DELETE FROM public.notifications WHERE sender_id = user_id_param OR recipient_id = user_id_param;
        
        -- Delete from reels
        DELETE FROM public.reels WHERE user_id = user_id_param;
        
        -- Delete from room_participants
        DELETE FROM public.room_participants WHERE user_id = user_id_param;
        
        -- Delete from bookmarks
        DELETE FROM public.bookmarks WHERE user_id = user_id_param;
        
        -- Delete from comment_likes
        DELETE FROM public.comment_likes WHERE user_id = user_id_param;
        
        -- Delete from reel_likes
        DELETE FROM public.reel_likes WHERE user_id = user_id_param;
        
        -- Delete from reel_comments
        DELETE FROM public.reel_comments WHERE user_id = user_id_param;
        
        -- Delete from reel_views
        DELETE FROM public.reel_views WHERE user_id = user_id_param;
        
        -- Delete from reel_comment_likes
        DELETE FROM public.reel_comment_likes WHERE user_id = user_id_param;
        
        -- Delete from typing_status
        DELETE FROM public.typing_status WHERE user_id = user_id_param;
        
        -- Delete from stories
        DELETE FROM public.stories WHERE user_id = user_id_param;
        
        -- Delete from room_messages where user is sender
        DELETE FROM public.room_messages WHERE sender_id = user_id_param;
        
        -- Check if there's a users table (some Supabase setups have this)
        BEGIN
            DELETE FROM public.users WHERE id = user_id_param;
        EXCEPTION
            WHEN undefined_table THEN
                -- Table doesn't exist, ignore
                NULL;
        END;
        
        -- Finally, delete the user from auth.users
        -- This requires admin privileges
        DELETE FROM auth.users WHERE id = user_id_param;
        
        result := 'User ' || user_id_param || ' and all related data deleted successfully';
        
    EXCEPTION WHEN OTHERS THEN
        -- If any error occurs, rollback and return the error
        RAISE NOTICE 'Error deleting user: %', SQLERRM;
        RETURN 'Error deleting user: ' || SQLERRM;
    END;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
