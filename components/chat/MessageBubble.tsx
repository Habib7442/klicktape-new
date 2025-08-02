import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import MediaMessage from './MediaMessage';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

interface MessageBubbleProps {
  content: string;
  isOwnMessage: boolean;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  messageType?: 'text' | 'image' | 'shared_post' | 'shared_reel';
  reactions?: Array<{ emoji: string; count: number; userReacted: boolean }>;
  showStatus?: boolean;
  children?: React.ReactNode;
  imageUrl?: string;
  postId?: string;
  reelId?: string;
  onMediaPress?: () => void;
  replyToMessage?: {
    id: string;
    content: string;
    sender_id: string;
    message_type?: string;
    sender?: {
      username: string;
    };
  };
  currentUserId?: string;
  messageId?: string; // Add messageId to check for temporary messages
  onReaction?: (emoji: string) => void;
  // onReply?: () => void; // TODO: Implement reply functionality later
  onDelete?: () => void;
  onScrollToMessage?: (messageId: string) => void;
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
  replyToMessage,
  currentUserId,
  messageId,
  onReaction,
  // onReply, // TODO: Implement reply functionality later
  onDelete,
  onScrollToMessage,
}) => {
  const { colors, isDarkMode } = useTheme();

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
  const isMediaOnly = messageType !== 'text' && !content;

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Simple reaction emojis for X/Twitter style
  const quickReactions = ['❤️', '😂', '👍', '😮'];
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Check if this is a temporary message (not yet saved to database)
  const isTemporaryMessage = messageId?.startsWith('temp_') || false;

  // Handle quick reaction
  const handleQuickReaction = (emoji: string) => {
    onReaction?.(emoji);
    setShowReactionPicker(false);
  };

  // Handle long press to show emoji picker directly
  const handleLongPress = () => {
    // Provide haptic feedback for long press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Show emoji picker directly on long press
    setShowReactionPicker(!showReactionPicker);
  };

  // Handle delete with confirmation
  const handleDelete = () => {
    console.log('🗑️ MessageBubble delete button pressed');
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log('🗑️ User confirmed deletion');
            onDelete?.();
          },
        },
      ]
    );
  };

  // Handle copy text functionality
  const handleCopyText = async () => {
    if (content && messageType === 'text') {
      try {
        await Clipboard.setStringAsync(content);
        // Provide haptic feedback for successful copy
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('✅ Copied', 'Message copied to clipboard');
      } catch (error) {
        console.error('Error copying text:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('❌ Error', 'Failed to copy message');
      }
    }
  };

  // Handle copy button press with haptic feedback
  const handleCopyButtonPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleCopyText();
  };

  // Close picker when tapping outside
  const handleContainerPress = () => {
    if (showReactionPicker) {
      setShowReactionPicker(false);
    }
  };

  // Chat bubble styling with profile button color
  const bubbleStyle = {
    ...styles.bubble,
    backgroundColor: isOwnMessage
      ? (isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)') // Grayish color like edit profile button
      : colors.backgroundSecondary,
    paddingHorizontal: isMediaOnly ? 4 : 12,
    paddingVertical: isMediaOnly ? 4 : 8,
  };

  const textStyle = {
    ...styles.messageText,
    color: isOwnMessage ? '#FFFFFF' : colors.text,
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onLongPress={handleLongPress}
      onPress={handleContainerPress}
      activeOpacity={0.9}
    >
      <View style={bubbleStyle}>
        {/* Instagram-style reply preview */}
        {replyToMessage && replyToMessage.id && replyToMessage.sender_id && (
          <TouchableOpacity
            style={[styles.replyPreview, {
              borderLeftColor: isOwnMessage ? '#007AFF' : '#87CEEB',
              backgroundColor: colors.backgroundSecondary
            }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onScrollToMessage?.(replyToMessage.id);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.replyUsername, { color: colors.primary }]} numberOfLines={1}>
              {replyToMessage.sender_id === currentUserId ? 'You' : replyToMessage.sender?.username || 'Unknown User'}
            </Text>
            <Text style={[styles.replyText, { color: colors.textSecondary }]} numberOfLines={2}>
              {replyToMessage.content || (replyToMessage.message_type === 'shared_post' ? '📷 Photo' : replyToMessage.message_type === 'shared_reel' ? '🎥 Video' : 'Media')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Media content */}
        {messageType !== 'text' && (
          <MediaMessage
            messageType={messageType as 'image' | 'shared_post' | 'shared_reel'}
            content={undefined}
            imageUrl={imageUrl}
            postId={sharedData?.post_id || postId}
            reelId={sharedData?.reel_id || reelId}
            isOwnMessage={isOwnMessage}
            onPress={onMediaPress}
            sharedData={sharedData}
          />
        )}

        {/* Text content */}
        {content && messageType === 'text' && (
          <Text style={textStyle} selectable={false} className="font-rubik-regular">
            {content}
          </Text>
        )}

        {/* Simple footer with timestamp and status */}
        <View style={styles.footer}>
          <Text style={[styles.timestamp, { color: colors.textSecondary }]} className="font-rubik-regular">
            {formatTime(timestamp)}
          </Text>

          {/* Simple status indicator */}
          {isOwnMessage && showStatus && (
            <Ionicons
              name={status === 'read' ? 'checkmark-done' : status === 'delivered' ? 'checkmark' : 'time'}
              size={12}
              color={status === 'read' ? '#87CEEB' : colors.textSecondary}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>
      </View>

      {/* Simple reactions display */}
      {reactions.length > 0 && (
        <View style={[styles.reactionsContainer, isOwnMessage ? styles.reactionsRight : styles.reactionsLeft]}>
          {reactions.map((reaction, index) => (
            <TouchableOpacity
              key={`${reaction.emoji}-${index}`}
              style={[styles.reactionBadge, { backgroundColor: reaction.userReacted ? '#87CEEB20' : colors.backgroundSecondary }]}
              onPress={() => handleQuickReaction(reaction.emoji)}
            >
              <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
              {reaction.count > 1 && (
                <Text style={[styles.reactionCount, { color: colors.text }]}>{reaction.count}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Action buttons - reply, copy, and delete */}
      <View style={[styles.quickActions, isOwnMessage ? styles.quickActionsRight : styles.quickActionsLeft]}>
        {/* TODO: Implement reply button later */}
        {/* {onReply && !isTemporaryMessage && (
          <TouchableOpacity style={styles.quickReactionButton} onPress={onReply}>
            <Ionicons name="arrow-undo" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        )} */}

        {/* Copy button - only show for text messages */}
        {content && messageType === 'text' && (
          <TouchableOpacity style={styles.quickReactionButton} onPress={handleCopyButtonPress}>
            <Ionicons name="copy-outline" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {isOwnMessage && onDelete && (
          <TouchableOpacity style={styles.quickReactionButton} onPress={handleDelete}>
            <Ionicons name="trash" size={14} color={colors.error || '#ff4444'} />
          </TouchableOpacity>
        )}
      </View>

      {/* Modal-based reaction picker - guaranteed to be on top */}
      <Modal
        visible={showReactionPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReactionPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            console.log('🔥 Modal overlay pressed - closing picker');
            setShowReactionPicker(false);
          }}
        >
          <View style={styles.modalReactionPicker}>
            {quickReactions.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.modalReactionOption}
                onPress={() => {
                  console.log('🎯 EMOJI TOUCHED IN MODAL:', emoji);
                  handleQuickReaction(emoji);
                }}
                onPressIn={() => console.log('👆 Press IN on modal emoji:', emoji)}
                onPressOut={() => console.log('👆 Press OUT on modal emoji:', emoji)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalReactionEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalReactionOption}
              onPress={() => {
                console.log('❌ Modal close button pressed');
                setShowReactionPicker(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginVertical: 2,
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginVertical: 1,
    
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginHorizontal: 8,
  },
  reactionsRight: {
    justifyContent: 'flex-end',
    
  },
  reactionsLeft: {
    justifyContent: 'flex-start',
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
    marginBottom: 4,
    
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  replyPreview: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  replyUsername: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 12,
    lineHeight: 16,
  },
  quickActions: {
    flexDirection: 'row',
    marginTop: 4,
    marginHorizontal: 8,
    opacity: 0.7,
  },
  quickActionsRight: {
    justifyContent: 'flex-end',
  },
  quickActionsLeft: {
    justifyContent: 'flex-start',
  },
  quickReactionButton: {
    padding: 6,
    marginHorizontal: 2,
    borderRadius: 12,
  },
  quickReactionEmoji: {
    fontSize: 12,
  },
  reactionPicker: {
    position: 'absolute',
    top: -45,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 25,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  reactionPickerLeft: {
    left: 0,
  },
  reactionPickerRight: {
    right: 0,
  },
  reactionOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    marginHorizontal: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  reactionOptionEmoji: {
    fontSize: 20,
  },
  // Modal-based reaction picker styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalReactionPicker: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalReactionOption: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 25,
    marginHorizontal: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 50,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalReactionEmoji: {
    fontSize: 24,
  },
});

export default MessageBubble;
