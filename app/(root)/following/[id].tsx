import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { messagesAPI } from "@/lib/messagesApi";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "@/src/context/ThemeContext";
import { messageStatusManager } from "@/lib/messageStatusManager";
import { useSocketChat } from "@/hooks/useSocketChat";
import SharedPostMessage from "@/components/SharedPostMessage";
import SharedReelMessage from "@/components/SharedReelMessage";
import CachedImage from "@/components/CachedImage";
import LazyQueryProvider from "@/lib/query/LazyQueryProvider";
import { useChatUserProfile, useChatMessages, useSendMessage, useMarkMessagesAsRead, useSendReply, useReactionMutation, useMessageReactions } from "@/lib/query/hooks/useChatQuery";
import { useQueryClient } from '@tanstack/react-query';
import {
  selectSelectedMessage,
  selectMessageHighlight,
  selectOptimisticReaction,
  clearMessageSelection,
  addOptimisticReaction,
  removeOptimisticReaction
} from "@/src/store/slices/chatUISlice";
import WhatsAppEmojiPicker from "@/components/chat/WhatsAppEmojiPicker";
import MessageOverlay from "@/components/chat/MessageOverlay";
import { RootState } from "@/src/store/store";
import { queryKeys } from "@/lib/query/queryKeys";
import ReplyPreview from "@/components/chat/ReplyPreview";
import SwipeableMessage from "@/components/chat/SwipeableMessage";
import LongPressableMessage from "@/components/chat/LongPressableMessage";
import EmojiReactionPicker from "@/components/chat/EmojiReactionPicker";
import ReactionBadge from "@/components/chat/ReactionBadge";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  is_read: boolean;
  status: "sent" | "delivered" | "read";
  delivered_at?: string;
  read_at?: string;
  message_type?: "text" | "shared_post" | "shared_reel";
  reply_to_message_id?: string;
  reply_to_message?: {
    id: string;
    content: string;
    sender_id: string;
    message_type?: string;
  };
}

interface MessageCache {
  [key: string]: {
    messages: Message[];
    lastUpdated: number;
  };
}

// Component to fetch and display reactions for a message with optimistic updates
const MessageReactions: React.FC<{
  messageId: string;
  currentUserId: string;
  onReactionPress: (emoji: string) => void;
}> = ({ messageId, currentUserId, onReactionPress }) => {
  const { data: reactions = [], isLoading } = useMessageReactions(messageId);
  const optimisticReaction = useSelector(selectOptimisticReaction(messageId));

  // Combine real reactions with optimistic reaction
  let displayReactions = reactions ? [...reactions] : [];
  if (optimisticReaction && reactions) {
    // Add optimistic reaction if it doesn't already exist
    const existingReaction = reactions.find((r: any) =>
      r?.emoji === optimisticReaction.emoji && r?.user_id === currentUserId
    );
    if (!existingReaction) {
      displayReactions.push({
        id: 'optimistic',
        emoji: optimisticReaction.emoji,
        user_id: currentUserId,
        created_at: new Date().toISOString(),
      } as any);
    }
  }

  if (isLoading || displayReactions.length === 0) {
    return null;
  }

  return (
    <ReactionBadge
      reactions={displayReactions as any}
      currentUserId={currentUserId}
      onReactionPress={onReactionPress}
    />
  );
};

// Wrapper component with LazyQueryProvider
export default function ChatScreen() {
  return (
    <LazyQueryProvider>
      <ChatScreenContent />
    </LazyQueryProvider>
  );
}

