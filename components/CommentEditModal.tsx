import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Modal from "react-native-modal";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/src/context/ThemeContext";

interface CommentEditModalProps {
  visible: boolean;
  onClose: () => void;
  comment: {
    id: string;
    content: string;
    mentions?: Array<{ user_id: string; username: string }>;
  };
  entityType: "post" | "reel";
  onCommentUpdated: (updatedComment: {
    id: string;
    content: string;
    edited_at: string;
    is_edited: boolean;
    mentions: Array<{ user_id: string; username: string }>;
  }) => void;
}

const CommentEditModal: React.FC<CommentEditModalProps> = ({
  visible,
  onClose,
  comment,
  entityType,
  onCommentUpdated,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [editedContent, setEditedContent] = useState("");

  // Memoize colors to prevent unnecessary re-renders
  const memoizedColors = useMemo(() => ({
    text: isDarkMode ? '#fff' : '#000',
    secondary: isDarkMode ? '#999' : '#666',
    background: isDarkMode ? '#000' : '#fff',
    inputBg: isDarkMode ? "#1a1a1a" : "#f5f5f5",
    border: isDarkMode ? "#333" : "#ddd",
    mentionBg: isDarkMode ? '#222' : '#fff',
    primary: '#007AFF'
  }), [isDarkMode]);
  const [mentionedUsers, setMentionedUsers] = useState<
    Array<{ id: string; username: string }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMentionsList, setShowMentionsList] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<
    Array<{ id: string; username: string }>
  >([]);
  const [searchUsers, setSearchUsers] = useState<
    Array<{ id: string; username: string }>
  >([]);

  const mentionStartIndex = useRef(-1);
  const inputRef = useRef<TextInput>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize content and mentions when modal opens
  useEffect(() => {
    if (visible && comment) {
      setEditedContent(comment.content);
      setMentionedUsers(
        comment.mentions?.map((m) => ({
          id: m.user_id,
          username: m.username,
        })) || []
      );
    }
  }, [visible, comment]);

  // Search users for mentions
  const searchUsersForMentions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchUsers([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username")
        .ilike("username", `%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchUsers(data || []);
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchUsers([]);
    }
  }, []);

  // Handle text change with mention detection
  const handleTextChange = useCallback(
    (text: string) => {
      setEditedContent(text);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Check for mentions
      const lastAtIndex = text.lastIndexOf("@");
      if (lastAtIndex !== -1) {
        const textAfterAt = text.slice(lastAtIndex + 1);
        const spaceIndex = textAfterAt.indexOf(" ");
        const currentMention =
          spaceIndex === -1 ? textAfterAt : textAfterAt.slice(0, spaceIndex);

        if (currentMention.length > 0 && spaceIndex === -1) {
          mentionStartIndex.current = lastAtIndex;
          setShowMentionsList(true);

          // Debounce search with shorter delay for better UX
          searchTimeoutRef.current = setTimeout(() => {
            searchUsersForMentions(currentMention);
          }, 150);
        } else {
          setShowMentionsList(false);
          mentionStartIndex.current = -1;
        }
      } else {
        setShowMentionsList(false);
        mentionStartIndex.current = -1;
      }

      // Update filtered users
      setFilteredUsers(searchUsers);
    },
    [searchUsers, searchUsersForMentions]
  );

  // Handle mention selection
  const handleMentionSelect = useCallback(
    (selectedUser: { id: string; username: string }) => {
      const beforeMention = editedContent.slice(0, mentionStartIndex.current);
      const afterAtSymbol = editedContent.slice(mentionStartIndex.current + 1);
      const spaceIndex = afterAtSymbol.indexOf(" ");
      const mentionEnd =
        spaceIndex === -1
          ? editedContent.length
          : mentionStartIndex.current + 1 + spaceIndex;
      const afterMention = editedContent.slice(mentionEnd);

      const updatedContent =
        `${beforeMention}@${selectedUser.username} ${afterMention}`.trim();

      setEditedContent(updatedContent);
      setMentionedUsers((prev) => {
        const exists = prev.some((user) => user.id === selectedUser.id);
        return exists ? prev : [...prev, selectedUser];
      });
      setShowMentionsList(false);
      mentionStartIndex.current = -1;

      // Immediate focus without delay for better performance
      inputRef.current?.focus();
    },
    [editedContent, mentionedUsers]
  );

  // Handle save
  const handleSave = async () => {
    if (!editedContent.trim()) {
      Alert.alert("Error", "Comment cannot be empty");
      return;
    }

    if (editedContent.trim() === comment.content.trim()) {
      Alert.alert("No Changes", "No changes were made to the comment");
      return;
    }

    setIsSubmitting(true);
    try {
      const table = entityType === "reel" ? "reel_comments" : "comments";
      const mentionData = mentionedUsers.map((user) => ({
        user_id: user.id,
        username: user.username,
      }));

      const { data, error } = await supabase.rpc("update_comment_content", {
        comment_id_param: comment.id,
        new_content: editedContent.trim(),
        new_mentions: mentionData,
        table_name: table,
      });

      if (error) throw error;

      // Call the callback with updated comment data
      const updatedData = data as any;
      onCommentUpdated({
        id: updatedData.id,
        content: updatedData.content,
        edited_at: updatedData.edited_at,
        is_edited: updatedData.is_edited,
        mentions: updatedData.mentions || [],
      });

      onClose();
    } catch (error: any) {
      console.error("Error updating comment:", error);
      Alert.alert("Error", error.message || "Failed to update comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      style={styles.modal}
      backdropOpacity={0.5}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={300}
      animationOutTiming={250}
      backdropTransitionInTiming={300}
      backdropTransitionOutTiming={250}
      useNativeDriverForBackdrop={true}
      hideModalContentWhileAnimating={true}
      avoidKeyboard={true}
    >
      <View style={[styles.container, { backgroundColor: memoizedColors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: memoizedColors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={[styles.cancelText, { color: memoizedColors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: memoizedColors.text }]}>
            Edit Comment
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, { opacity: isSubmitting ? 0.5 : 1 }]}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={memoizedColors.primary} />
            ) : (
              <Text style={[styles.saveText, { color: memoizedColors.primary }]}>
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput,
              {
                color: memoizedColors.text,
                backgroundColor: memoizedColors.inputBg,
                borderColor: memoizedColors.border,
              },
            ]}
            value={editedContent}
            onChangeText={handleTextChange}
            placeholder="Edit your comment..."
            placeholderTextColor={memoizedColors.secondary}
            multiline
            autoFocus
            maxLength={2000}
          />

          {/* Character count */}
          <Text style={[styles.charCount, { color: memoizedColors.secondary }]}>
            {editedContent.length}/2000
          </Text>

          {/* Mentions list */}
          {showMentionsList && filteredUsers.length > 0 && (
            <View
              style={[
                styles.mentionsContainer,
                {
                  backgroundColor: memoizedColors.mentionBg,
                  borderColor: memoizedColors.border,
                },
              ]}
            >
              {filteredUsers.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.mentionItem,
                    { borderBottomColor: memoizedColors.border },
                  ]}
                  onPress={() => handleMentionSelect(user)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.mentionText, { color: memoizedColors.primary }]}
                  >
                    @{user.username}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: "60%",
    maxHeight: "85%",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  cancelButton: {
    padding: 5,
  },
  cancelText: {
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  saveButton: {
    padding: 5,
  },
  saveText: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 150,
    maxHeight: 250,
    textAlignVertical: "top",
  },
  charCount: {
    textAlign: "right",
    marginTop: 5,
    fontSize: 12,
  },
  mentionsContainer: {
    position: "absolute",
    bottom: "100%",
    left: 20,
    right: 20,
    borderRadius: 10,
    maxHeight: 150,
    marginBottom: 5,
    borderWidth: 1,
    zIndex: 9999,
    elevation: 10,
  },
  mentionItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  mentionText: {
    fontSize: 14,
  },
});

export default CommentEditModal;
