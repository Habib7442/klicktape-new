import { supabase } from "@/lib/supabase";

export interface Community {
  id: string;
  name: string;
  description: string;
  creator_id: string;
  cover_image_url?: string;
  avatar_url?: string;
  category_id?: string;
  members_count: number;
  posts_count: number;
  privacy_type: 'public' | 'private' | 'invite_only';
  post_permissions: 'all_members' | 'admins_only' | 'admins_and_moderators';
  approval_required: boolean;
  is_verified: boolean;
  status: 'active' | 'suspended' | 'archived';
  rules: string[];
  tags: string[];
  location?: string;
  website_url?: string;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  category?: {
    name: string;
    icon_name?: string;
    color_hex?: string;
  };
  creator?: {
    username: string;
    avatar_url?: string;
  };
  user_role?: 'admin' | 'moderator' | 'member' | null;
  user_status?: 'active' | 'pending' | 'banned' | 'left' | null;
}

export interface CommunityPost {
  id: string;
  community_id: string;
  author_id: string;
  content?: string;
  image_urls: string[];
  video_url?: string;
  link_url?: string;
  link_title?: string;
  link_description?: string;
  link_image_url?: string;
  post_type: 'text' | 'image' | 'video' | 'link' | 'poll';
  hashtags: string[];
  tagged_users: string[];
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_pinned: boolean;
  is_announcement: boolean;
  visibility: 'public' | 'members_only';
  status: 'active' | 'hidden' | 'deleted' | 'reported';
  created_at: string;
  updated_at: string;
  author?: {
    username: string;
    avatar_url?: string;
  };
  community?: {
    name: string;
    avatar_url?: string;
  };
  is_liked?: boolean;
  user_can_edit?: boolean;
  user_can_delete?: boolean;
}

export interface CommunityPostComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  parent_comment_id?: string;
  likes_count: number;
  replies_count: number;
  is_edited: boolean;
  status: 'active' | 'hidden' | 'deleted' | 'reported';
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  is_liked?: boolean;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  status: 'active' | 'pending' | 'banned' | 'left';
  joined_at: string;
  invited_by?: string;
  ban_reason?: string;
  banned_until?: string;
  user?: {
    username: string;
    avatar_url?: string;
    name?: string;
  };
}

export interface CommunityCategory {
  id: string;
  name: string;
  description?: string;
  icon_name?: string;
  color_hex?: string;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
}

