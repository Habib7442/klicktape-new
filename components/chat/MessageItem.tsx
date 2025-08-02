import React from 'react';
import { View, StyleSheet } from 'react-native';
import MessageBubble from './MessageBubble';

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
    sender?: {
      username: string;
    };
  };
  image_url?: string;
  post_id?: string;
  reel_id?: string;
}

interface MessageItemProps {
  message: Message;
  currentUserId: string;
  // onReply?: (message: Message) => void; // TODO: Implement reply functionality later
  onReaction?: (messageId: string, emoji: string) => void;
  onDelete?: (messageId: string) => void;
  reactions?: Array<{ emoji: string; count: number; userReacted: boolean }>;
  children?: React.ReactNode;
  onMediaPress?: (message: Message) => void;
  onScrollToMessage?: (messageId: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUserId,
  // onReply, // TODO: Implement reply functionality later
  onReaction,
  onDelete,
  reactions = [],
  children,
  onMediaPress,
  onScrollToMessage,
}) => {
  const isOwnMessage = message.sender_id === currentUserId;

  const containerStyle = [
    styles.messageContainer,
    isOwnMessage ? styles.messageRight : styles.messageLeft,
  ];

  return (
    <View style={containerStyle}>
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
        replyToMessage={message.reply_to_message?.id ? message.reply_to_message : undefined}
        currentUserId={currentUserId}
        messageId={message.id}
        onReaction={(emoji) => onReaction?.(message.id, emoji)}
        // onReply={() => onReply?.(message)} // TODO: Implement reply functionality later
        onDelete={() => onDelete?.(message.id)}
        onScrollToMessage={onScrollToMessage}
      >
        {children}
      </MessageBubble>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginBottom: 4,
    marginHorizontal: 12,
    maxWidth: '90%',
  },
  messageLeft: {
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    marginRight: 40,
  },
  messageRight: {
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
    marginLeft: 40,
  },
});

export default MessageItem;
