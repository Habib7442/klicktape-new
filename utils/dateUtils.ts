// Date utilities for chat messages

export interface MessageWithDate {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  status: 'sent' | 'delivered' | 'read';
  is_encrypted?: boolean;
  encrypted_data?: any;
}

export interface GroupedMessage {
  type: 'date' | 'message';
  id: string;
  date?: string;
  dateLabel?: string;
  message?: MessageWithDate;
}

/**
 * Format date for display in chat
 */
export const formatChatDate = (dateString: string): string => {
  const messageDate = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time to compare dates only
  const messageDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  if (messageDateOnly.getTime() === todayOnly.getTime()) {
    return 'Today';
  } else if (messageDateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Yesterday';
  } else {
    // Check if it's within the current week
    const daysDiff = Math.floor((todayOnly.getTime() - messageDateOnly.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 7) {
      // Show day name (e.g., "Monday", "Tuesday")
      return messageDate.toLocaleDateString('en-US', { weekday: 'long' });
    } else if (messageDate.getFullYear() === today.getFullYear()) {
      // Same year, show month and day (e.g., "March 15")
      return messageDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric' 
      });
    } else {
      // Different year, show full date (e.g., "March 15, 2023")
      return messageDate.toLocaleDateString('en-US', { 
        year: 'numeric',
        month: 'long', 
        day: 'numeric' 
      });
    }
  }
};

/**
 * Get date key for grouping messages
 */
export const getDateKey = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toDateString(); // Returns format like "Mon Oct 09 2023"
};

/**
 * Group messages by date and insert date headers
 */
export const groupMessagesByDate = (messages: MessageWithDate[]): GroupedMessage[] => {
  if (!messages || messages.length === 0) {
    return [];
  }

  const grouped: GroupedMessage[] = [];
  let currentDateKey = '';

  // Sort messages by date (oldest first)
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  sortedMessages.forEach((message, index) => {
    const messageDateKey = getDateKey(message.created_at);
    
    // Add date header if this is a new date
    if (messageDateKey !== currentDateKey) {
      currentDateKey = messageDateKey;
      
      grouped.push({
        type: 'date',
        id: `date_${messageDateKey}`,
        date: messageDateKey,
        dateLabel: formatChatDate(message.created_at),
      });
    }
    
    // Add the message
    grouped.push({
      type: 'message',
      id: message.id,
      message: message,
    });
  });

  return grouped;
};

/**
 * Format time for message display
 */
export const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Check if two dates are the same day
 */
export const isSameDay = (date1: string, date2: string): boolean => {
  return getDateKey(date1) === getDateKey(date2);
};

/**
 * Get relative time (e.g., "2 minutes ago", "1 hour ago")
 */
export const getRelativeTime = (dateString: string): string => {
  const now = new Date();
  const messageDate = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - messageDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return formatChatDate(dateString);
    }
  }
};

/**
 * Check if message is from today
 */
export const isToday = (dateString: string): boolean => {
  const messageDate = new Date(dateString);
  const today = new Date();
  
  return messageDate.getDate() === today.getDate() &&
         messageDate.getMonth() === today.getMonth() &&
         messageDate.getFullYear() === today.getFullYear();
};

/**
 * Check if message is from yesterday
 */
export const isYesterday = (dateString: string): boolean => {
  const messageDate = new Date(dateString);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return messageDate.getDate() === yesterday.getDate() &&
         messageDate.getMonth() === yesterday.getMonth() &&
         messageDate.getFullYear() === yesterday.getFullYear();
};

/**
 * Format date for different contexts
 */
export const formatDateForContext = (dateString: string, context: 'chat' | 'list' | 'full' = 'chat'): string => {
  switch (context) {
    case 'chat':
      return formatChatDate(dateString);
    case 'list':
      return getRelativeTime(dateString);
    case 'full':
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    default:
      return formatChatDate(dateString);
  }
};