export const communitiesAPI = {
  // Get all communities with optional filters
  getCommunities: async (
    limit: number = 20,
    offset: number = 0,
    categoryId?: string,
    searchQuery?: string,
    privacyType?: string,
    sortBy: 'members' | 'activity' | 'newest' = 'activity'
  ): Promise<Community[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      let query = supabase
        .from("communities")
        .select(`
          *,
          category:community_categories(name, icon_name, color_hex),
          creator:profiles!communities_creator_id_fkey(username, avatar_url)
        `)
        .eq('status', 'active');

      // Apply filters
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      if (privacyType) {
        query = query.eq('privacy_type', privacyType);
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      // Apply sorting
      switch (sortBy) {
        case 'members':
          query = query.order('members_count', { ascending: false });
          break;
        case 'activity':
          query = query.order('last_activity_at', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
      }

      query = query.range(offset, offset + limit - 1);

      const { data: communities, error } = await query;
      if (error) throw error;

      // Get user's membership status for each community
      const communityIds = communities?.map((c: any) => c.id) || [];
      const { data: memberships } = await supabase
        .from('community_members')
        .select('community_id, role, status')
        .eq('user_id', user.id)
        .in('community_id', communityIds);

      const membershipMap = new Map(
        memberships?.map((m: any) => [m.community_id, { role: m.role, status: m.status }]) || []
      );

      return communities?.map((community: any) => ({
        ...community,
        user_role: membershipMap.get(community.id)?.role || null,
        user_status: membershipMap.get(community.id)?.status || null,
      })) || [];

    } catch (error: any) {
      throw new Error(`Failed to fetch communities: ${error.message}`);
    }
  },

  // Get a single community by ID
  getCommunity: async (communityId: string): Promise<Community | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: community, error } = await supabase
        .from("communities")
        .select(`
          *,
          category:community_categories(name, icon_name, color_hex),
          creator:profiles!communities_creator_id_fkey(username, avatar_url)
        `)
        .eq('id', communityId)
        .single();

      if (error) throw error;
      if (!community) return null;

      // Get user's membership status
      const { data: membership, error: membershipError } = await supabase
        .from('community_members')
        .select('role, status')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .single();

      // Don't throw error if user is not a member
      return {
        ...community,
        user_role: membershipError ? null : membership?.role || null,
        user_status: membershipError ? null : membership?.status || null,
      };

    } catch (error: any) {
      throw new Error(`Failed to fetch community: ${error.message}`);
    }
  },

  // Create a new community
  createCommunity: async (
    name: string,
    description: string,
    categoryId?: string,
    privacyType: 'public' | 'private' | 'invite_only' = 'public',
    tags: string[] = [],
    rules: string[] = []
  ): Promise<Community> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: community, error } = await supabase
        .from("communities")
        .insert({
          name: name.trim(),
          description: description.trim(),
          creator_id: user.id,
          category_id: categoryId,
          privacy_type: privacyType,
          tags,
          rules,
        })
        .select(`
          *,
          category:community_categories(name, icon_name, color_hex),
          creator:profiles!communities_creator_id_fkey(username, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Add creator as admin member
      await supabase
        .from("community_members")
        .insert({
          community_id: community.id,
          user_id: user.id,
          role: 'admin',
          status: 'active',
        });

      return {
        ...community,
        user_role: 'admin',
        user_status: 'active',
      };

    } catch (error: any) {
      throw new Error(`Failed to create community: ${error.message}`);
    }
  },

  // Join a community
  joinCommunity: async (communityId: string): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Check if community exists and get its privacy settings
      const { data: community, error: communityError } = await supabase
        .from("communities")
        .select('privacy_type, approval_required')
        .eq('id', communityId)
        .single();

      if (communityError) throw communityError;
      if (!community) throw new Error("Community not found");

      const status = community.approval_required || community.privacy_type === 'private' 
        ? 'pending' 
        : 'active';

      // Check if already a member
      const { data: existingMember } = await supabase
        .from("community_members")
        .select('id, status')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        if (existingMember.status === 'left') {
          // Update status for users who left and want to rejoin
          const { error } = await supabase
            .from("community_members")
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', existingMember.id);
          if (error) throw error;
          return;
        }
        throw new Error("You are already a member of this community");
      }

      const { error } = await supabase
        .from("community_members")
        .insert({
          community_id: communityId,
          user_id: user.id,
          role: 'member',
          status,
        });
      if (error) throw error;

    } catch (error: any) {
      throw new Error(`Failed to join community: ${error.message}`);
    }
  },

  // Leave a community
  leaveCommunity: async (communityId: string): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("community_members")
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', user.id);

      if (error) throw error;

    } catch (error: any) {
      throw new Error(`Failed to leave community: ${error.message}`);
    }
  },

  // Delete a community (admin only)
  deleteCommunity: async (communityId: string): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Check if user is admin
      const { data: membership, error: membershipError } = await supabase
        .from("community_members")
        .select("role")
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .single();

      if (membershipError || !membership || membership.role !== 'admin') {
        throw new Error('Only admins can delete communities');
      }

      const { error } = await supabase
        .from("communities")
        .delete()
        .eq('id', communityId);

      if (error) throw error;

    } catch (error: any) {
      throw new Error(`Failed to delete community: ${error.message}`);
    }
  },

  // Get community categories
  getCategories: async (): Promise<CommunityCategory[]> => {
    try {
      const { data, error } = await supabase
        .from("community_categories")
        .select("*")
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];

    } catch (error: any) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }
  },

  // Get user's communities
  getUserCommunities: async (
    userId?: string,
    status: 'active' | 'pending' | 'all' = 'active'
  ): Promise<Community[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const targetUserId = userId || user.id;

      let query = supabase
        .from("community_members")
        .select(`
          role,
          status,
          joined_at,
          community:communities(
            *,
            category:community_categories(name, icon_name, color_hex),
            creator:profiles!communities_creator_id_fkey(username, avatar_url)
          )
        `)
        .eq('user_id', targetUserId);

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      query = query.order('joined_at', { ascending: false });

      const { data: memberships, error } = await query;
      if (error) throw error;

      return memberships?.map((membership: any) => ({
        ...membership.community,
        user_role: membership.role,
        user_status: membership.status,
      })) || [];

    } catch (error: any) {
      throw new Error(`Failed to fetch user communities: ${error.message}`);
    }
  },

  // Get community members
  getCommunityMembers: async (
    communityId: string,
    role?: 'admin' | 'moderator' | 'member',
    limit: number = 20,
    offset: number = 0
  ): Promise<CommunityMember[]> => {
    try {
      let query = supabase
        .from("community_members")
        .select(`
          *,
          user:profiles!community_members_user_id_fkey(username, avatar_url, name)
        `)
        .eq('community_id', communityId)
        .eq('status', 'active');

      if (role) {
        query = query.eq('role', role);
      }

      query = query
        .order('joined_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error } = await query;
      if (error) throw error;

      return data || [];

    } catch (error: any) {
      throw new Error(`Failed to fetch community members: ${error.message}`);
    }
  },

  // Update member role
  updateMemberRole: async (
    communityId: string,
    userId: string,
    newRole: 'admin' | 'moderator' | 'member'
  ): Promise<void> => {
    try {
      console.log(`Updating member role: communityId=${communityId}, userId=${userId}, newRole=${newRole}`);

      // First check if member exists
      const { data: existingMember, error: checkError } = await supabase
        .from('community_members')
        .select('role')
        .eq('community_id', communityId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (checkError || !existingMember) {
        console.error('Member not found:', checkError);
        throw new Error('Member not found or not active');
      }

      console.log(`Current role: ${existingMember.role}, New role: ${newRole}`);

      // Perform the update
      const { error, count } = await supabase
        .from('community_members')
        .update({
          role: newRole
        })
        .eq('community_id', communityId)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log(`Update completed. Rows affected: ${count}`);

      // Verify the update worked
      const { data: updatedMember, error: verifyError } = await supabase
        .from('community_members')
        .select('role')
        .eq('community_id', communityId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (verifyError || !updatedMember) {
        console.error('Failed to verify update:', verifyError);
        throw new Error('Failed to verify role update');
      }

      if (updatedMember.role !== newRole) {
        console.error(`Role update failed. Expected: ${newRole}, Actual: ${updatedMember.role}`);
        throw new Error(`Role update failed. Expected: ${newRole}, but got: ${updatedMember.role}`);
      }

      console.log(`Member role successfully updated to: ${updatedMember.role}`);

    } catch (error: any) {
      console.error('Failed to update member role:', error);
      throw new Error(`Failed to update member role: ${error.message}`);
    }
  },

  // Fix community member count by counting actual active members
  fixCommunityMemberCount: async (communityId: string): Promise<void> => {
    try {
      // Count actual active members
      const { count, error: countError } = await supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', communityId)
        .eq('status', 'active');

      if (countError) throw countError;

      // Update the community member count
      const { error: updateError } = await supabase
        .from('communities')
        .update({ members_count: count || 0 })
        .eq('id', communityId);

      if (updateError) throw updateError;

      console.log(`Fixed member count for community ${communityId}: ${count} members`);
    } catch (error: any) {
      throw new Error(`Failed to fix member count: ${error.message}`);
    }
  },

  // Remove member from community
  removeMember: async (
    communityId: string,
    userId: string
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('community_members')
        .update({
          status: 'left',
          updated_at: new Date().toISOString()
        })
        .eq('community_id', communityId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update community member count
      await supabase.rpc('decrement_community_members', {
        community_id: communityId
      });

    } catch (error: any) {
      throw new Error(`Failed to remove member: ${error.message}`);
    }
  },

  // Promote member (member -> moderator, moderator -> admin)
  promoteMember: async (
    communityId: string,
    userId: string,
    currentRole: 'member' | 'moderator'
  ): Promise<void> => {
    const newRole = currentRole === 'member' ? 'moderator' : 'admin';
    await communitiesAPI.updateMemberRole(communityId, userId, newRole);
  },

  // Demote member (admin -> moderator, moderator -> member)
  demoteMember: async (
    communityId: string,
    userId: string,
    currentRole: 'admin' | 'moderator'
  ): Promise<void> => {
    const newRole = currentRole === 'admin' ? 'moderator' : 'member';
    await communitiesAPI.updateMemberRole(communityId, userId, newRole);
  },

  // Invite user to community
  inviteUser: async (
    communityId: string,
    username: string,
    invitedBy: string
  ): Promise<void> => {
    try {
      // First, find the user by username
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (userError || !userProfile) {
        throw new Error('User not found');
      }

      // Check if user is already a member
      const { data: existingMember, error: memberError } = await supabase
        .from('community_members')
        .select('id, status')
        .eq('community_id', communityId)
        .eq('user_id', userProfile.id)
        .single();

      if (existingMember) {
        if (existingMember.status === 'active') {
          throw new Error('User is already a member of this community');
        } else if (existingMember.status === 'pending') {
          throw new Error('User already has a pending invitation');
        }
      }

      // Get community details to check if it's private
      const community = await communitiesAPI.getCommunity(communityId);
      if (!community) throw new Error('Community not found');
      const status = (community.privacy_type === 'private' || community.privacy_type === 'invite_only')
        ? 'pending'
        : 'active';

      // Create membership record
      const { error: insertError } = await supabase
        .from('community_members')
        .insert({
          community_id: communityId,
          user_id: userProfile.id,
          role: 'member',
          status: status,
          invited_by: invitedBy,
          joined_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // If it's a public community, increment member count
      if (status === 'active') {
        await supabase.rpc('increment_community_members', {
          community_id: communityId
        });
      }

    } catch (error: any) {
      throw new Error(`Failed to invite user: ${error.message}`);
    }
  },

  // Get pending invitations for a community
  getPendingInvitations: async (
    communityId: string
  ): Promise<CommunityMember[]> => {
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select(`
          *,
          user:profiles!community_members_user_id_fkey(username, avatar_url, name),
          inviter:profiles!community_members_invited_by_fkey(username, name)
        `)
        .eq('community_id', communityId)
        .eq('status', 'pending')
        .order('joined_at', { ascending: false });

      if (error) throw error;
      return data || [];

    } catch (error: any) {
      throw new Error(`Failed to fetch pending invitations: ${error.message}`);
    }
  },

  // Approve pending invitation
  approveInvitation: async (
    communityId: string,
    userId: string
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('community_members')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('community_id', communityId)
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (error) throw error;

      // Increment community member count
      await supabase.rpc('increment_community_members', {
        community_id: communityId
      });

    } catch (error: any) {
      throw new Error(`Failed to approve invitation: ${error.message}`);
    }
  },

  // Reject pending invitation
  rejectInvitation: async (
    communityId: string,
    userId: string
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (error) throw error;

    } catch (error: any) {
      throw new Error(`Failed to reject invitation: ${error.message}`);
    }
  },
};

export const communityPostsAPI = {
  // Get a single community post by ID
  getCommunityPost: async (postId: string): Promise<CommunityPost> => {
    try {
      const { data, error } = await supabase
        .from("community_posts")
        .select(`
          *,
          author:profiles!author_id (
            id,
            username,
            avatar_url
          ),
          community:communities!community_id (
            id,
            name,
            avatar_url
          )
        `)
        .eq("id", postId)
        .eq("status", "active")
        .single();

      if (error) throw error;
      if (!data) throw new Error("Post not found");

      // Check if current user has liked this post
      const { data: { user } } = await supabase.auth.getUser();
      let isLiked = false;

      if (user) {
        const { data: like } = await supabase
          .from("community_post_likes")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .single();

        isLiked = !!like;
      }

      return {
        ...data,
        is_liked: isLiked
      };
    } catch (error: any) {
      throw new Error(`Failed to get community post: ${error.message}`);
    }
  },

  // Get community posts
  getCommunityPosts: async (
    communityId: string,
    limit: number = 20,
    offset: number = 0,
    sortBy: 'newest' | 'popular' | 'pinned' = 'newest'
  ): Promise<CommunityPost[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      let query = supabase
        .from("community_posts")
        .select(`
          *,
          author:profiles!community_posts_author_id_fkey(username, avatar_url),
          community:communities!community_posts_community_id_fkey(name, avatar_url)
        `)
        .eq('community_id', communityId)
        .eq('status', 'active');

      // Apply sorting
      switch (sortBy) {
        case 'popular':
          query = query.order('likes_count', { ascending: false });
          break;
        case 'pinned':
          query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
          break;
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      query = query.range(offset, offset + limit - 1);

      const { data: posts, error } = await query;
      if (error) throw error;

      if (!posts || posts.length === 0) return [];

      // Get user's likes for these posts
      const postIds = posts.map((p: any) => p.id);
      const { data: likes } = await supabase
        .from('community_post_likes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds);

      const likedPostIds = new Set(likes?.map((l: any) => l.post_id) || []);

      // Get user's membership to determine permissions
      const { data: membership, error: membershipError } = await supabase
        .from('community_members')
        .select('role')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .single();

      // Don't throw error if user is not a member, just set role to null
      const userRole = membershipError ? null : membership?.role;

      return posts.map((post: any) => ({
        ...post,
        is_liked: likedPostIds.has(post.id),
        user_can_edit: post.author_id === user.id,
        user_can_delete: post.author_id === user.id || userRole === 'admin' || userRole === 'moderator',
      }));

    } catch (error: any) {
      throw new Error(`Failed to fetch community posts: ${error.message}`);
    }
  },

  // Create a community post
  createCommunityPost: async (
    communityId: string,
    content?: string,
    imageUrls: string[] = [],
    videoUrl?: string,
    linkUrl?: string,
    hashtags: string[] = [],
    taggedUsers: string[] = []
  ): Promise<CommunityPost> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Verify user is a member and can post
      const { data: membership, error: membershipError } = await supabase
        .from('community_members')
        .select('role, status')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .single();

      if (membershipError || !membership || membership.status !== 'active') {
        throw new Error("You are not authorized to post in this community");
      }

      // Check community post permissions
      const { data: community, error: communityError } = await supabase
        .from('communities')
        .select('post_permissions')
        .eq('id', communityId)
        .single();

      if (communityError) throw communityError;

      const canPost =
        community.post_permissions === 'all_members' ||
        (community.post_permissions === 'admins_and_moderators' && ['admin', 'moderator'].includes(membership.role)) ||
        (community.post_permissions === 'admins_only' && membership.role === 'admin');

      if (!canPost) {
        throw new Error("You don't have permission to post in this community");
      }

      // Determine post type
      let postType: 'text' | 'image' | 'video' | 'link' = 'text';
      // Validate only one media type is provided
      const mediaCount = (videoUrl ? 1 : 0) + (imageUrls.length > 0 ? 1 : 0) + (linkUrl ? 1 : 0);
      if (mediaCount > 1) {
        throw new Error("Posts can only contain one type of media");
      }
      if (videoUrl) postType = 'video';
      else if (imageUrls.length > 0) postType = 'image';
      else if (linkUrl) postType = 'link';

      const { data: post, error } = await supabase
        .from("community_posts")
        .insert({
          community_id: communityId,
          author_id: user.id,
          content: content?.trim(),
          image_urls: imageUrls,
          video_url: videoUrl,
          link_url: linkUrl,
          post_type: postType,
          hashtags,
          tagged_users: taggedUsers,
        })
        .select(`
          *,
          author:profiles!community_posts_author_id_fkey(username, avatar_url),
          community:communities!community_posts_community_id_fkey(name, avatar_url)
        `)
        .single();

      if (error) throw error;

      return {
        ...post,
        is_liked: false,
        user_can_edit: true,
        user_can_delete: true,
      };

    } catch (error: any) {
      throw new Error(`Failed to create community post: ${error.message}`);
    }
  },

  // Like/unlike a community post
  toggleCommunityPostLike: async (postId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Check if already liked
      const { data: existingLike, error: likeError } = await supabase
        .from("community_post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id);

      if (likeError) throw likeError;

      if (existingLike && existingLike.length > 0) {
        // Unlike
        await supabase
          .from("community_post_likes")
          .delete()
          .eq("id", existingLike[0].id);
        return false;
      } else {
        // Like
        await supabase
          .from("community_post_likes")
          .insert({
            post_id: postId,
            user_id: user.id,
          });
        return true;
      }

    } catch (error: any) {
      throw new Error(`Failed to toggle post like: ${error.message}`);
    }
  },

  // Delete a community post
  deleteCommunityPost: async (postId: string): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get post details to check permissions and get media URLs
      const { data: post, error: postError } = await supabase
        .from("community_posts")
        .select("author_id, community_id, image_urls, video_url")
        .eq("id", postId)
        .single();

      if (postError) throw postError;
      if (!post) throw new Error("Post not found");

      // Check if user can delete (author, admin, or moderator)
      let canDelete = post.author_id === user.id;

      if (!canDelete) {
        const { data: membership } = await supabase
          .from('community_members')
          .select('role')
          .eq('community_id', post.community_id)
          .eq('user_id', user.id)
          .single();

        canDelete = membership?.role === 'admin' || membership?.role === 'moderator';
      }

      if (!canDelete) {
        throw new Error("You don't have permission to delete this post");
      }

      // Delete media files from storage
      const filesToDelete: string[] = [];

      // Add image files to deletion list
      if (post.image_urls && post.image_urls.length > 0) {
        post.image_urls.forEach((url: string) => {
          // Extract file path from URL
          const urlParts = url.split('/storage/v1/object/public/community-media/');
          if (urlParts.length > 1) {
            filesToDelete.push(urlParts[1]);
          }
        });
      }

      // Add video file to deletion list
      if (post.video_url) {
        const urlParts = post.video_url.split('/storage/v1/object/public/community-media/');
        if (urlParts.length > 1) {
          filesToDelete.push(urlParts[1]);
        }
      }

      // Delete files from storage
      if (filesToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('community-media')
          .remove(filesToDelete);

        if (storageError) {
          console.error('Error deleting media files:', storageError);
          // Continue with post deletion even if media deletion fails
        }
      }

      // Delete the post from database
      const { error } = await supabase
        .from("community_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

    } catch (error: any) {
      throw new Error(`Failed to delete community post: ${error.message}`);
    }
  },

  // Share a community post
  shareCommunityPost: async (
    postId: string,
    targetCommunityId: string,
    shareMessage?: string
  ): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Verify user is a member of target community
      const { data: membership, error: membershipError } = await supabase
        .from('community_members')
        .select('status')
        .eq('community_id', targetCommunityId)
        .eq('user_id', user.id)
        .single();

      if (membershipError || !membership || membership.status !== 'active') {
        throw new Error("You are not a member of the target community");
      }

      const { error } = await supabase
        .from("community_post_shares")
        .insert({
          post_id: postId,
          user_id: user.id,
          shared_to_community_id: targetCommunityId,
          share_message: shareMessage?.trim(),
        });

      if (error) throw error;

    } catch (error: any) {
      throw new Error(`Failed to share community post: ${error.message}`);
    }
  },

  // Pin/unpin a community post (admin/moderator only)
  toggleCommunityPostPin: async (postId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get post details
      const { data: post, error: postError } = await supabase
        .from("community_posts")
        .select("community_id, is_pinned")
        .eq("id", postId)
        .single();

      if (postError) throw postError;
      if (!post) throw new Error("Post not found");

      // Check if user is admin or moderator
      const { data: membership, error: membershipError } = await supabase
        .from('community_members')
        .select('role')
        .eq('community_id', post.community_id)
        .eq('user_id', user.id)
        .single();

      if (membershipError || !membership || !['admin', 'moderator'].includes(membership.role)) {
        throw new Error("You don't have permission to pin/unpin posts");
      }

      const newPinnedStatus = !post.is_pinned;

      const { error } = await supabase
        .from("community_posts")
        .update({ is_pinned: newPinnedStatus })
        .eq("id", postId);

      if (error) throw error;

      return newPinnedStatus;

    } catch (error: any) {
      throw new Error(`Failed to toggle post pin: ${error.message}`);
    }
  },

  // Get comments for a community post
  getCommunityPostComments: async (postId: string): Promise<CommunityPostComment[]> => {
    try {
      const { data, error } = await supabase
        .from("community_post_comments")
        .select(`
          *,
          author:profiles!author_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq("post_id", postId)
        .eq("status", "active")
        .is("parent_comment_id", null) // Only top-level comments for now
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Check which comments the current user has liked
      const { data: { user } } = await supabase.auth.getUser();
      if (user && data) {
        const commentIds = data.map((comment: any) => comment.id);
        if (commentIds.length > 0) {
          const { data: likes } = await supabase
            .from("community_post_comment_likes")
            .select("comment_id")
            .eq("user_id", user.id)
            .in("comment_id", commentIds);

          const likedCommentIds = new Set(likes?.map((like: any) => like.comment_id) || []);

          return data.map((comment: any) => ({
            ...comment,
            is_liked: likedCommentIds.has(comment.id)
          }));
        }
      }

      return data || [];
    } catch (error: any) {
      throw new Error(`Failed to get post comments: ${error.message}`);
    }
  },

  // Create a new comment on a community post
  createCommunityPostComment: async (postId: string, content: string, parentCommentId?: string): Promise<CommunityPostComment> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Verify user can comment (is a member of the community)
      const { data: post } = await supabase
        .from("community_posts")
        .select("community_id")
        .eq("id", postId)
        .single();

      if (!post) throw new Error("Post not found");

      const { data: membership } = await supabase
        .from("community_members")
        .select("id")
        .eq("community_id", post.community_id)
        .eq("user_id", user.id)
        .single();

      if (!membership) throw new Error("You must be a member to comment");

      const { data, error } = await supabase
        .from("community_post_comments")
        .insert({
          post_id: postId,
          author_id: user.id,
          content: content.trim(),
          parent_comment_id: parentCommentId || null,
          status: "active"
        })
        .select(`
          *,
          author:profiles!author_id (
            id,
            username,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      return {
        ...data,
        is_liked: false
      };
    } catch (error: any) {
      throw new Error(`Failed to create comment: ${error.message}`);
    }
  },

  // Delete a community post comment
  deleteCommunityPostComment: async (commentId: string): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get comment details to check permissions
      const { data: comment, error: commentError } = await supabase
        .from("community_post_comments")
        .select(`
          author_id,
          post_id,
          community_posts!inner (
            community_id
          )
        `)
        .eq("id", commentId)
        .single();

      if (commentError) throw commentError;
      if (!comment) throw new Error("Comment not found");

      // Check if user can delete (author, admin, or moderator)
      let canDelete = comment.author_id === user.id;

      if (!canDelete) {
        const { data: membership } = await supabase
          .from('community_members')
          .select('role')
          .eq('community_id', comment.community_posts.community_id)
          .eq('user_id', user.id)
          .single();

        canDelete = membership?.role === 'admin' || membership?.role === 'moderator';
      }

      if (!canDelete) {
        throw new Error("You don't have permission to delete this comment");
      }

      const { error } = await supabase
        .from("community_post_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

    } catch (error: any) {
      throw new Error(`Failed to delete comment: ${error.message}`);
    }
  },

  // Get community post likes
  getCommunityPostLikes: async (postId: string, limit: number = 50): Promise<Array<{
    user_id: string;
    username: string;
    avatar_url?: string;
    created_at: string;
  }>> => {
    try {
      const { data, error } = await supabase
        .from("community_post_likes")
        .select(`
          user_id,
          created_at,
          user:profiles!user_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data?.map((like: any) => ({
        user_id: like.user_id,
        username: like.user?.username || 'Unknown',
        avatar_url: like.user?.avatar_url,
        created_at: like.created_at
      })) || [];
    } catch (error: any) {
      throw new Error(`Failed to get community post likes: ${error.message}`);
    }
  },

  // Pin/Unpin community post
  togglePinPost: async (postId: string, isPinned: boolean): Promise<void> => {
    try {
      console.log(`${isPinned ? 'Pinning' : 'Unpinning'} post: ${postId}`);

      const { error } = await supabase
        .from('community_posts')
        .update({
          is_pinned: isPinned
        })
        .eq('id', postId);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log(`Post ${isPinned ? 'pinned' : 'unpinned'} successfully`);
    } catch (error: any) {
      console.error('Failed to toggle pin post:', error);
      throw new Error(`Failed to ${isPinned ? 'pin' : 'unpin'} post: ${error.message}`);
    }
  },

  // Toggle announcement status
  toggleAnnouncementPost: async (postId: string, isAnnouncement: boolean): Promise<void> => {
    try {
      console.log(`${isAnnouncement ? 'Making' : 'Removing'} announcement: ${postId}`);

      const { error } = await supabase
        .from('community_posts')
        .update({
          is_announcement: isAnnouncement
        })
        .eq('id', postId);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log(`Post ${isAnnouncement ? 'marked as announcement' : 'unmarked as announcement'} successfully`);
    } catch (error: any) {
      console.error('Failed to toggle announcement:', error);
      throw new Error(`Failed to ${isAnnouncement ? 'mark' : 'unmark'} as announcement: ${error.message}`);
    }
  },

  // Hide/Show community post (moderation)
  togglePostVisibility: async (postId: string, isHidden: boolean): Promise<void> => {
    try {
      console.log(`${isHidden ? 'Hiding' : 'Showing'} post: ${postId}`);

      const { error } = await supabase
        .from('community_posts')
        .update({
          status: isHidden ? 'hidden' : 'active'
        })
        .eq('id', postId);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log(`Post ${isHidden ? 'hidden' : 'shown'} successfully`);
    } catch (error: any) {
      console.error('Failed to toggle post visibility:', error);
      throw new Error(`Failed to ${isHidden ? 'hide' : 'show'} post: ${error.message}`);
    }
  },

  // Fix community member count by counting actual active members
  fixCommunityMemberCount: async (communityId: string): Promise<void> => {
    try {
      // Count actual active members
      const { count, error: countError } = await supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', communityId)
        .eq('status', 'active');

      if (countError) throw countError;

      // Update the community member count
      const { error: updateError } = await supabase
        .from('communities')
        .update({ members_count: count || 0 })
        .eq('id', communityId);

      if (updateError) throw updateError;

      console.log(`Fixed member count for community ${communityId}: ${count} members`);
    } catch (error: any) {
      throw new Error(`Failed to fix member count: ${error.message}`);
    }
  },

  // Like/unlike a community post comment
  toggleCommunityPostCommentLike: async (commentId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Check if already liked
      const { data: existingLike, error: likeError } = await supabase
        .from("community_post_comment_likes")
        .select("id")
        .eq("comment_id", commentId)
        .eq("user_id", user.id);

      if (likeError) throw likeError;

      if (existingLike && existingLike.length > 0) {
        // Unlike
        await supabase
          .from("community_post_comment_likes")
          .delete()
          .eq("id", existingLike[0].id);
        return false;
      } else {
        // Like
        await supabase
          .from("community_post_comment_likes")
          .insert({
            comment_id: commentId,
            user_id: user.id,
          });
        return true;
      }

    } catch (error: any) {
      throw new Error(`Failed to toggle comment like: ${error.message}`);
    }
  },
};
