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

interface SharedReelData {
  type: 'shared_reel';
  reel_id: string;
  reel_caption: string;
  reel_video_url: string;
  reel_thumbnail?: string;
  reel_owner: string;
  shared_by: string;
  shared_at: string;
}

interface SharedReelMessageProps {
  reelId?: string;
  sharedReelData?: SharedReelData;
  isOwnMessage?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const maxMessageWidth = screenWidth * 0.8;

const SharedReelMessage: React.FC<SharedReelMessageProps> = ({
  reelId,
  sharedReelData,
  isOwnMessage = false,
}) => {
  const { colors, isDarkMode } = useTheme();

  // Use reelId if provided directly, otherwise use sharedReelData
  const actualReelId = reelId || sharedReelData?.reel_id;

  const handleReelPress = () => {
    if (actualReelId) {
      router.push(`/reel/${actualReelId}`);
    }
  };

  // If we don't have reel data, show a simple placeholder
  if (!actualReelId) {
    return (
      <View style={[
        styles.sharedReelContainer,
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
          Shared reel unavailable
        </Text>
      </View>
    );
  }

  const truncateCaption = (caption: string, maxLength: number = 150) => {
    if (caption.length <= maxLength) return caption;
    return caption.substring(0, maxLength) + '...';
  };

  // Generate thumbnail URL from video URL if not provided
  const getThumbnailUrl = () => {
    if (sharedReelData?.reel_thumbnail) {
      return sharedReelData.reel_thumbnail;
    }
    // Fallback to a placeholder or try to extract thumbnail from video URL
    return 'https://via.placeholder.com/200x300/333333/FFFFFF?text=🎥';
  };

  // Get reel owner name
  const getReelOwner = () => {
    return sharedReelData?.reel_owner || 'Unknown User';
  };

  // Get reel caption
  const getReelCaption = () => {
    return sharedReelData?.reel_caption || 'Shared a reel';
  };

  return (
    <TouchableOpacity
      style={[
        styles.sharedReelContainer,
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
      onPress={handleReelPress}
      activeOpacity={0.7}
    >
      {/* Shared Reel Header */}
      <View style={styles.sharedReelHeader}>
        <Feather 
          name="video" 
          size={16} 
          color={colors.textSecondary} 
          style={styles.videoIcon}
        />
        <Text 
          className="font-rubik-medium" 
          style={[styles.sharedText, { color: colors.textSecondary }]}
        >
          Shared a reel
        </Text>
      </View>

      {/* Reel Content */}
      <View style={styles.reelContent}>
        {/* Reel Thumbnail - Full Width */}
        <View style={styles.thumbnailContainer}>
          <CachedImage
            uri={getThumbnailUrl()}
            style={styles.reelThumbnail}
            showLoader={true}
            fallbackUri="https://via.placeholder.com/200x300/333333/FFFFFF?text=🎥"
          />
          {/* Play Icon Overlay */}
          <View style={styles.playIconOverlay}>
            <Feather 
              name="play" 
              size={32} 
              color="rgba(255, 255, 255, 0.9)" 
            />
          </View>
        </View>

        {/* Reel Details - Below Thumbnail */}
        <View style={styles.reelDetails}>
          <Text
            className="font-rubik-bold"
            style={[styles.reelOwner, { color: colors.text }]}
            numberOfLines={1}
          >
            @{getReelOwner()}
          </Text>

          <Text
            className="font-rubik-regular"
            style={[styles.reelCaption, { color: colors.textSecondary }]}
            numberOfLines={4}
          >
            {truncateCaption(getReelCaption(), 150)}
          </Text>
          
          <View style={[
            styles.viewReelContainer,
            {
              backgroundColor: `${colors.primary}15`,
              borderColor: `${colors.primary}30`,
            }
          ]}>
            <Text 
              className="font-rubik-medium" 
              style={[styles.viewReelText, { color: colors.primary }]}
            >
              Watch Reel
            </Text>
            <Feather 
              name="play-circle" 
              size={14} 
              color={colors.primary} 
              style={styles.playCircleIcon}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  sharedReelContainer: {
    maxWidth: maxMessageWidth,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginVertical: 2,
  },
  sharedReelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  videoIcon: {
    marginRight: 6,
  },
  sharedText: {
    fontSize: 12,
    fontWeight: '500',
  },
  reelContent: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  thumbnailContainer: {
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  reelThumbnail: {
    width: maxMessageWidth - 48, // Account for container padding
    height: Math.min(240, (maxMessageWidth - 48) * 1.2), // Taller aspect ratio for reels
    borderRadius: 12,
  },
  playIconOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  reelDetails: {
    paddingHorizontal: 4,
  },
  reelOwner: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  reelCaption: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  viewReelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewReelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  playCircleIcon: {
    marginLeft: 6,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SharedReelMessage;
