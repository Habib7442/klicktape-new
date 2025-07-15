import { useRef, useState, useCallback, useEffect } from 'react';
import { FlatList } from 'react-native';

interface UseSmartScrollProps {
  messages: any[];
  userId: string;
  loading?: boolean;
}

interface UseSmartScrollReturn {
  flatListRef: React.RefObject<FlatList>;
  isUserScrolling: boolean;
  isNearBottom: boolean;
  handleScroll: (event: any) => void;
  smartScrollToBottom: (animated?: boolean, force?: boolean) => void;
  scrollToBottomButtonVisible: boolean;
}

export const useSmartScroll = ({
  messages,
  userId,
  loading = false,
}: UseSmartScrollProps): UseSmartScrollReturn => {
  const flatListRef = useRef<FlatList>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageCountRef = useRef(0);

  // Check if user is near bottom of chat
  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    const threshold = 100; // pixels from bottom
    
    const nearBottom = distanceFromBottom <= threshold;
    setIsNearBottom(nearBottom);
    
    // Detect if user is actively scrolling
    setIsUserScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set user scrolling to false after they stop scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 1000);
  }, []);

  // Smart scroll to bottom - only when appropriate
  const smartScrollToBottom = useCallback((animated: boolean = true, force: boolean = false) => {
    if (!flatListRef.current) return;
    
    // Always scroll if forced (like when sending a message)
    if (force) {
      flatListRef.current.scrollToEnd({ animated });
      return;
    }
    
    // Don't auto-scroll if user is actively scrolling or not near bottom
    if (isUserScrolling && !isNearBottom) {
      console.log('🚫 Skipping auto-scroll: user is viewing older messages');
      return;
    }
    
    // Auto-scroll if user is near bottom or not actively scrolling
    if (isNearBottom || !isUserScrolling) {
      flatListRef.current.scrollToEnd({ animated });
    }
  }, [isUserScrolling, isNearBottom]);

  // Effect to handle new messages intelligently
  useEffect(() => {
    const currentMessageCount = messages.length;
    const previousMessageCount = lastMessageCountRef.current;
    
    // Only auto-scroll for new messages, not initial load
    if (currentMessageCount > previousMessageCount && previousMessageCount > 0 && !loading) {
      // Check if the new message is from the current user
      const latestMessage = messages[messages.length - 1];
      const isOwnMessage = latestMessage?.sender_id === userId;
      
      if (isOwnMessage) {
        // Always scroll for own messages
        smartScrollToBottom(true, true);
      } else {
        // Smart scroll for others' messages
        smartScrollToBottom(true, false);
      }
    }
    
    lastMessageCountRef.current = currentMessageCount;
  }, [messages, loading, userId, smartScrollToBottom]);

  // Cleanup scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Determine if scroll to bottom button should be visible
  const scrollToBottomButtonVisible = !isNearBottom && !isUserScrolling;

  return {
    flatListRef,
    isUserScrolling,
    isNearBottom,
    handleScroll,
    smartScrollToBottom,
    scrollToBottomButtonVisible,
  };
};

export default useSmartScroll;
