import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { router } from 'expo-router';
import CachedImage from './CachedImage';

interface SharedPostData {
  type: 'shared_post';
  post_id: string;
  post_caption: string;
  post_image: string;
  post_owner: string;
  shared_by: string;
  shared_at: string;
}

interface SharedPostMessageProps {
  postId?: string;
  sharedPostData?: SharedPostData;
  isOwnMessage?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const maxMessageWidth = screenWidth * 0.8;

const SharedPostMessage: React.FC<SharedPostMessageProps> = ({
  postId,
  sharedPostData,
  isOwnMessage = false,
}) => {
  const { colors, isDarkMode } = useTheme();

  // Use postId if provided directly, otherwise use sharedPostData
  const actualPostId = postId || sharedPostData?.post_id;

  const handlePostPress = () => {
    if (actualPostId) {
      router.push(`/post/${actualPostId}`);
    }
  };

  // If we don't have post data, show a simple placeholder
  if (!actualPostId) {
    return (
      <View style={[
        styles.sharedPostContainer,
        {
          backgroundColor: isOwnMessage
            ? isDarkMode
              ? 'rgba(128, 128, 128, 0.15)'
              : 'rgba(128, 128, 128, 0.08)'
            : isDarkMode
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.03)',
        },
      ]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Shared post unavailable
        </Text>
      </View>
    );
  }

  // Get post owner name
  const getPostOwner = () => {
    return sharedPostData?.post_owner || 'Unknown User';
  };

  // Get post caption
  const getPostCaption = () => {
    return sharedPostData?.post_caption || 'Shared a post';
  };

  // Get post image
  const getPostImage = () => {
    return sharedPostData?.post_image || 'https://via.placeholder.com/300x200/333333/FFFFFF?text=📷';
  };

  const truncateCaption = (caption: string, maxLength: number = 150) => {
    if (caption.length <= maxLength) return caption;
    return caption.substring(0, maxLength) + '...';
  };

  return (
    <TouchableOpacity
      style={[
        styles.sharedPostContainer,
        {
          backgroundColor: isOwnMessage
            ? isDarkMode
              ? 'rgba(128, 128, 128, 0.15)'
              : 'rgba(128, 128, 128, 0.08)'
            : isDarkMode
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.03)',
          borderColor: isOwnMessage
            ? isDarkMode
              ? 'rgba(128, 128, 128, 0.25)'
              : 'rgba(128, 128, 128, 0.15)'
            : isDarkMode
              ? 'rgba(255, 255, 255, 0.15)'
              : 'rgba(0, 0, 0, 0.08)',
        },
      ]}
      onPress={handlePostPress}
      activeOpacity={0.7}
    >
      {/* Shared Post Header */}
      <View style={styles.sharedPostHeader}>
        <Feather 
          name="share" 
          size={16} 
          color={colors.textSecondary} 
          style={styles.shareIcon}
        />
        <Text 
          className="font-rubik-medium" 
          style={[styles.sharedText, { color: colors.textSecondary }]}
        >
          Shared a post
        </Text>
      </View>

      {/* Post Content */}
      <View style={styles.postContent}>
        {/* Post Image - Full Width */}
        <View style={styles.imageContainer}>
          <CachedImage
            uri={getPostImage()}
            style={styles.postImage}
            showLoader={true}
            fallbackUri="https://via.placeholder.com/200x200"
          />
        </View>

        {/* Post Details - Below Image */}
        <View style={styles.postDetails}>
          <Text
            className="font-rubik-bold"
            style={[styles.postOwner, { color: colors.text }]}
            numberOfLines={1}
          >
            @{getPostOwner()}
          </Text>

          <Text
            className="font-rubik-regular"
            style={[styles.postCaption, { color: colors.textSecondary }]}
            numberOfLines={4}
          >
            {truncateCaption(getPostCaption(), 150)}
          </Text>

          <View style={[
            styles.viewPostContainer,
            {
              backgroundColor: `${colors.primary}15`,
              borderColor: `${colors.primary}30`,
            }
          ]}>
            <Text
              className="font-rubik-medium"
              style={[styles.viewPostText, { color: colors.primary }]}
            >
              View Post
            </Text>
            <Feather
              name="external-link"
              size={14}
              color={colors.primary}
              style={styles.externalIcon}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  sharedPostContainer: {
    maxWidth: maxMessageWidth,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginVertical: 2,
  },
  sharedPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  shareIcon: {
    marginRight: 6,
  },
  sharedText: {
    fontSize: 12,
    fontWeight: '500',
  },
  postContent: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  postImage: {
    width: maxMessageWidth - 48, // Account for container padding
    height: Math.min(180, (maxMessageWidth - 48) * 0.75), // Maintain aspect ratio, max 180px
    borderRadius: 12,
  },
  postDetails: {
    paddingHorizontal: 4,
  },
  postOwner: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  postCaption: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  viewPostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewPostText: {
    fontSize: 14,
    fontWeight: '600',
  },
  externalIcon: {
    marginLeft: 6,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SharedPostMessage;
