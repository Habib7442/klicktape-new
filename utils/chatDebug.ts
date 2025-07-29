import { supabase } from '@/lib/supabase';

/**
 * Debug utility to check chat-related issues
 */
export const chatDebug = {
  /**
   * Check if a user exists in the profiles table
   */
  checkUserExists: async (userId: string) => {
    console.log('🔍 Checking if user exists:', userId);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, created_at')
      .eq('id', userId)
      .single();
    
    console.log('🔍 User check result:', { data, error });
    return { exists: !!data, data, error };
  },

  /**
   * List all users in profiles table (for debugging)
   */
  listAllUsers: async (limit: number = 10) => {
    console.log('🔍 Listing all users in profiles table...');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, created_at')
      .limit(limit);
    
    console.log('🔍 All users:', { count: data?.length, data, error });
    return { data, error };
  },

  /**
   * Check current authenticated user
   */
  checkCurrentUser: async () => {
    console.log('🔍 Checking current authenticated user...');
    
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log('🔍 Current auth user:', { user: user?.id, email: user?.email, error });
    
    if (user) {
      // Check if this user exists in profiles table
      const profileCheck = await chatDebug.checkUserExists(user.id);
      console.log('🔍 Current user profile exists:', profileCheck.exists);
    }
    
    return { user, error };
  },

  /**
   * Comprehensive chat debug - run this when you get the error
   */
  runFullDiagnostic: async (recipientId: string) => {
    console.log('🔍 Running full chat diagnostic...');
    console.log('🔍 Recipient ID:', recipientId);
    
    // Check current user
    const currentUserCheck = await chatDebug.checkCurrentUser();
    
    // Check recipient
    const recipientCheck = await chatDebug.checkUserExists(recipientId);
    
    // List some users for context
    const usersList = await chatDebug.listAllUsers(5);
    
    const diagnostic = {
      recipientId,
      currentUser: currentUserCheck,
      recipient: recipientCheck,
      sampleUsers: usersList
    };
    
    console.log('🔍 Full diagnostic result:', diagnostic);
    return diagnostic;
  }
};

// Export for easy access in console
if (typeof window !== 'undefined') {
  (window as any).chatDebug = chatDebug;
}
