import React from 'react';
import { View, StyleSheet } from 'react-native';
import MessageItem from './MessageItem';

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

interface MessageGroupProps {
  messages: Message[];
  currentUserId: string;
  onReply: (message: Message) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onMediaPress?: (message: Message) => void;
}

const MessageGroup: React.FC<MessageGroupProps> = ({
  messages,
  currentUserId,
  onReply,
  onReaction,
  onMediaPress,
}) => {
  if (messages.length === 0) return null;

  const isOwnMessage = messages[0].sender_id === currentUserId;

  return (
    <View style={[
      styles.groupContainer,
      isOwnMessage ? styles.groupRight : styles.groupLeft
    ]}>
      {messages.map((message, index) => {
        const isFirst = index === 0;
        const isLast = index === messages.length - 1;
        
        return (
          <View 
            key={message.id}
            style={[
              styles.messageWrapper,
              !isLast && styles.groupedMessage, // Reduced spacing for grouped messages
            ]}
          >
            <MessageItem
              message={message}
              currentUserId={currentUserId}
              onReply={onReply}
              onReaction={onReaction}
              onMediaPress={onMediaPress}
            />
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  groupContainer: {
    marginBottom: 12, // Space between different senders
  },
  groupLeft: {
    alignItems: 'flex-start',
    paddingLeft: 8, // Add left padding for receiver messages to give more breathing room
  },
  groupRight: {
    alignItems: 'flex-end',
    paddingRight: 8, // Add right padding for sender messages for consistency
  },
  messageWrapper: {
    width: '100%',
  },
  groupedMessage: {
    marginBottom: 3, // Slightly more spacing for consecutive messages for better readability
  },
});

export default MessageGroup;
