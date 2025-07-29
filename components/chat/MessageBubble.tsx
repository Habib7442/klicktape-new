import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import MessageStatus from './MessageStatus';
import ReactionBadge from './ReactionBadge';
import MediaMessage from './MediaMessage';

interface MessageBubbleProps {
  content: string;
  isOwnMessage: boolean;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  messageType?: 'text' | 'image' | 'shared_post' | 'shared_reel';
  reactions?: Array<{ emoji: string; count: number; userReacted: boolean }>;
  showStatus?: boolean;
  children?: React.ReactNode; // For media content
  imageUrl?: string;
  postId?: string;
  reelId?: string;
  onMediaPress?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  content,
  isOwnMessage,
  timestamp,
  status = 'sent',
  messageType = 'text',
  reactions = [],
  showStatus = true,
  children,
  imageUrl,
  postId,
  reelId,
  onMediaPress,
}) => {
  const { colors, isDarkMode } = useTheme();

  // Check if this is a media-only message
  const isMediaOnly = messageType !== 'text' && !content;

  // Parse shared content for shared posts and reels
  const parseSharedContent = () => {
    if (messageType === 'shared_post' || messageType === 'shared_reel') {
      try {
        return JSON.parse(content);
      } catch (error) {
        console.error('Error parsing shared content:', error);
        return null;
      }
    }
    return null;
  };

  const sharedData = parseSharedContent();

  // WhatsApp-style bubble styling
  const bubbleStyle = {
    ...styles.bubble,
    backgroundColor: isOwnMessage
      ? "#128C7E" // Less bright WhatsApp green for better blue tick visibility
      : isDarkMode
        ? "#1F2937" // Better dark gray for receiver in dark mode
        : "#F3F4F6", // Light gray for receiver in light mode
    borderBottomRightRadius: isOwnMessage ? 3 : 18, // More pronounced WhatsApp tail effect
    borderBottomLeftRadius: isOwnMessage ? 18 : 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: isDarkMode ? 0.3 : 0.1,
    shadowRadius: 2,
    elevation: 2,
    // Better padding for text readability
    paddingHorizontal: isMediaOnly ? 4 : 14,
    paddingVertical: isMediaOnly ? 4 : 10,
  };

  const textStyle = {
    ...styles.messageText,
    color: isOwnMessage ? "#FFFFFF" : isDarkMode ? "#FFFFFF" : "#000000",
    fontFamily: 'Rubik-Regular', // Ensure consistent font
  };

  const timestampStyle = {
    ...styles.timestamp,
    color: isOwnMessage
      ? "rgba(255, 255, 255, 0.8)"
      : isDarkMode
        ? "rgba(255, 255, 255, 0.6)"
        : "rgba(0, 0, 0, 0.6)",
    fontFamily: 'Rubik-Regular',
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <View style={styles.container}>
      <View style={bubbleStyle}>
        {/* Media content */}
        {messageType !== 'text' && (
          <MediaMessage
            messageType={messageType as 'image' | 'shared_post' | 'shared_reel'}
            content={messageType === 'text' ? content : undefined}
            imageUrl={imageUrl}
            postId={sharedData?.post_id || postId}
            reelId={sharedData?.reel_id || reelId}
            isOwnMessage={isOwnMessage}
            onPress={onMediaPress}
            sharedData={sharedData}
          />
        )}

        {/* Custom children (for additional media content) */}
        {children}

        {/* Text content */}
        {content && messageType === 'text' && (
          <Text
            style={textStyle}
            selectable={true}
            className="font-rubik-regular"
          >
            {content}
          </Text>
        )}

        {/* Timestamp and status row */}
        <View style={styles.footer}>
          <Text style={timestampStyle} className="font-rubik-regular">
            {formatTime(timestamp)}
          </Text>

          {/* Message status for own messages */}
          {isOwnMessage && showStatus && (
            <MessageStatus status={status} />
          )}
        </View>
      </View>
      
      {/* Emoji reactions */}
      {reactions.length > 0 && (
        <View style={[
          styles.reactionsContainer,
          isOwnMessage ? styles.reactionsRight : styles.reactionsLeft
        ]}>
          {reactions.map((reaction, index) => (
            <ReactionBadge
              key={`${reaction.emoji}-${index}`}
              emoji={reaction.emoji}
              count={reaction.count}
              userReacted={reaction.userReacted}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  bubble: {
    maxWidth: '90%', // Increased from 80% for better WhatsApp feel
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginVertical: 1, // Reduced for tighter grouping
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22, // Better line height for readability
    marginBottom: 2, // Reduced margin
    flexWrap: 'wrap', // Ensure text wraps properly
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2, // Reduced margin
  },
  timestamp: {
    fontSize: 11, // Slightly smaller like WhatsApp
    marginRight: 4,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 4,
  },
  reactionsRight: {
    justifyContent: 'flex-end',
  },
  reactionsLeft: {
    justifyContent: 'flex-start',
  },
});

export default MessageBubble;
