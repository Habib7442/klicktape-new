// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/supabase

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Helper function to create consistent response objects
const createResponse = (data: any, status = 200) => {
  return new Response(
    JSON.stringify(data),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status
    }
  )
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Delete user function called")

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error("Missing environment variables", {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
        hasServiceKey: !!supabaseServiceRoleKey
      })
      return createResponse({
        error: 'Server configuration error: Missing environment variables',
        details: {
          hasUrl: !!supabaseUrl,
          hasAnonKey: !!supabaseAnonKey,
          hasServiceKey: !!supabaseServiceRoleKey
        }
      }, 500)
    }

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error("No authorization header provided")
      return createResponse({ error: 'No authorization header provided' }, 401)
    }

    // Create a Supabase client with the auth header
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get the user from the auth header
    console.log("Getting user from auth header")
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError) {
      console.error("Error getting user", userError)
      return createResponse({
        error: 'Error getting user',
        details: userError.message
      }, 401)
    }

    if (!user) {
      console.error("User not found")
      return createResponse({ error: 'User not found' }, 404)
    }

    const userId = user.id
    console.log(`User found: ${userId}`)

    // Create an admin client to delete the user
    console.log("Creating admin client")
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      { global: { headers: { Authorization: `Bearer ${supabaseServiceRoleKey}` } } }
    )

    // Delete the user's data from various tables
    // This should be done in a transaction or with careful error handling
    try {
      console.log("Deleting user data from tables")

      // 1. Delete user's posts
      console.log("Deleting user's posts")
      const { error: postsError } = await supabaseAdmin
        .from('posts')
        .delete()
        .eq('user_id', userId)

      if (postsError) {
        console.warn("Error deleting posts", postsError)
      }

      // 2. Delete user's comments
      console.log("Deleting user's comments")
      const { error: commentsError } = await supabaseAdmin
        .from('comments')
        .delete()
        .eq('user_id', userId)

      if (commentsError) {
        console.warn("Error deleting comments", commentsError)
      }

      // 3. Delete user's likes
      console.log("Deleting user's likes")
      const { error: likesError } = await supabaseAdmin
        .from('likes')
        .delete()
        .eq('user_id', userId)

      if (likesError) {
        console.warn("Error deleting likes", likesError)
      }

      // 4. Delete user's follows
      console.log("Deleting user's follows")
      const { error: followsError } = await supabaseAdmin
        .from('follows')
        .delete()
        .or(`follower_id.eq.${userId},following_id.eq.${userId}`)

      if (followsError) {
        console.warn("Error deleting follows", followsError)
      }

      // 5. Delete user's messages
      console.log("Deleting user's messages")
      const { error: messagesError } = await supabaseAdmin
        .from('messages')
        .delete()
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)

      if (messagesError) {
        console.warn("Error deleting messages", messagesError)
      }

      // 6. Delete user's notifications
      console.log("Deleting user's notifications")
      const { error: notificationsError } = await supabaseAdmin
        .from('notifications')
        .delete()
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)

      if (notificationsError) {
        console.warn("Error deleting notifications", notificationsError)
      }

      // 7. Delete user's profile
      console.log("Deleting user's profile")
      const { error: profilesError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (profilesError) {
        console.warn("Error deleting profile", profilesError)
      }

      // Try to delete from room_participants if it exists
      try {
        console.log("Deleting user's room participants")
        await supabaseAdmin
          .from('room_participants')
          .delete()
          .eq('user_id', userId)
      } catch (error) {
        console.warn("Error deleting room participants", error)
      }

      // Try to delete from reel_comments if it exists
      try {
        console.log("Deleting user's reel comments")
        await supabaseAdmin
          .from('reel_comments')
          .delete()
          .eq('user_id', userId)
      } catch (error) {
        console.warn("Error deleting reel comments", error)
      }

      // Try to delete from reel_likes if it exists
      try {
        console.log("Deleting user's reel likes")
        await supabaseAdmin
          .from('reel_likes')
          .delete()
          .eq('user_id', userId)
      } catch (error) {
        console.warn("Error deleting reel likes", error)
      }

      // Try to delete from bookmarks if it exists
      try {
        console.log("Deleting user's bookmarks")
        await supabaseAdmin
          .from('bookmarks')
          .delete()
          .eq('user_id', userId)
      } catch (error) {
        console.warn("Error deleting bookmarks", error)
      }

    } catch (tableError) {
      console.error("Error deleting user data from tables", tableError)
      // Continue with user deletion even if table deletions fail
    }

    // 8. Finally, delete the user from auth.users
    console.log("Deleting user from auth.users")
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteUserError) {
      console.error("Error deleting user from auth.users", deleteUserError)
      return createResponse({
        error: `Failed to delete user from auth system`,
        details: deleteUserError.message,
        code: deleteUserError.code
      }, 500)
    }

    console.log("User deleted successfully")
    return createResponse({
      success: true,
      message: 'User deleted successfully',
      userId: userId
    })
  } catch (error) {
    console.error("Unexpected error in delete-user function", error)
    return createResponse({
      error: 'Unexpected error in delete-user function',
      details: error.message,
      stack: error.stack
    }, 500)
  }
})
