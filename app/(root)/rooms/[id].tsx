import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/src/context/ThemeContext";
import { communitiesAPI, communityPostsAPI } from "@/lib/communitiesApi";
import { Community, CommunityPost } from "@/lib/communitiesApi";
import CreatePostModal from "@/components/community/CreatePostModal";
import CommunityCommentsModal from "@/components/community/CommunityCommentsModal";
import CommunityPostComponent from "@/components/community/CommunityPost";
import PostManagementModal from "@/components/community/PostManagementModal";
import { supabase } from "@/lib/supabase";

export default function CommunityDetail() {
  const { id } = useLocalSearchParams();
  const { isDarkMode, colors } = useTheme();

  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [userMembership, setUserMembership] = useState<any>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [selectedPostAuthor, setSelectedPostAuthor] = useState<string>('');
  const [showPostManagement, setShowPostManagement] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList | null>(null);


  useEffect(() => {
    loadCommunityData();
  }, [id]);

  const loadCommunityData = async () => {
    if (!id || typeof id !== 'string') return;

    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      // Load community details
      const communityData = await communitiesAPI.getCommunity(id);
      setCommunity(communityData);

      // Load community posts
      const postsData = await communityPostsAPI.getCommunityPosts(id);
      setPosts(postsData);

      // Load user membership status
      try {
        const members = await communitiesAPI.getCommunityMembers(id);
        const currentUserMembership = user ? members.find(member => member.user_id === user.id) : null;
        setUserMembership(currentUserMembership);
      } catch (error) {
        console.log("User not a member or error loading membership:", error);
        setUserMembership(null);
      }

    } catch (error) {
      console.error("Error loading community data:", error);
      Alert.alert("Error", "Failed to load room details");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCommunityData();
    setRefreshing(false);
  };

  const handlePostCreated = () => {
    // Refresh the posts list to show the new post
    loadCommunityData();
  };

  const handleCommentPress = (postId: string, postAuthor: string) => {
    setSelectedPostId(postId);
    setSelectedPostAuthor(postAuthor);
    setShowComments(true);
  };

  const handlePostDeleted = () => {
    // Refresh the posts list after deletion
    loadCommunityData();
  };

  const handlePostManagement = (post: CommunityPost) => {
    setSelectedPost(post);
    setShowPostManagement(true);
  };

  const handlePostUpdate = () => {
    // Refresh the posts list after management actions
    loadCommunityData();
  };



  const handleJoinCommunity = async () => {
    if (!id || typeof id !== 'string') return;

    try {
      await communitiesAPI.joinCommunity(id);
      await loadCommunityData(); // Refresh data
      Alert.alert("Success", "Joined room successfully!");
    } catch (error: any) {
      console.error("Error joining community:", error);
      Alert.alert("Error", error.message || "Failed to join room");
    }
  };

  const handleLeaveCommunity = async () => {
    if (!id || typeof id !== 'string') return;

    Alert.alert(
      "Leave Room",
      "Are you sure you want to leave this room?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await communitiesAPI.leaveCommunity(id);
              router.back();
              Alert.alert("Success", "Left room successfully!");
            } catch (error: any) {
              console.error("Error leaving community:", error);
              Alert.alert("Error", error.message || "Failed to leave room");
            }
          },
        },
      ]
    );
  };

  const renderPost = ({ item }: { item: CommunityPost }) => (
    <CommunityPostComponent
      post={item}
      onLikeChange={loadCommunityData}
      onDelete={handlePostDeleted}
      onCommentPress={() => handleCommentPress(item.id, item.author?.username || 'Unknown')}
      showCommunityInfo={false}
      userRole={userMembership?.role || null}
      onPostManagement={() => handlePostManagement(item)}
      currentUserId={currentUserId}
    />
  );
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading room...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!community) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            Room not found
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, {
              backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
              borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)'
            }]}
          >
            <Text style={[styles.backButtonText, { color: colors.text }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, {
        borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        backgroundColor: colors.background
      }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {community.name}
          </Text>
          <TouchableOpacity
            onPress={() => router.push(`/rooms/members/${id}`)}
            style={styles.membersButton}
          >
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {community.members_count} members • {(community as any).is_private ? 'Private' : 'Public'}
            </Text>
            <Feather name="chevron-right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerActions}>
          {/* Create Post Button - Only show for members */}
          {userMembership && (
            <TouchableOpacity
              onPress={() => setShowCreatePost(true)}
              style={[styles.createPostButton, {
                backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
                borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)',
              }]}
            >
              <Feather name="plus" size={20} color={colors.text} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={userMembership ? handleLeaveCommunity : handleJoinCommunity}
            style={[styles.joinButton, {
              backgroundColor: userMembership
                ? (isDarkMode ? 'rgba(220, 53, 69, 0.2)' : 'rgba(220, 53, 69, 0.1)')
                : (isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)'),
              borderColor: userMembership
                ? 'rgba(220, 53, 69, 0.3)'
                : (isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)')
            }]}
          >
            <Text style={[styles.joinButtonText, {
              color: userMembership ? '#dc3545' : colors.text
            }]}>
              {userMembership ? 'Leave' : 'Join'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Community Description */}
      {community.description && (
        <View style={[styles.descriptionContainer, {
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
          borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
        }]}>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {community.description}
          </Text>
        </View>
      )}

      {/* Posts List */}
      <FlatList
        ref={flatListRef}
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.postsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="message-square" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No posts yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
              Be the first to share something in this room!
            </Text>
          </View>
        }
      />

      {/* Floating Create Post Button */}
      {userMembership && (
        <TouchableOpacity
          onPress={() => setShowCreatePost(true)}
          style={[styles.floatingCreateButton, {
            backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
            borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)'
          }]}
        >
          <Feather name="plus" size={24} color={colors.text} />
        </TouchableOpacity>
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        visible={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        communityId={id as string}
        communityName={community?.name || ''}
        onPostCreated={handlePostCreated}
      />

      {/* Comments Modal */}
      <CommunityCommentsModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        postId={selectedPostId}
        postAuthor={selectedPostAuthor}
      />

      {/* Post Management Modal */}
      {selectedPost && (
        <PostManagementModal
          visible={showPostManagement}
          onClose={() => setShowPostManagement(false)}
          post={selectedPost}
          userRole={userMembership?.role || null}
          onPostUpdate={handlePostUpdate}
        />
      )}
    </SafeAreaView>
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
    fontFamily: 'Rubik-Medium',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Rubik-Bold',
    marginTop: 16,
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Rubik-Bold',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createPostButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  membersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  joinButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  joinButtonText: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
  },
  descriptionContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    lineHeight: 20,
  },
  postsList: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Rubik-Bold',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    marginTop: 8,
    textAlign: 'center',
  },
  floatingCreateButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

