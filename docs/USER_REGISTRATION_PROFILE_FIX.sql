-- =====================================================
-- USER REGISTRATION PROFILE CREATION FIX
-- Comprehensive solution for automatic profile creation
-- =====================================================

-- First, ensure all necessary columns exist in profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;

-- Ensure existing columns have proper defaults
UPDATE profiles SET account_type = 'personal'::account_type WHERE account_type IS NULL;
UPDATE profiles SET is_active = FALSE WHERE is_active IS NULL;

-- Generate anonymous room names for existing users who don't have them
UPDATE profiles SET
    anonymous_room_name = 'Anonymous' || substr(md5(id::text), 1, 6)
WHERE anonymous_room_name IS NULL OR anonymous_room_name = '';

-- =====================================================
-- ENHANCED USER PROFILE CREATION FUNCTION
-- =====================================================

-- Drop existing trigger and function to recreate them
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile();

-- Create enhanced profile creation function
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    generated_username TEXT;
    generated_room_name TEXT;
    user_full_name TEXT;
    counter INTEGER := 1;
BEGIN
    -- Extract full name from metadata
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        'User'
    );
    
    -- Generate a unique username based on email
    IF NEW.email IS NOT NULL THEN
        generated_username := split_part(NEW.email, '@', 1);
        -- Clean username: remove special characters, limit length
        generated_username := regexp_replace(generated_username, '[^a-zA-Z0-9_]', '_', 'g');
        generated_username := substring(generated_username from 1 for 20);
        
        -- Ensure username is unique by appending counter if needed
        WHILE EXISTS (SELECT 1 FROM profiles WHERE username = generated_username) LOOP
            generated_username := substring(split_part(NEW.email, '@', 1) from 1 for 15) || '_' || counter::text;
            counter := counter + 1;
            
            -- Prevent infinite loop
            IF counter > 1000 THEN
                generated_username := 'user_' || substr(NEW.id::text, 1, 8);
                EXIT;
            END IF;
        END LOOP;
    ELSE
        -- Fallback to user ID-based username
        generated_username := 'user_' || substr(NEW.id::text, 1, 8);
    END IF;
    
    -- Generate anonymous room name
    generated_room_name := 'Anonymous' || substr(md5(NEW.id::text), 1, 6);
    
    -- Insert profile with all necessary fields
    INSERT INTO public.profiles (
        id,
        email,
        username,
        full_name,
        created_at,
        updated_at,
        avatar_url,
        account_type,
        gender,
        bio,
        public_key,
        anonymous_room_name,
        is_active
    ) VALUES (
        NEW.id,
        NEW.email,
        generated_username,
        user_full_name,
        NOW(),
        NOW(),
        NULL, -- Will be set when user completes profile
        'personal'::account_type, -- Default account type
        NULL, -- Will be set when user completes profile
        NULL, -- Empty bio initially
        NULL, -- Will be generated when user completes profile
        generated_room_name,
        FALSE -- User needs to complete profile setup
    );
    
    -- Log successful profile creation
    RAISE NOTICE 'Profile created for user % with username %', NEW.id, generated_username;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail user creation
    RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- =====================================================
-- PROFILE COMPLETION FUNCTIONS
-- =====================================================

-- Function to check if a profile is complete
CREATE OR REPLACE FUNCTION is_profile_complete(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_record profiles%ROWTYPE;
BEGIN
    SELECT * INTO profile_record
    FROM profiles
    WHERE id = user_id_param;
    
    -- Profile is complete if it has username, gender, and account_type
    RETURN (
        profile_record.id IS NOT NULL AND
        profile_record.username IS NOT NULL AND
        profile_record.username != '' AND
        profile_record.gender IS NOT NULL AND
        profile_record.account_type IS NOT NULL
    );
END;
$$;

-- Function to get profile completion status with details
CREATE OR REPLACE FUNCTION get_profile_completion_status(user_id_param UUID)
RETURNS TABLE(
    exists BOOLEAN,
    is_complete BOOLEAN,
    missing_fields TEXT[],
    username TEXT,
    gender gender_enum,
    account_type account_type,
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_record profiles%ROWTYPE;
    missing_list TEXT[] := '{}';
BEGIN
    SELECT * INTO profile_record
    FROM profiles
    WHERE id = user_id_param;
    
    -- Check if profile exists
    IF profile_record.id IS NULL THEN
        RETURN QUERY SELECT FALSE, FALSE, ARRAY['profile_not_found']::TEXT[], NULL::TEXT, NULL::gender_enum, NULL::account_type, FALSE;
        RETURN;
    END IF;
    
    -- Check required fields
    IF profile_record.username IS NULL OR profile_record.username = '' THEN
        missing_list := array_append(missing_list, 'username');
    END IF;
    
    IF profile_record.gender IS NULL THEN
        missing_list := array_append(missing_list, 'gender');
    END IF;
    
    IF profile_record.account_type IS NULL THEN
        missing_list := array_append(missing_list, 'account_type');
    END IF;
    
    -- Return status
    RETURN QUERY SELECT 
        TRUE,
        array_length(missing_list, 1) IS NULL OR array_length(missing_list, 1) = 0,
        missing_list,
        profile_record.username,
        profile_record.gender,
        profile_record.account_type,
        profile_record.is_active;
END;
$$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if the trigger exists and is active
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Check profiles table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test profile completion function with existing users
SELECT 
    id,
    username,
    gender,
    account_type,
    is_active,
    is_profile_complete(id) as complete
FROM profiles
LIMIT 5;

-- =====================================================
-- NOTES FOR IMPLEMENTATION
-- =====================================================

/*
WHAT THIS FIX DOES:

1. AUTOMATIC PROFILE CREATION:
   - Enhanced trigger function creates complete profile records
   - Handles all required fields with sensible defaults
   - Generates unique usernames and anonymous room names
   - Robust error handling that doesn't break user registration

2. PROFILE COMPLETION CHECKING:
   - is_profile_complete() function for simple boolean check
   - get_profile_completion_status() for detailed status
   - Checks username, gender, and account_type as required fields

3. DATA CONSISTENCY:
   - Adds missing columns if they don't exist
   - Updates existing profiles with missing data
   - Ensures backward compatibility

4. DEBUGGING SUPPORT:
   - Verification queries to check trigger status
   - Profile completion testing functions
   - Detailed logging and error messages

EXPECTED FLOW AFTER FIX:
1. User signs up → auth.users record created
2. Trigger automatically creates basic profile
3. User verifies email and signs in
4. App checks profile completion status
5. If incomplete → redirect to create-profile
6. If complete → redirect to home

TESTING:
1. Run this SQL script on your Supabase database
2. Test user registration flow
3. Check that profiles are created automatically
4. Verify redirect logic works correctly
*/
