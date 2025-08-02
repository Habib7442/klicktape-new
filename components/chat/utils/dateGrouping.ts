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

export interface MessageListItem {
  type: 'message' | 'typing' | 'date';
  id: string;
  message?: Message;
  isTyping?: boolean;
  username?: string;
  date?: string;
}

/**
 * Groups messages by date and creates list items with date separators
 */
export const groupMessagesByDate = (
  messages: Message[],
  isTyping?: boolean,
  typingUsername?: string
): MessageListItem[] => {
  const items: MessageListItem[] = [];
  
  // Deduplicate messages by ID first
  const uniqueMessages = messages.filter((message, index, arr) =>
    arr.findIndex(m => m.id === message.id) === index
  );

  // Sort messages by date (oldest first for proper grouping)
  const sortedMessages = [...uniqueMessages].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let currentDate = '';

  sortedMessages.forEach((message) => {
    const messageDate = new Date(message.created_at);
    const messageDateString = messageDate.toDateString(); // "Mon Jan 01 2024"

    // Add date separator if this is a new date
    if (messageDateString !== currentDate) {
      items.push({
        type: 'date',
        id: `date-${messageDateString}`,
        date: message.created_at,
      });
      currentDate = messageDateString;
    }

    // Add the message
    items.push({
      type: 'message',
      id: message.id,
      message,
    });
  });

  // Add typing indicator if needed (always at the end)
  if (isTyping && typingUsername) {
    items.push({
      type: 'typing',
      id: 'typing-indicator',
      isTyping: true,
      username: typingUsername,
    });
  }

  return items;
};

/**
 * Checks if two dates are on the same day
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Gets a readable date string for grouping
 */
export const getDateGroupKey = (date: Date): string => {
  return date.toDateString(); // "Mon Jan 01 2024"
};
