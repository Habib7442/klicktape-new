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

interface MessageGroup {
  id: string;
  senderId: string;
  messages: Message[];
  timestamp: string;
}

interface MessageListItem {
  type: 'messageGroup' | 'date' | 'typing';
  id: string;
  data?: MessageGroup;
  date?: string;
  isTyping?: boolean;
  username?: string;
}

/**
 * Groups consecutive messages from the same sender within a time window
 * @param messages Array of messages to group
 * @param timeWindowMinutes Time window in minutes to group messages (default: 5)
 * @returns Array of message groups
 */
export function groupConsecutiveMessages(
  messages: Message[], 
  timeWindowMinutes: number = 5
): MessageGroup[] {
  if (messages.length === 0) return [];

  const groups: MessageGroup[] = [];
  let currentGroup: Message[] = [];
  let currentSenderId = '';
  let lastMessageTime = 0;

  messages.forEach((message, index) => {
    const messageTime = new Date(message.created_at).getTime();
    const timeDiff = (messageTime - lastMessageTime) / (1000 * 60); // in minutes

    // Start new group if:
    // 1. Different sender
    // 2. Time gap is too large
    // 3. First message
    if (
      message.sender_id !== currentSenderId ||
      timeDiff > timeWindowMinutes ||
      index === 0
    ) {
      // Save previous group if it exists
      if (currentGroup.length > 0) {
        groups.push({
          id: `group-${currentGroup[0].id}`,
          senderId: currentSenderId,
          messages: [...currentGroup],
          timestamp: currentGroup[currentGroup.length - 1].created_at,
        });
      }

      // Start new group
      currentGroup = [message];
      currentSenderId = message.sender_id;
    } else {
      // Add to current group
      currentGroup.push(message);
    }

    lastMessageTime = messageTime;
  });

  // Don't forget the last group
  if (currentGroup.length > 0) {
    groups.push({
      id: `group-${currentGroup[0].id}`,
      senderId: currentSenderId,
      messages: [...currentGroup],
      timestamp: currentGroup[currentGroup.length - 1].created_at,
    });
  }

  return groups;
}

/**
 * Creates list items with date separators and message groups
 * @param messages Array of messages
 * @param isTyping Whether someone is typing
 * @param typingUsername Username of typing user
 * @returns Array of list items ready for FlatList
 */
export function createMessageListItems(
  messages: Message[],
  isTyping: boolean = false,
  typingUsername?: string
): MessageListItem[] {
  const items: MessageListItem[] = [];
  const messageGroups = groupConsecutiveMessages(messages);
  let lastDate = '';

  messageGroups.forEach((group) => {
    const groupDate = new Date(group.timestamp).toDateString();
    
    // Add date separator if date changed
    if (groupDate !== lastDate) {
      items.push({
        type: 'date',
        id: `date-${groupDate}`,
        date: group.timestamp,
      });
      lastDate = groupDate;
    }

    // Add message group
    items.push({
      type: 'messageGroup',
      id: group.id,
      data: group,
    });
  });

  // Add typing indicator at the end if someone is typing
  if (isTyping && typingUsername) {
    items.push({
      type: 'typing',
      id: 'typing-indicator',
      isTyping: true,
      username: typingUsername,
    });
  }

  return items;
}

export type { Message, MessageGroup, MessageListItem };