// Main chat screen component
function ChatScreenContent() {
  const { id: recipientId } = useLocalSearchParams();
  const recipientIdString = Array.isArray(recipientId) ? recipientId[0] : recipientId;
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [recipientTyping, setRecipientTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("connecting");

  // Reply state
  const [replyToMessage, setReplyToMessage] = useState<any>(null);

  // Redux selectors for emoji reactions
  const selectedMessage = useSelector(selectSelectedMessage);
  const messageHighlight = useSelector(selectMessageHighlight);

  // TanStack Query hooks
  const { data: recipientData, isLoading: profileLoading, error: profileError } = useChatUserProfile(recipientIdString || '');
  const {
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error: messagesError
  } = useChatMessages(userId || '', recipientIdString || '');
  const sendMessageMutation = useSendMessage();
  const sendReplyMutation = useSendReply();
  const reactionMutation = useReactionMutation();
  const markAsReadMutation = useMarkMessagesAsRead();
  const queryClient = useQueryClient();

  // Extract messages from infinite query data
  const messages = messagesData?.pages.flatMap(page => page.messages) || [];
  const loading = profileLoading || messagesLoading;

  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmountedRef = useRef(false);
  const dispatch = useDispatch();
  const { isDarkMode, colors } = useTheme();

  // Generate chat ID for real-time subscription
  const chatId = userId && recipientIdString ? [userId, recipientIdString].sort().join("-") : "";



  // Socket.IO real-time chat
  const {
    isConnected,
    connectionStatus: realtimeStatus,
    sendMessage: sendSocketMessage,
    sendTypingStatus,
    markAsDelivered,
    markAsRead,
  } = useSocketChat({
    userId: userId || "",
    chatId,
    onNewMessage: (message: any) => {
      console.log('🔥 Socket.IO: New message received!', message.id);

      // Invalidate messages query to refetch latest messages
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.messages(recipientIdString || '')
      });

      // Also invalidate conversations list
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.conversations()
      });

      // Mark as delivered and read if user is receiver
      if (message.receiver_id === userId && message.sender_id !== userId) {
        // Mark as delivered immediately
        if (markAsDelivered) {
          markAsDelivered(message.id);
        }

        // Mark as read after a short delay (simulating user seeing the message)
        setTimeout(() => {
          if (markAsRead) {
            markAsRead(message.id);
          }
        }, 1000);
      }
    },
    onMessageStatusUpdate: ({ messageId, status, isRead }) => {
      console.log('🔥 Socket.IO: Message status update!', { messageId, status, isRead });

      // Invalidate messages query to refetch with updated status
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.messages(recipientIdString || '')
      });
    },
    onTypingUpdate: ({ userId: typingUserId, isTyping }) => {
      if (typingUserId !== userId) {
        setRecipientTyping(isTyping);
      }
    },
  });

  // Define solid colors based on theme (no gradients)
  const backgroundColor = isDarkMode ? "#000000" : "#FFFFFF";

  // Note: Message caching is now handled by TanStack Query

  // Handle load more messages (pagination)
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    if (!userId || !recipientIdString) {
      Alert.alert("Error", "Cannot send message: Missing user or recipient ID");
      return;
    }

    if (sending) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      // Stop typing indicator
      setIsTyping(false);
      if (sendTypingStatus) {
        sendTypingStatus(false);
      }

      // Send message using TanStack Query mutation
      await sendMessageMutation.mutateAsync({
        senderId: userId,
        receiverId: recipientIdString,
        content: messageContent,
        messageType: 'text'
      });

      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error: any) {
      console.error("Send message error:", error);
      Alert.alert("Error", error.message || "Failed to send message");
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleTyping = useCallback(async () => {
    if (!userId || !recipientIdString) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (!isTyping) {
      setIsTyping(true);
      // Send typing status via Socket.IO
      sendTypingStatus(true);
    }

    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false);
      sendTypingStatus(false);
    }, 3000);
  }, [userId, recipientIdString, isTyping, sendTypingStatus]);

  // Reply handlers
  const handleReplyToMessage = useCallback((message: any) => {
    setReplyToMessage(message);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyToMessage(null);
  }, []);

  const sendReply = useCallback(async () => {
    if (!newMessage.trim() || !replyToMessage || !userId || !recipientIdString) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      await sendReplyMutation.mutateAsync({
        senderId: userId,
        receiverId: recipientIdString,
        content: messageContent,
        replyToMessageId: replyToMessage.id,
        messageType: 'text'
      });

      setReplyToMessage(null); // Clear reply after sending

      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error: any) {
      console.error("Send reply error:", error);
      Alert.alert("Error", error.message || "Failed to send reply");
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
    }
  }, [newMessage, replyToMessage, userId, recipientIdString, sendReplyMutation]);

  // New WhatsApp-style emoji reaction handlers
  const handleEmojiSelect = useCallback(async (emoji: string) => {
    if (!selectedMessage.messageId || !userId) return;

    // Instant optimistic update
    dispatch(addOptimisticReaction({
      messageId: selectedMessage.messageId,
      emoji
    }));

    // Close picker immediately for smooth UX
    dispatch(clearMessageSelection());

    try {
      await reactionMutation.mutateAsync({
        messageId: selectedMessage.messageId,
        userId,
        emoji
      });

      // Remove optimistic reaction after successful API call
      dispatch(removeOptimisticReaction(selectedMessage.messageId));
    } catch (error: any) {
      console.error("Reaction error:", error);
      // Remove optimistic reaction on error
      dispatch(removeOptimisticReaction(selectedMessage.messageId));
      Alert.alert("Error", error.message || "Failed to add reaction");
    }
  }, [selectedMessage.messageId, userId, reactionMutation, dispatch]);

  const handleCloseEmojiPicker = useCallback(() => {
    dispatch(clearMessageSelection());
  }, [dispatch]);

  useEffect(() => {
    const setupChat = async () => {
      try {
        if (!supabase) {
          Alert.alert("Error", "Supabase client not initialized");
          router.replace("/sign-in");
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert("Error", "User not authenticated. Please log in.");
          router.replace("/sign-in");
          return;
        }

        if (!recipientIdString || typeof recipientIdString !== "string") {
          Alert.alert("Error", "Invalid recipient ID");
          router.back();
          return;
        }

        setUserId(user.id);

        // Start delivery tracking for this chat
        messageStatusManager.startDeliveryTracking();
      } catch (error) {
        console.error("Chat setup error:", error);
        Alert.alert("Error", "Failed to set up chat: " + (error as Error).message);
        router.back();
      }
    };

    isUnmountedRef.current = false;
    setupChat();

    return () => {
      isUnmountedRef.current = true;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // Cleanup message status manager
      messageStatusManager.cleanup();
    };
  }, [recipientIdString]);

  // Note: Periodic status checks removed - TanStack Query handles data freshness

  // Mark messages as read when chat is first loaded
  useEffect(() => {
    if (userId && recipientIdString && messages.length > 0) {
      // Only mark as read if there are unread messages from the other user
      const unreadFromOther = messages.filter((m: any) =>
        m?.sender_id === recipientIdString &&
        m?.receiver_id === userId &&
        !m?.is_read
      );

      if (unreadFromOther.length > 0) {
        markAsReadMutation.mutate({
          senderId: recipientIdString,
          receiverId: userId
        });
      }
    }
  }, [userId, recipientIdString, messages.length]); // Only run when these change

  // Socket.IO real-time is now handled by useSocketChat hook above
  // No need for Supabase real-time subscriptions




  // Effect to scroll to bottom only when new messages are added (not on every change)
  const previousMessageCount = useRef(0);
  useEffect(() => {
    if (messages.length > previousMessageCount.current && !loading && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    previousMessageCount.current = messages.length;
  }, [messages.length, loading]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        // Only scroll to bottom if user is already at the bottom
        // This prevents interrupting manual scrolling
      }
    );

    const keyboardWillShowListener = Platform.OS === 'ios'
      ? Keyboard.addListener("keyboardWillShow", () => {
          // Ensure input stays focused and visible
          if (textInputRef.current) {
            setTimeout(() => {
              textInputRef.current?.focus();
            }, 100);
          }
        })
      : { remove: () => {} };

    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        // Keep input focused but don't auto-scroll
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardWillShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const renderMessage = useCallback(({ item }: { item: any }) => {
    const isOwnMessage = item?.sender_id === userId;

    // Handle shared post messages
    if (item?.message_type === 'shared_post') {
      try {
        const sharedPostData = messagesAPI.parseMessageContent(item?.content, item?.message_type);

        return (
          <View
            style={[
              styles.messageContainer,
              isOwnMessage ? styles.messageRight : styles.messageLeft,
            ]}
          >
            <SharedPostMessage
              sharedPostData={sharedPostData}
              isOwnMessage={isOwnMessage}
            />
            <View style={styles.messageFooter}>
              <Text
                style={[
                  isOwnMessage
                    ? styles.userTimestamp
                    : styles.otherTimestamp,
                  { color: colors.textTertiary }
                ]}
              >
                {new Date(item.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              {isOwnMessage && (
                <View style={styles.statusIconContainer}>
                  {item.status === "read" ? (
                    <Feather
                      name="check-circle"
                      size={14}
                      color={isDarkMode ? '#4CAF50' : '#2196F3'}
                      style={styles.statusIcon}
                    />
                  ) : item.status === "delivered" ? (
                    <View style={styles.doubleCheck}>
                      <Feather
                        name="check"
                        size={12}
                        color={colors.textSecondary}
                        style={[styles.statusIcon, { marginRight: -8 }]}
                      />
                      <Feather
                        name="check"
                        size={12}
                        color={colors.textSecondary}
                        style={styles.statusIcon}
                      />
                    </View>
                  ) : (
                    <Feather
                      name="clock"
                      size={12}
                      color={colors.textSecondary}
                      style={styles.statusIcon}
                    />
                  )}
                </View>
              )}
            </View>
          </View>
        );
      } catch (error) {
        console.error('Error parsing shared post message:', error);
        // Fallback to regular text message
      }
    }

    // Handle shared reel messages
    if (item.message_type === 'shared_reel') {
      try {
        const sharedReelData = messagesAPI.parseMessageContent(item.content, item.message_type);

        return (
          <View
            style={[
              styles.messageContainer,
              isOwnMessage ? styles.messageRight : styles.messageLeft,
            ]}
          >
            <SharedReelMessage
              sharedReelData={sharedReelData}
              isOwnMessage={isOwnMessage}
            />
            <View style={styles.messageFooter}>
              <Text
                style={[
                  isOwnMessage
                    ? styles.userTimestamp
                    : styles.otherTimestamp,
                  { color: colors.textTertiary }
                ]}
              >
                {new Date(item.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              {isOwnMessage && (
                <View style={styles.statusIconContainer}>
                  {item.status === "read" ? (
                    <Feather
                      name="check-circle"
                      size={14}
                      color={isDarkMode ? '#4CAF50' : '#2196F3'}
                      style={styles.statusIcon}
                    />
                  ) : item.status === "delivered" ? (
                    <View style={styles.doubleCheck}>
                      <Feather
                        name="check"
                        size={12}
                        color={colors.textSecondary}
                        style={[styles.statusIcon, { marginRight: -8 }]}
                      />
                      <Feather
                        name="check"
                        size={12}
                        color={colors.textSecondary}
                        style={styles.statusIcon}
                      />
                    </View>
                  ) : (
                    <Feather
                      name="clock"
                      size={12}
                      color={colors.textSecondary}
                      style={styles.statusIcon}
                    />
                  )}
                </View>
              )}
            </View>
          </View>
        );
      } catch (error) {
        console.error('Error parsing shared reel message:', error);
        // Fallback to regular text message
      }
    }

    // WhatsApp-style message bubble with requested colors
    const bubbleStyle = {
      ...styles.messageBubble,
      backgroundColor: isOwnMessage
        ? "#128C7E" // WhatsApp green for sender (darker shade)
        : isDarkMode
          ? "#2A2A2A" // Dark gray for receiver in dark mode
          : "#FFFFFF", // White for receiver in light mode
      borderRadius: 18,
      borderBottomRightRadius: isOwnMessage ? 4 : 18, // WhatsApp tail effect
      borderBottomLeftRadius: isOwnMessage ? 18 : 4,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
      borderWidth: 0, // Remove border for clean WhatsApp look
    };

    return (
      <SwipeableMessage
        onSwipeLeft={() => handleReplyToMessage(item)}
        onSwipeRight={() => handleReplyToMessage(item)}
        enabled={true}
        isOwnMessage={item.sender_id === userId}
      >
        <LongPressableMessage
          messageId={item.id}
          enabled={true}
        >
          <View
            style={[
              styles.messageContainer,
              isOwnMessage ? styles.messageRight : styles.messageLeft,
            ]}
          >
        <View style={bubbleStyle}>
          {/* Reply indicator */}
          {item.reply_to_message && (
            <View style={[styles.replyIndicator, {
              borderLeftColor: isOwnMessage ? '#25D366' : colors.primary,
              backgroundColor: isOwnMessage ? 'rgba(37, 211, 102, 0.1)' : 'rgba(0, 0, 0, 0.05)'
            }]}>
              <Text style={[styles.replyToText, {
                color: isOwnMessage ? '#128C7E' : colors.textSecondary
              }]}>
                Replying to {item.reply_to_message.sender_id === userId ? 'yourself' : 'other user'}
              </Text>
              <Text style={[styles.replyContent, {
                color: isOwnMessage ? '#128C7E' : colors.textSecondary
              }]} numberOfLines={1}>
                {item.reply_to_message.content}
              </Text>
            </View>
          )}

          <Text
            style={[
              styles.messageText,
              {
                color: isOwnMessage
                  ? "#FFFFFF" // White text on green background
                  : colors.text,
              },
            ]}
          >
            {item.content || item.encrypted_content}
          </Text>

          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.timestamp,
                {
                  color: isOwnMessage
                    ? "rgba(255, 255, 255, 0.7)" // White with opacity on green
                    : colors.textTertiary,
                },
              ]}
            >
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            {isOwnMessage && (
              <View style={styles.statusIconContainer}>
                {item.status === "read" ? (
                  <Feather
                    name="check-circle"
                    size={14}
                    color="#FFFFFF"
                    style={styles.statusIcon}
                  />
                ) : item.status === "delivered" ? (
                  <View style={styles.doubleCheck}>
                    <Feather
                      name="check"
                      size={12}
                      color="rgba(255, 255, 255, 0.7)"
                      style={[styles.statusIcon, { marginRight: -8 }]}
                    />
                    <Feather
                      name="check"
                      size={12}
                      color="rgba(255, 255, 255, 0.7)"
                      style={styles.statusIcon}
                    />
                  </View>
                ) : (
                  <Feather
                    name="clock"
                    size={12}
                    color="rgba(255, 255, 255, 0.7)"
                    style={styles.statusIcon}
                  />
                )}
              </View>
            )}
          </View>

          {/* Reaction Badge with actual reactions */}
          <MessageReactions
            messageId={item.id}
            currentUserId={userId || ''}
            onReactionPress={(emoji) => {
              setSelectedMessageForReaction(item.id);
              handleEmojiSelect(emoji);
            }}
          />
        </View>
          </View>
        </LongPressableMessage>
      </SwipeableMessage>
    );
  }, [userId, isDarkMode, colors]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: "#000000" }]}>
      <View style={[styles.container, { backgroundColor: "#000000" }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          style={styles.keyboardAvoidingView}
          enabled
        >
          <View style={styles.content}>
            <View style={[styles.header, {
              borderBottomColor: `rgba(${isDarkMode ? '255, 255, 255' : '0, 0, 0'}, 0.1)`,
              backgroundColor: "#000000"
            }]}>
              <TouchableOpacity onPress={() => router.back()}>
                <Feather name="arrow-left" size={24} color={isDarkMode ? "#808080" : "#606060"} />
              </TouchableOpacity>

              {recipientData ? (
                <TouchableOpacity
                  style={styles.headerUserInfo}
                  onPress={() => router.push(`/userProfile/${recipientData.id}`)}
                >
                  <CachedImage
                    uri={recipientData.avatar_url || "https://via.placeholder.com/40"}
                    style={styles.headerAvatar}
                    showLoader={true}
                    fallbackUri="https://via.placeholder.com/40"
                  />
                  <View style={styles.headerTextContainer}>
                    <Text className="font-rubik-bold" style={[styles.headerUsername, { color: colors.text }]}>
                      {recipientData.username}
                    </Text>
                    <Text className="font-rubik-medium" style={[styles.headerStatus, { color: colors.textSecondary }]}>
                      {realtimeStatus === 'connected' ? 'Online' :
                       realtimeStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.headerTitle, { color: colors.text }]}>Chat</Text>
              )}

              <View style={styles.connectionStatus}>
                <View style={[
                  styles.connectionDot,
                  {
                    backgroundColor: realtimeStatus === 'connected' ? '#4CAF50' :
                                   realtimeStatus === 'connecting' ? '#FF9800' : '#F44336'
                  }
                ]} />
              </View>
            </View>

            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (profileError || messagesError) ? (
              <View style={styles.center}>
                <Text className="font-rubik-medium" style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Failed to load chat. Please try again.
                </Text>
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: colors.primary }]}
                  onPress={() => router.replace(`/chat/${recipientIdString}`)}
                >
                  <Text className="font-rubik-bold" style={[styles.retryText, { color: colors.background }]}>
                    Retry
                  </Text>
                </TouchableOpacity>
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.center}>
                <Text className="font-rubik-medium" style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No messages yet. Start the conversation!
                </Text>
              </View>
            ) : (
              <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  renderItem={renderMessage}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={[styles.messageList, {
                    justifyContent: 'flex-end',
                    flexGrow: 1
                  }]}
                  style={styles.flatList}
                  keyboardShouldPersistTaps="always"
                  inverted={false}
                  initialNumToRender={25}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  removeClippedSubviews={Platform.OS === "android"}
                  maintainVisibleContentPosition={{
                    minIndexForVisible: 0,
                    autoscrollToTopThreshold: 10
                  }}
                  // Pagination for loading more messages
                  onEndReached={handleLoadMore}
                  onEndReachedThreshold={0.1}
                  ListHeaderComponent={() =>
                    isFetchingNextPage ? (
                      <View style={styles.loadingMore}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text className="font-rubik-medium" style={[styles.loadingText, { color: colors.textSecondary }]}>
                          Loading more messages...
                        </Text>
                      </View>
                    ) : null
                  }
                />
              </TouchableWithoutFeedback>
            )}

            {recipientTyping && (
              <View style={[styles.typingIndicator, {
                backgroundColor: "#000000"
              }]}>
                <Text style={[styles.typingText, { color: colors.textSecondary }]}>User is typing...</Text>
              </View>
            )}

            {/* Reply Preview */}
            {replyToMessage && (
              <ReplyPreview
                replyToMessage={replyToMessage}
                currentUserId={userId || ''}
                onCancel={handleCancelReply}
              />
            )}

            <View style={[styles.inputContainer, {
              borderTopColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)',
              backgroundColor: "#000000"
            }]}>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={textInputRef}
                  style={[styles.textInput, {
                    backgroundColor: colors.input,
                    borderColor: colors.inputBorder,
                    color: colors.text
                  }]}
                  placeholder="Type a message..."
                  placeholderTextColor={colors.textTertiary}
                  value={newMessage}
                  onChangeText={(text) => {
                    setNewMessage(text);
                    handleTyping();
                  }}
                  multiline
                />
                <TouchableOpacity
                  onPress={replyToMessage ? sendReply : sendMessage}
                  style={[styles.sendButton, {
                    backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
                    borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.4)' : 'rgba(128, 128, 128, 0.3)'
                  }]}
                >
                  <Feather name="send" size={20} color={isDarkMode ? '#808080' : '#606060'} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Message Overlay for highlighting selected message */}
        <MessageOverlay
          visible={messageHighlight.isHighlighted}
          messagePosition={selectedMessage.position}
          messageId={messageHighlight.messageId}
        />

        {/* WhatsApp-style Emoji Reaction Picker */}
        <WhatsAppEmojiPicker
          visible={selectedMessage.isVisible}
          messagePosition={selectedMessage.position}
          onEmojiSelect={handleEmojiSelect}
          onClose={handleCloseEmojiPicker}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
  },
  messagesContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Rubik-Bold",
    flex: 1,
    marginLeft: 16,
  },
  headerUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginLeft: 16,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  headerUsername: {
    fontSize: 18,
    fontFamily: "Rubik-Bold",
  },
  headerStatus: {
    fontSize: 14,
    fontFamily: "Rubik-Medium",
    marginTop: 2,
  },
  connectionWarning: {
    fontSize: 14,
    fontFamily: "Rubik-Medium",
    color: "rgba(255, 85, 85, 0.8)",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  flatList: {
    flex: 1,
  },
  messageList: {
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 12, // Increased horizontal padding for equal spacing
    flexGrow: 1,
    justifyContent: 'flex-end', // This pushes content to the bottom
  },
  messageContainer: {
    marginBottom: 2, // Reduced spacing between messages for WhatsApp style
    marginHorizontal: 8, // Slightly more horizontal margin
    maxWidth: "80%", // WhatsApp-style width constraint
    borderRadius: 18,
  },
  messageLeft: {
    alignItems: "flex-start",
    alignSelf: "flex-start", // Ensure left alignment
    marginRight: "auto", // Push to the left
  },
  messageRight: {
    alignItems: "flex-end",
    alignSelf: "flex-end", // Ensure right alignment
    marginLeft: "auto", // Push to the right
  },
  messageBubble: {
    padding: 8, // Slightly less padding
    paddingHorizontal: 12, // More horizontal padding
    paddingBottom: 6, // Less bottom padding for WhatsApp style
    minWidth: 80, // Minimum width for small messages
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  username: {
    fontSize: 12,
    fontFamily: "Rubik-Medium",
  },
  messageText: {
    fontSize: 16,
    fontFamily: "Rubik-Regular", // WhatsApp uses a regular font
    lineHeight: 22, // Better line height for readability
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end", // Right align the timestamp and status
    marginTop: 2, // Less top margin
  },
  timestamp: {
    fontSize: 11, // Smaller timestamp like WhatsApp
    fontFamily: "Rubik-Regular",
    marginRight: 4,
    alignSelf: "flex-end", // Align to bottom right
  },
  statusIcon: {
    marginLeft: 4,
  },
  statusIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  doubleCheck: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    padding: 16,
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 24,
    paddingTop: 16,
    borderTopWidth: 1,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'stretch',
    backgroundColor: 'transparent',
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  textInput: {
    flex: 1,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    marginRight: 12,
    maxHeight: 120,
    minHeight: 44,
    borderWidth: 1,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  typingIndicator: {
    padding: 10,
    alignItems: "flex-start",
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  typingText: {
    fontSize: 14,
    fontFamily: "Rubik-Medium",
    fontStyle: "italic",
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Rubik-Medium",
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryText: {
    fontSize: 16,
    fontFamily: "Rubik-Bold",
  },
  replyIndicator: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginBottom: 8,
    paddingVertical: 4,
  },
  replyToText: {
    fontSize: 12,
    fontFamily: "Rubik-Medium",
    marginBottom: 2,
  },
  replyContent: {
    fontSize: 13,
    fontFamily: "Rubik-Regular",
    fontStyle: 'italic',
  },
});