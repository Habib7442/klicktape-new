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
    console.log("Check email exists function called")
    
    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing environment variables", { 
        hasUrl: !!supabaseUrl, 
        hasServiceKey: !!supabaseServiceRoleKey 
      })
      return createResponse({ 
        error: 'Server configuration error: Missing environment variables',
        details: {
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!supabaseServiceRoleKey
        }
      }, 500)
    }

    // Parse the request body
    let email: string
    try {
      const body = await req.json()
      email = body.email
      
      if (!email) {
        return createResponse({ error: 'Email is required' }, 400)
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return createResponse({ error: 'Invalid email format' }, 400)
      }
    } catch (error) {
      console.error("Error parsing request body:", error)
      return createResponse({ error: 'Invalid request body' }, 400)
    }

    // Create an admin client to check if the email exists
    console.log("Creating admin client")
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      { global: { headers: { Authorization: `Bearer ${supabaseServiceRoleKey}` } } }
    )

    // Check if the email exists in auth.users
    console.log(`Checking if email exists: ${email}`)
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    
    if (error) {
      console.error("Error listing users:", error)
      return createResponse({ 
        error: 'Error checking email', 
        details: error.message 
      }, 500)
    }

    // Check if the email exists in the list of users
    const exists = data.users.some(user => user.email === email)
    console.log(`Email exists: ${exists}`)

    return createResponse({ 
      exists,
      message: exists ? 'Email already exists' : 'Email is available'
    })
  } catch (error) {
    console.error("Unexpected error in check-email-exists function:", error)
    return createResponse({ 
      error: 'Unexpected error in check-email-exists function', 
      details: error.message,
      stack: error.stack
    }, 500)
  }
})
