import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/store/store';
import MessageBubble from './MessageBubble';
import SwipeableMessage from './SwipeableMessage';
import LongPressableMessage from './LongPressableMessage';
import { selectMessageHighlight } from '@/src/store/slices/chatUISlice';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  status?: 'sent' | 'delivered' | 'read';
  message_type?: 'text' | 'image' | 'shared_post' | 'shared_reel';
  reply_to_message_id?: string;
  reply_to_message?: {
    id: string;
    content: string;
    sender_id: string;
    message_type?: string;
  };
  image_url?: string;
  post_id?: string;
  reel_id?: string;
}

interface MessageItemProps {
  message: Message;
  currentUserId: string;
  onReply: (message: Message) => void;
  onReaction: (messageId: string, emoji: string) => void;
  reactions?: Array<{ emoji: string; count: number; userReacted: boolean }>;
  children?: React.ReactNode; // For media content
  onMediaPress?: (message: Message) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUserId,
  onReply,
  onReaction,
  reactions = [],
  children,
  onMediaPress,
}) => {
  const isOwnMessage = message.sender_id === currentUserId;
  
  // Get highlight state from Redux
  const { isMessageHighlighted, highlightedMessageId } = useSelector((state: RootState) => 
    selectMessageHighlight(state)
  );
  
  const isHighlighted = isMessageHighlighted && highlightedMessageId === message.id;

  const handleSwipeLeft = () => {
    if (isOwnMessage) {
      onReply(message);
    }
  };

  const handleSwipeRight = () => {
    if (!isOwnMessage) {
      onReply(message);
    }
  };

  const containerStyle = [
    styles.messageContainer,
    isOwnMessage ? styles.messageRight : styles.messageLeft,
    isHighlighted && styles.highlighted,
  ];

  return (
    <View style={containerStyle}>
      <SwipeableMessage
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        isOwnMessage={isOwnMessage}
        enabled={true}
      >
        <LongPressableMessage
          messageId={message.id}
          enabled={true}
        >
          <MessageBubble
            content={message.content}
            isOwnMessage={isOwnMessage}
            timestamp={message.created_at}
            status={message.status}
            messageType={message.message_type}
            reactions={reactions}
            showStatus={isOwnMessage}
            imageUrl={message.image_url}
            postId={message.post_id}
            reelId={message.reel_id}
            onMediaPress={() => onMediaPress?.(message)}
          >
            {children}
          </MessageBubble>
        </LongPressableMessage>
      </SwipeableMessage>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginBottom: 3, // Reduced for tighter WhatsApp-style grouping
    marginHorizontal: 8, // Reduced horizontal margin
    maxWidth: '95%', // Increased to allow bubbles to reach closer to edges
  },
  messageLeft: {
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    marginRight: 50, // Ensure right margin for left-aligned messages
  },
  messageRight: {
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
    marginLeft: 50, // Ensure left margin for right-aligned messages
  },
  highlighted: {
    backgroundColor: 'rgba(37, 211, 102, 0.2)', // WhatsApp green highlight
    borderRadius: 8,
    padding: 4,
    margin: 2,
  },
});

export default MessageItem;
