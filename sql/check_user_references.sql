-- Check if a user ID exists in any table
-- Replace 'USER_ID_HERE' with the actual UUID of the user you want to check

DO $$
DECLARE
    user_id_to_check UUID := 'USER_ID_HERE'; -- Replace with the actual UUID
    table_record RECORD;
    found BOOLEAN := FALSE;
    result_text TEXT := 'User ID ' || user_id_to_check || ' found in:';
BEGIN
    -- Check all tables in the public schema that might have user_id columns
    FOR table_record IN 
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND (column_name = 'user_id' OR column_name = 'id' OR 
             column_name = 'sender_id' OR column_name = 'receiver_id' OR
             column_name = 'follower_id' OR column_name = 'following_id' OR
             column_name = 'recipient_id' OR column_name = 'creator_id')
    LOOP
        EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE %I = %L LIMIT 1)', 
                      table_record.table_name, 
                      table_record.column_name, 
                      user_id_to_check) INTO found;
        
        IF found THEN
            result_text := result_text || E'\n- ' || table_record.table_name || ' (column: ' || table_record.column_name || ')';
        END IF;
    END LOOP;
    
    -- Also check auth.users table
    EXECUTE 'SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = $1 LIMIT 1)' 
    INTO found
    USING user_id_to_check;
    
    IF found THEN
        result_text := result_text || E'\n- auth.users (column: id)';
    END IF;
    
    -- Output the results
    IF result_text = 'User ID ' || user_id_to_check || ' found in:' THEN
        RAISE NOTICE 'User ID % not found in any table', user_id_to_check;
    ELSE
        RAISE NOTICE '%', result_text;
    END IF;
END
$$;
