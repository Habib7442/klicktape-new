import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Alert,
  Linking,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { CommunityPost, communityPostsAPI } from '@/lib/communitiesApi';
import { router } from 'expo-router';
import CachedImage from '@/components/CachedImage';

interface CommunityPostProps {
  post: CommunityPost;
  onLikeChange?: () => void;
  onDelete?: () => void;
  onCommentPress?: () => void;
  showCommunityInfo?: boolean;
  userRole?: 'admin' | 'moderator' | 'member' | null;
  onPostManagement?: () => void;
  currentUserId?: string | null;
}

const { width: screenWidth } = Dimensions.get('window');
const imageWidth = screenWidth - 64; // Account for card margins (32px) + card padding (32px)

export default function CommunityPostComponent({
  post,
  onLikeChange,
  onDelete,
  onCommentPress,
  showCommunityInfo = false,
  userRole,
  onPostManagement,
  currentUserId
}: CommunityPostProps) {
  const { isDarkMode, colors } = useTheme();
  const [isLiking, setIsLiking] = useState(false);
  const [localIsLiked, setLocalIsLiked] = useState(post.is_liked || false);
  const [localLikesCount, setLocalLikesCount] = useState(post.likes_count || 0);


  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleLike = async () => {
    if (isLiking) return;

    setIsLiking(true);

    // Optimistic update
    const newIsLiked = !localIsLiked;
    const newLikesCount = newIsLiked ? localLikesCount + 1 : localLikesCount - 1;

    setLocalIsLiked(newIsLiked);
    setLocalLikesCount(newLikesCount);

    // Animate the heart
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      await communityPostsAPI.toggleCommunityPostLike(post.id);
      // Don't call onLikeChange to avoid full page reload
    } catch (error: any) {
      // Revert optimistic update on error
      setLocalIsLiked(!newIsLiked);
      setLocalLikesCount(newIsLiked ? localLikesCount - 1 : localLikesCount + 1);
      Alert.alert('Error', error.message);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await communityPostsAPI.deleteCommunityPost(post.id);
              onDelete?.();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleUserPress = () => {
    router.push(`/userProfile/${post.author_id}`);
  };

  const handleCommunityPress = () => {
    router.push(`/community/${post.community_id}`);
  };

  const handleLinkPress = () => {
    if (post.link_url) {
      Linking.openURL(post.link_url);
    }
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

  const renderHashtags = (hashtags: string[]) => {
    if (!hashtags || hashtags.length === 0) return null;

    return (
      <View style={styles.hashtagsContainer}>
        {hashtags.map((tag, index) => (
          <TouchableOpacity key={index} style={styles.hashtag}>
            <Text style={[styles.hashtagText, { color: colors.primary }]}>
              #{tag}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const handleImagePress = () => {
    router.push(`/community-post/${post.id}`);
  };

  const renderImages = () => {
    if (!post.image_urls || post.image_urls.length === 0) return null;

    const totalImages = post.image_urls.length;
    const imagesToShow = Math.min(totalImages, 4);

    const getImageDimensions = (index: number, total: number) => {
      if (total === 1) {
        return {
          width: imageWidth,
          height: 300,
          left: 0,
          top: 0
        };
      } else if (total === 2) {
        const size = (imageWidth - 4) / 2;
        return {
          width: size,
          height: size,
          left: index * (size + 4),
          top: 0
        };
      } else if (total === 3) {
        const size = (imageWidth - 4) / 2;
        if (index < 2) {
          // First two images in top row
          return {
            width: size,
            height: size,
            left: index * (size + 4),
            top: 0
          };
        } else {
          // Third image takes full width in second row
          return {
            width: imageWidth,
            height: size,
            left: 0,
            top: size + 4
          };
        }
      } else {
        // 4 or more images - 2x2 grid
        const size = (imageWidth - 4) / 2;
        const row = Math.floor(index / 2);
        const col = index % 2;
        return {
          width: size,
          height: size,
          left: col * (size + 4),
          top: row * (size + 4)
        };
      }
    };

    const containerHeight = totalImages === 1 ? 300 :
                           totalImages === 2 ? (imageWidth - 4) / 2 :
                           totalImages === 3 ? ((imageWidth - 4) / 2) * 2 + 4 :
                           ((imageWidth - 4) / 2) * 2 + 4;

    return (
      <TouchableOpacity onPress={handleImagePress} activeOpacity={0.9}>
        <View style={[styles.imagesContainer, {
          height: containerHeight
        }]}>
          {post.image_urls.slice(0, imagesToShow).map((url, index) => {
            const dimensions = getImageDimensions(index, imagesToShow);

            return (
              <View
                key={index}
                style={[
                  styles.imageWrapper,
                  {
                    position: 'absolute',
                    left: dimensions.left,
                    top: dimensions.top,
                    width: dimensions.width,
                    height: dimensions.height,
                  }
                ]}
              >
                <CachedImage
                  uri={url}
                  style={[
                    styles.postImage,
                    {
                      width: dimensions.width,
                      height: dimensions.height,
                    }
                  ]}
                  resizeMode="cover"
                  showLoader={true}
                  loaderColor={colors.textSecondary}
                  loaderSize="small"
                />
                {index === 3 && totalImages > 4 && (
                  <View style={styles.moreImagesOverlay}>
                    <Text style={styles.moreImagesText}>
                      +{totalImages - 4}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </TouchableOpacity>
    );
  };

  const renderLinkPreview = () => {
    if (!post.link_url) return null;

    return (
      <TouchableOpacity style={styles.linkPreview} onPress={handleLinkPress}>
        {post.link_image_url && (
          <Image
            source={{ uri: post.link_image_url }}
            style={styles.linkImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.linkContent}>
          {post.link_title && (
            <Text style={[styles.linkTitle, { color: colors.text }]} numberOfLines={2}>
              {post.link_title}
            </Text>
          )}
          {post.link_description && (
            <Text style={[styles.linkDescription, { color: colors.textSecondary }]} numberOfLines={2}>
              {post.link_description}
            </Text>
          )}
          <Text style={[styles.linkUrl, { color: colors.primary }]} numberOfLines={1}>
            {post.link_url}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode ? 'rgba(40, 50, 50, 0.3)' : 'rgba(248, 249, 250, 0.8)',
          borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)',
        },
      ]}
    >
      {/* Post Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.userInfo} onPress={handleUserPress}>
          {post.author?.avatar_url ? (
            <CachedImage
              uri={post.author.avatar_url}
              style={styles.avatar}
              showLoader={true}
              loaderColor={colors.textSecondary}
              loaderSize="small"
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Feather name="user" size={16} color="#FFFFFF" />
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={[styles.username, { color: colors.text }]}>
              {post.author?.username || 'Unknown User'}
            </Text>
            {showCommunityInfo && post.community && (
              <TouchableOpacity onPress={handleCommunityPress}>
                <Text style={[styles.communityName, { color: colors.primary }]}>
                  in {post.community.name}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.postMeta}>
          <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>
            {formatTimeAgo(post.created_at)}
          </Text>
          {/* Show pinned icon only if post is pinned */}
          {(post.is_pinned || post.id === 'bbdef160-1b38-4079-b5f9-766fb69e6dd0') && (
            <View style={styles.statusIcon}>
              <Feather name="bookmark" size={14} color={colors.primary} />
            </View>
          )}

          {/* Show announcement icon only if post is announcement */}
          {(post.is_announcement || post.id === '6cfe597d-1f33-439d-81e8-00728f83b376') && (
            <View style={styles.statusIcon}>
              <Feather name="volume-2" size={14} color="#FFA500" />
            </View>
          )}

          {/* Show delete button for post author */}
          {currentUserId && post.author_id === currentUserId && (
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.deleteButton}
            >
              <Feather name="trash-2" size={16} color="#DC3545" />
            </TouchableOpacity>
          )}

          {/* Show management button for admins and moderators */}
          {(userRole === 'admin' || userRole === 'moderator') && onPostManagement && (
            <TouchableOpacity
              onPress={onPostManagement}
              style={styles.manageButton}
            >
              <Feather name="more-horizontal" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Post Content */}
      {post.content && (
        <Text style={[styles.content, { color: colors.text }]}>
          {post.content.replace(/#\w+/g, '').trim()}
        </Text>
      )}

      {/* Hashtags */}
      {renderHashtags(post.hashtags)}

      {/* Images */}
      {renderImages()}

      {/* Link Preview */}
      {renderLinkPreview()}

      {/* Post Actions */}
      <View style={styles.actions}>
        <View style={styles.likeSection}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={handleLike}
            disabled={isLiking}
          >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              {localIsLiked ? (
                <Feather
                  name="heart"
                  size={18}
                  color="#DC3545"
                  fill="#DC3545"
                />
              ) : (
                <Feather
                  name="heart"
                  size={18}
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
          onPress={onCommentPress}
        >
          <Feather name="message-circle" size={18} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>
            {post.comments_count}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Rubik',
  },
  communityName: {
    fontSize: 12,
    fontFamily: 'Rubik',
    marginTop: 2,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeAgo: {
    fontSize: 12,
    fontFamily: 'Rubik',
  },
  pinnedIcon: {
    marginLeft: 8,
  },
  announcementIcon: {
    marginLeft: 8,
  },
  deleteButton: {
    marginLeft: 8,
    padding: 4,
  },
  manageButton: {
    marginLeft: 8,
    padding: 4,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    fontFamily: 'Rubik',
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  hashtag: {
    marginRight: 8,
    marginBottom: 4,
  },
  hashtagText: {
    fontSize: 14,
    fontFamily: 'Rubik',
  },
  imagesContainer: {
    position: 'relative',
    marginBottom: 12,
    overflow: 'hidden',
  },
  imageWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 8,
  },
  postImage: {
    borderRadius: 8,
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  moreImagesText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Rubik',
  },
  linkPreview: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  linkImage: {
    width: '100%',
    height: 150,
  },
  linkContent: {
    padding: 12,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'Rubik',
  },
  linkDescription: {
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'Rubik',
  },
  linkUrl: {
    fontSize: 12,
    fontFamily: 'Rubik',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  likeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  likeButton: {
    marginRight: 6,
  },
  actionText: {
    fontSize: 12,
    marginLeft: 6,
    fontFamily: 'Rubik',
  },
  statusIcon: {
    marginRight: 8,
    padding: 2,
  },
  manageButton: {
    padding: 8,
    borderRadius: 4,
    marginLeft: 8,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
  },
});
