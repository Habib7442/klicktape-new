import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';

interface TestMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface MessageAlignmentTestProps {
  currentUserId: string;
}

const MessageAlignmentTest: React.FC<MessageAlignmentTestProps> = ({ currentUserId }) => {
  const { colors, isDarkMode } = useTheme();

  const testMessages: TestMessage[] = [
    {
      id: '1',
      sender_id: 'other_user',
      content: 'Hey there! This is a receiver message (should be on LEFT)',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      sender_id: currentUserId,
      content: 'Hi! This is a sender message (should be on RIGHT)',
      created_at: new Date().toISOString(),
    },
    {
      id: '3',
      sender_id: 'other_user',
      content: 'Another receiver message on the LEFT',
      created_at: new Date().toISOString(),
    },
    {
      id: '4',
      sender_id: currentUserId,
      content: 'Another sender message on the RIGHT',
      created_at: new Date().toISOString(),
    },
  ];

  const renderTestMessage = (message: TestMessage) => {
    const isOwnMessage = message.sender_id === currentUserId;
    
    console.log('Test Message:', {
      id: message.id,
      senderId: message.sender_id,
      currentUserId: currentUserId,
      isOwnMessage: isOwnMessage,
    });

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.messageRight : styles.messageLeft,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: isOwnMessage
                ? isDarkMode
                  ? "#404040" // Dark gray for sender
                  : "#E5E5E5" // Light gray for sender
                : isDarkMode
                  ? "#2A2A2A" // Darker gray for receiver
                  : "#F5F5F5", // Very light gray for receiver
            },
          ]}
        >
          <Text style={[styles.messageText, { color: colors.text }]}>
            {message.content}
          </Text>
          <Text style={[styles.messageInfo, { color: colors.textSecondary }]}>
            {isOwnMessage ? 'YOU (Right)' : 'THEM (Left)'} • {message.id}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Message Alignment Test
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Current User ID: {currentUserId}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Sender (You): RIGHT side • Receiver (Them): LEFT side
        </Text>
      </View>

      <ScrollView style={styles.messagesContainer}>
        {testMessages.map(renderTestMessage)}
      </ScrollView>

      <View style={[styles.legend, { backgroundColor: colors.card }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { 
            backgroundColor: isDarkMode ? "#404040" : "#E5E5E5" 
          }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>
            Your messages (Right)
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { 
            backgroundColor: isDarkMode ? "#2A2A2A" : "#F5F5F5" 
          }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>
            Their messages (Left)
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    marginBottom: 2,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: "75%",
  },
  messageLeft: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
    marginRight: "25%",
  },
  messageRight: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
    marginLeft: "25%",
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    minWidth: 100,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  messageInfo: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
  },
});

export default MessageAlignmentTest;
