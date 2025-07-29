import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import ReplyPreview from './ReplyPreview';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  message_type?: 'text' | 'shared_post' | 'shared_reel';
}

interface MessageInputProps {
  onSendMessage: (content: string, replyToMessageId?: string) => void;
  onTypingStatusChange: (isTyping: boolean) => void;
  replyToMessage?: Message;
  onCancelReply: () => void;
  currentUserId: string;
  placeholder?: string;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTypingStatusChange,
  replyToMessage,
  onCancelReply,
  currentUserId,
  placeholder = "Type a message...",
  disabled = false,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), replyToMessage?.id);
      setMessage('');
      handleTypingStop();
      
      // Cancel reply after sending
      if (replyToMessage) {
        onCancelReply();
      }
    }
  };

  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
      onTypingStatusChange(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 2000); // Stop typing indicator after 2 seconds of inactivity
  };

  const handleTypingStop = () => {
    if (isTyping) {
      setIsTyping(false);
      onTypingStatusChange(false);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleTextChange = (text: string) => {
    setMessage(text);
    
    if (text.trim()) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }
  };

  // Clean up typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const inputContainerStyle = {
    ...styles.inputContainer,
    backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6',
    borderColor: 'transparent', // Remove border for cleaner look
  };

  const inputStyle = {
    ...styles.textInput,
    color: isDarkMode ? '#FFFFFF' : '#000000',
    fontFamily: 'Rubik-Regular',
  };

  const sendButtonStyle = {
    ...styles.sendButton,
    backgroundColor: message.trim() ? '#25D366' : (isDarkMode ? '#374151' : '#9CA3AF'),
  };

  return (
    <View style={styles.container}>
      {/* Reply Preview */}
      {replyToMessage && (
        <ReplyPreview
          replyToMessage={replyToMessage}
          currentUserId={currentUserId}
          onCancel={onCancelReply}
        />
      )}

      {/* Input Row */}
      <View style={styles.inputRow}>
        <View style={inputContainerStyle}>
          <TextInput
            ref={inputRef}
            style={inputStyle}
            value={message}
            onChangeText={handleTextChange}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={1000}
            editable={!disabled}
            className="font-rubik-regular"
          />
        </View>

        <TouchableOpacity
          style={sendButtonStyle}
          onPress={handleSend}
          disabled={!message.trim() || disabled}
          activeOpacity={0.7}
        >
          <Ionicons
            name="send"
            size={20}
            color="white"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12, // Reduced padding for more space
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12, // Account for home indicator
  },
  inputContainer: {
    flex: 1,
    borderRadius: 25, // More rounded like WhatsApp
    borderWidth: 0, // Remove border
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginRight: 8,
    minHeight: 50, // Increased height
    maxHeight: 120, // Increased max height
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'center',
    maxHeight: 96, // Allow for multiple lines
  },
  sendButton: {
    width: 50, // Slightly larger
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});

export default MessageInput;
