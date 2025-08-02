import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { CommunityPost, communityPostsAPI } from '@/lib/communitiesApi';
import CommunityCommentsModal from '@/components/community/CommunityCommentsModal';
import CachedImage from '@/components/CachedImage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function CommunityPostDetail() {
  const { id } = useLocalSearchParams();
  const { isDarkMode, colors } = useTheme();
  
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [localIsLiked, setLocalIsLiked] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadPost();
  }, [id]);

  const loadPost = async () => {
    if (!id || typeof id !== 'string') return;

    try {
      setLoading(true);
      const postData = await communityPostsAPI.getCommunityPost(id);
      setPost(postData);
      setLocalIsLiked(postData.is_liked || false);
      setLocalLikesCount(postData.likes_count || 0);
    } catch (error: any) {
      Alert.alert('Error', error.message);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!post) return;

    // Optimistic update
    const newIsLiked = !localIsLiked;
    const newLikesCount = newIsLiked ? localLikesCount + 1 : localLikesCount - 1;

    setLocalIsLiked(newIsLiked);
    setLocalLikesCount(newLikesCount);

    // Animate the heart
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    try {
      await communityPostsAPI.toggleCommunityPostLike(post.id);
    } catch (error) {
      // Revert optimistic update on error
      setLocalIsLiked(!newIsLiked);
      setLocalLikesCount(localLikesCount);
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to update like");
    }
  };

  const handleCommentPress = () => {
    if (post) {
      setShowComments(true);
    }
  };

  const onScrollImage = (event: any) => {
    const slide = Math.ceil(
      event.nativeEvent.contentOffset.x /
        event.nativeEvent.layoutMeasurement.width
    );
    setCurrentImageIndex(slide);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return postDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading post...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            Post not found
          </Text>
// In your component (around lines 130–137):
<TouchableOpacity
  style={[styles.backButton, { borderColor: colors.textSecondary }]}
  onPress={() => router.back()}
>
  <Text style={[styles.backButtonText, { color: colors.text }]}>
    Go Back
  </Text>
</TouchableOpacity>


        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { 
        borderBottomColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)' 
      }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Post
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <View style={styles.authorInfo}>
            {post.author?.avatar_url ? (
              <CachedImage
                uri={post.author.avatar_url}
                style={styles.authorAvatar}
                showLoader={true}
                loaderColor={colors.textSecondary}
                loaderSize="small"
              />
            ) : (
              <View style={[styles.authorAvatarPlaceholder, {
                backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)'
              }]}>
                <Feather name="user" size={20} color="#FFFFFF" />
              </View>
            )}
            <View style={styles.authorDetails}>
              <Text style={[styles.authorName, { color: colors.text }]}>
                {post.author?.username || 'Anonymous'}
              </Text>
              <Text style={[styles.postTime, { color: colors.textSecondary }]}>
                {formatTimeAgo(post.created_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* Post Content */}
        <Text style={[styles.postContent, { color: colors.text }]}>
          {post.content}
        </Text>

        {/* Images - Carousel */}
        {post.image_urls && post.image_urls.length > 0 && (
          <View style={styles.imageContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onScrollImage}
              scrollEventThrottle={16}
            >
              {post.image_urls.map((url, index) => (
                <CachedImage
                  key={index}
                  uri={url}
                  style={styles.carouselImage}
                  resizeMode="contain"
                  showLoader={true}
                  loaderColor={colors.textSecondary}
                  loaderSize="large"
                />
              ))}
            </ScrollView>
            {post.image_urls.length > 1 && (
              <View style={styles.pagination}>
                {post.image_urls.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      { backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)" },
                      currentImageIndex === index && [styles.activeDot, { backgroundColor: isDarkMode ? '#808080' : '#606060' }],
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Post Actions */}
        <View style={styles.actions}>
          <View style={styles.likeSection}>
            <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                {localIsLiked ? (
                  <Feather
                    name="heart"
                    size={24}
                    color="#DC3545"
                    fill="#DC3545"
                  />
                ) : (
                  <Feather
                    name="heart"
                    size={24}
                    color={colors.textSecondary}
                  />
                )}
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(`/(root)/community-post-likes/${post.id}`)}
              disabled={localLikesCount === 0}
            >
              <Text style={[styles.actionText, {
                color: localIsLiked ? '#DC3545' : colors.textSecondary,
                textDecorationLine: localLikesCount > 0 ? 'underline' : 'none'
              }]}>
                {localLikesCount}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCommentPress}
          >
            <Feather name="message-circle" size={24} color={colors.textSecondary} />
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>
              {post.comments_count || 0}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Comments Modal */}
      <CommunityCommentsModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        postId={post.id}
        postAuthor={post.author?.username || 'Unknown'}
      />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Rubik-Bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  postHeader: {
    marginBottom: 16,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  authorAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Rubik-Bold',
  },
  postTime: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    marginTop: 2,
  },
  postContent: {
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    lineHeight: 24,
    marginBottom: 20,
  },
  imageContainer: {
    marginBottom: 20,
  },
  carouselImage: {
    width: screenWidth - 32,
    height: (screenWidth - 32) * 0.75, // 4:3 aspect ratio
    borderRadius: 12,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 32,
  },
  likeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 32,
  },
  likeButton: {
    marginRight: 8,
  },
  actionText: {
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    marginLeft: 8,
  },
});
