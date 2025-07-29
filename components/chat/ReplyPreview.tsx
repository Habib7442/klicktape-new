import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  message_type?: 'text' | 'shared_post' | 'shared_reel';
}

interface ReplyPreviewProps {
  replyToMessage: Message;
  currentUserId: string;
  onCancel: () => void;
}

const ReplyPreview: React.FC<ReplyPreviewProps> = ({
  replyToMessage,
  currentUserId,
  onCancel,
}) => {
  const { colors, isDarkMode } = useTheme();

  const isOwnMessage = replyToMessage.sender_id === currentUserId;
  const senderLabel = isOwnMessage ? 'You' : 'Other User';

  const getPreviewContent = () => {
    if (replyToMessage.message_type === 'shared_post') {
      return '📷 Shared a post';
    }
    if (replyToMessage.message_type === 'shared_reel') {
      return '🎥 Shared a reel';
    }
    
    // Truncate long messages
    const content = replyToMessage.content || '';
    return content.length > 50 ? `${content.substring(0, 50)}...` : content;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      {/* Reply indicator line */}
      <View style={[styles.replyLine, { backgroundColor: colors.primary }]} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons 
            name="return-up-forward" 
            size={16} 
            color={colors.primary} 
            style={styles.replyIcon}
          />
          <Text style={[styles.senderText, { color: colors.textSecondary }]}>
            Replying to {senderLabel}
          </Text>
        </View>
        
        <Text 
          style={[styles.messageText, { color: colors.text }]}
          numberOfLines={2}
        >
          {getPreviewContent()}
        </Text>
      </View>
      
      <TouchableOpacity 
        onPress={onCancel}
        style={styles.cancelButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  replyLine: {
    width: 3,
    borderRadius: 2,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  replyIcon: {
    marginRight: 6,
  },
  senderText: {
    fontSize: 12,
    fontFamily: 'Rubik-Medium',
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    lineHeight: 18,
  },
  cancelButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReplyPreview;
