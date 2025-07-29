import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  FlatList,
  View,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import MessageItem from './MessageItem';
import MessageGroup from './MessageGroup';
import DateSeparator from './DateSeparator';
import TypingIndicator from './TypingIndicator';
import { createMessageListItems, MessageListItem } from './utils/messageGrouping';

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

// MessageListItem is now imported from utils

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  onReply: (message: Message) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  isTyping?: boolean;
  typingUsername?: string;
  reactions?: Record<string, Array<{ emoji: string; count: number; userReacted: boolean }>>;
  onMediaPress?: (message: Message) => void;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onReply,
  onReaction,
  onLoadMore,
  onRefresh,
  isLoading,
  isRefreshing,
  hasMore,
  isTyping = false,
  typingUsername,
  reactions = {},
  onMediaPress,
}) => {
  const { colors } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  // Create list items with message grouping and date separators
  const listItems = useMemo(() => {
    return createMessageListItems(messages, isTyping, typingUsername);
  }, [messages, isTyping, typingUsername]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const renderItem = useCallback(({ item }: { item: MessageListItem }) => {
    switch (item.type) {
      case 'date':
        return <DateSeparator date={item.date!} />;

      case 'typing':
        return (
          <TypingIndicator
            isVisible={item.isTyping!}
            username={item.username}
          />
        );

      case 'messageGroup':
        const messageGroup = item.data!;
        return (
          <MessageGroup
            messages={messageGroup.messages}
            currentUserId={currentUserId}
            onReply={onReply}
            onReaction={onReaction}
            onMediaPress={onMediaPress}
          />
        );

      default:
        return null;
    }
  }, [currentUserId, onReply, onReaction, reactions, onMediaPress]);

  const keyExtractor = useCallback((item: MessageListItem) => item.id, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 80, // Estimated item height
    offset: 80 * index,
    index,
  }), []);

  const renderFooter = () => {
    if (!isLoading || isRefreshing) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]} className="font-rubik-regular">
          Loading more messages...
        </Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]} className="font-rubik-medium">
        No messages yet. Start the conversation!
      </Text>
    </View>
  );

  return (
    <FlatList
      ref={flatListRef}
      data={listItems}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.1}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={20}
      getItemLayout={getItemLayout}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 100,
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default MessageList;
