import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import ThemedGradient from '@/components/ThemedGradient';
import {
  communitiesAPI,
  communityPostsAPI,
  Community,
  CommunityPost
} from '@/lib/communitiesApi';
import CommunityPostComponent from '@/components/community/CommunityPost';
import PostManagementModal from '@/components/community/PostManagementModal';

export default function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDarkMode, colors } = useTheme();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [showPostManagement, setShowPostManagement] = useState(false);

  useEffect(() => {
    if (id) {
      loadCommunityData();
    }
  }, [id]);

  const loadCommunityData = async () => {
    try {
      await Promise.all([
        loadCommunity(),
        loadPosts(),
      ]);
    } catch (error) {
      console.error('Error loading community data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCommunity = async () => {
    try {
      const data = await communitiesAPI.getCommunity(id!);
      setCommunity(data);


    } catch (error) {
      console.error('Error loading community:', error);
      Alert.alert('Error', 'Failed to load community');
      router.back();
    }
  };

  const loadPosts = async () => {
    try {
      setPostsLoading(true);
      const data = await communityPostsAPI.getCommunityPosts(id!, 20, 0, 'pinned');
      setPosts(data);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCommunityData();
  };

  const handleJoinCommunity = async () => {
    if (!community) return;

    try {
      await communitiesAPI.joinCommunity(community.id);
      loadCommunity(); // Reload to get updated status
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleLeaveCommunity = async () => {
    if (!community) return;

    Alert.alert(
      'Leave Community',
      `Are you sure you want to leave ${community.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await communitiesAPI.leaveCommunity(community.id);
              loadCommunity(); // Reload to get updated status
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleCreatePost = () => {
    if (!community) return;
    router.push(`/community/${community.id}/create-post`);
  };

  const handlePostManagement = useCallback((post: CommunityPost) => {
    console.log('handlePostManagement called with post:', post.id);
    setSelectedPost(post);
    setShowPostManagement(true);
    console.log('Modal state updated - should show modal now');
  }, []);

  const handleClosePostManagement = () => {
    setShowPostManagement(false);
    setSelectedPost(null);
  };

  const renderPost = ({ item }: { item: CommunityPost }) => {
    console.log('Rendering post with callback:', {
      postId: item.id,
      hasHandlePostManagement: !!handlePostManagement,
      hasCommunity: !!community,
      userRole: community?.user_role,
      callbackFunction: handlePostManagement
    });

    // Don't render if community data isn't loaded yet
    if (!community) {
      return null;
    }

    return (
      <CommunityPostComponent
        post={item}
        onLikeChange={loadPosts}
        onDelete={loadPosts}
        showCommunityInfo={false}
        userRole={community.user_role}
        onPostManagement={() => {
          console.log('TEST: Direct callback called for post:', item.id);
          alert(`TEST: Direct callback works for post ${item.id}`);
        }}
      />
    );
  };

  const renderHeader = () => {
    if (!community) return null;

    const isJoined = community.user_status === 'active';
    const isPending = community.user_status === 'pending';
    const isAdmin = community.user_role === 'admin';
    const isModerator = community.user_role === 'moderator';

    return (
      <View style={[
        styles.header,
        {
          backgroundColor: isDarkMode ? 'rgba(40, 50, 50, 0.5)' : 'rgba(248, 249, 250, 0.8)',
          borderBottomColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)',
        },
      ]}>
        {/* Community Avatar and Info */}
        <View style={styles.communityInfo}>
          <View style={styles.avatarContainer}>
            {community.avatar_url ? (
              <Image source={{ uri: community.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                <Feather name="users" size={24} color="#FFFFFF" />
              </View>
            )}
            {community.is_verified && (
              <View style={styles.verifiedBadge}>
                <Feather name="check" size={12} color="#FFFFFF" />
              </View>
            )}
          </View>

          <View style={styles.details}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]}>
                {community.name}
              </Text>
              <Feather
                name={community.privacy_type === 'public' ? 'globe' : 'lock'}
                size={16}
                color={colors.textSecondary}
                style={styles.privacyIcon}
              />
            </View>

            {community.category && (
              <Text style={[styles.category, { color: colors.textSecondary }]}>
                {community.category.name}
              </Text>
            )}

            <Text style={[styles.description, { color: colors.text }]}>
              {community.description}
            </Text>

            {/* Stats */}
            <View style={styles.stats}>
              <View style={styles.statItem}>
                <Feather name="users" size={14} color={colors.textSecondary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {community.members_count.toLocaleString()} members
                </Text>
              </View>

              <View style={styles.statItem}>
                <Feather name="message-square" size={14} color={colors.textSecondary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {community.posts_count.toLocaleString()} posts
                </Text>
              </View>

              {(isAdmin || isModerator) && (
                <View style={[styles.roleBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.roleBadgeText}>
                    {isAdmin ? 'Admin' : 'Moderator'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {isJoined ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={handleCreatePost}
              >
                <Feather name="plus" size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Post</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, {
                  backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
                  borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)',
                  borderWidth: 1,
                }]}
                onPress={handleLeaveCommunity}
              >
                <Feather name="user-minus" size={16} color={colors.text} />
                <Text style={[styles.actionButtonTextSecondary, { color: colors.text }]}>
                  Leave
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleJoinCommunity}
              disabled={isPending}
            >
              <Feather
                name={isPending ? 'clock' : 'user-plus'}
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.actionButtonText}>
                {isPending ? 'Pending' : 'Join'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <ThemedGradient>
        <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Loading community...
            </Text>
          </View>
        </SafeAreaView>
      </ThemedGradient>
    );
  }

  return (
    <ThemedGradient>
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
        {/* Navigation Header */}
        <View style={[styles.navHeader, {
          backgroundColor: isDarkMode ? 'rgba(40, 50, 50, 0.5)' : 'rgba(248, 249, 250, 0.8)',
          borderBottomColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)',
        }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>
            {community?.name || 'Community'}
          </Text>
          <View style={styles.navActions}>
            <TouchableOpacity style={styles.navActionButton}>
              <Feather name="search" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navActionButton}>
              <Feather name="more-vertical" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            postsLoading ? (
              <View style={styles.postsLoadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.postsLoadingText, { color: colors.textSecondary }]}>
                  Loading posts...
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Feather name="message-square" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No posts yet
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  Be the first to share something with this community!
                </Text>
              </View>
            )
          }
        />

        {/* Post Management Modal */}
        {selectedPost && (
          <PostManagementModal
            visible={showPostManagement}
            onClose={handleClosePostManagement}
            post={selectedPost}
            userRole={community?.user_role || null}
            onPostUpdate={loadPosts}
          />
        )}
      </SafeAreaView>
    </ThemedGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Rubik',
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  navTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Rubik',
  },
  navActions: {
    flexDirection: 'row',
  },
  navActionButton: {
    padding: 8,
    marginLeft: 8,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  communityInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1DA1F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Rubik',
    flex: 1,
  },
  privacyIcon: {
    marginLeft: 8,
  },
  category: {
    fontSize: 14,
    fontFamily: 'Rubik',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    fontFamily: 'Rubik',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    marginLeft: 4,
    fontFamily: 'Rubik',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Rubik',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
    fontFamily: 'Rubik',
  },
  actionButtonTextSecondary: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    fontFamily: 'Rubik',
  },
  listContent: {
    paddingBottom: 20,
  },
  postsLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  postsLoadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Rubik',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    fontFamily: 'Rubik',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'Rubik',
  },
});
