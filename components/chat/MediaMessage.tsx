import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import CachedImage from '@/components/CachedImage';
import SharedPostMessage from '@/components/SharedPostMessage';
import SharedReelMessage from '@/components/SharedReelMessage';

interface MediaMessageProps {
  messageType: 'image' | 'shared_post' | 'shared_reel';
  content?: string;
  imageUrl?: string;
  postId?: string;
  reelId?: string;
  isOwnMessage: boolean;
  onPress?: () => void;
  sharedData?: any; // Parsed JSON data for shared content
}

const MediaMessage: React.FC<MediaMessageProps> = ({
  messageType,
  content,
  imageUrl,
  postId,
  reelId,
  isOwnMessage,
  onPress,
  sharedData,
}) => {
  const { colors, isDarkMode } = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const maxWidth = screenWidth * 0.7; // 70% of screen width
  const imageHeight = 200;

  const renderImageMessage = () => {
    if (!imageUrl) return null;

    return (
      <TouchableOpacity
        style={[styles.imageContainer, { maxWidth }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <CachedImage
          source={{ uri: imageUrl }}
          style={[styles.image, { height: imageHeight }]}
          resizeMode="cover"
        />
        {content && (
          <View style={[styles.imageCaption, { backgroundColor: colors.backgroundSecondary }]}>
            <Text 
              style={[styles.captionText, { color: colors.text }]}
              className="font-rubik-regular"
            >
              {content}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSharedPost = () => {
    if (!postId && !sharedData) return null;

    return (
      <View style={[styles.sharedContainer, { maxWidth }]}>
        <SharedPostMessage
          postId={postId}
          sharedPostData={sharedData}
          isOwnMessage={isOwnMessage}
        />
      </View>
    );
  };

  const renderSharedReel = () => {
    if (!reelId && !sharedData) return null;

    return (
      <View style={[styles.sharedContainer, { maxWidth }]}>
        <SharedReelMessage
          reelId={reelId}
          sharedReelData={sharedData}
          isOwnMessage={isOwnMessage}
        />
      </View>
    );
  };

  const renderUnsupportedMedia = () => (
    <View style={[styles.unsupportedContainer, { backgroundColor: colors.backgroundSecondary }]}>
      <Ionicons 
        name="document-outline" 
        size={24} 
        color={colors.textSecondary} 
      />
      <Text 
        style={[styles.unsupportedText, { color: colors.textSecondary }]}
        className="font-rubik-medium"
      >
        Unsupported media type
      </Text>
    </View>
  );

  switch (messageType) {
    case 'image':
      return renderImageMessage();
    case 'shared_post':
      return renderSharedPost();
    case 'shared_reel':
      return renderSharedReel();
    default:
      return renderUnsupportedMedia();
  }
};

const styles = StyleSheet.create({
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  image: {
    width: '100%',
    borderRadius: 12,
  },
  imageCaption: {
    padding: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  captionText: {
    fontSize: 14,
    lineHeight: 18,
  },
  sharedContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  unsupportedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  unsupportedText: {
    marginLeft: 8,
    fontSize: 14,
  },
});

export default MediaMessage;
