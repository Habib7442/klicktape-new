import React, { useState } from "react";
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/src/context/ThemeContext";

interface CommentPinButtonProps {
  commentId: string;
  entityId: string;
  entityType: "post" | "reel";
  entityOwnerId: string;
  currentUserId: string;
  isPinned: boolean;
  onPinToggled: (commentId: string, isPinned: boolean, pinnedAt?: string, pinnedBy?: string) => void;
  style?: any;
}

const CommentPinButton: React.FC<CommentPinButtonProps> = ({
  commentId,
  entityId,
  entityType,
  entityOwnerId,
  currentUserId,
  isPinned,
  onPinToggled,
  style,
}) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  // Check if current user can pin comments (must be entity owner)
  const canPin = currentUserId === entityOwnerId;

  // Debug logging
  console.log('🔍 CommentPinButton Debug:', {
    currentUserId,
    entityOwnerId,
    canPin,
    commentId,
    entityId,
    entityType
  });

  // Don't render if user can't pin or if we don't have the required IDs
  if (!canPin || !currentUserId || !entityOwnerId) {
    console.log('❌ Pin button hidden:', { canPin, currentUserId, entityOwnerId });
    return null;
  }

  const handlePinToggle = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      console.log(`${isPinned ? 'Unpinning' : 'Pinning'} comment:`, commentId);

      const { data, error } = await supabase.rpc('toggle_comment_pin', {
        comment_id_param: commentId,
        entity_id_param: entityId,
        entity_type: entityType
      });

      if (error) throw error;

      console.log('Pin toggle result:', data);

      // Call the callback with updated pin status
      onPinToggled(
        commentId,
        data.is_pinned,
        data.pinned_at,
        data.pinned_by
      );

      // Show success message
      const action = data.is_pinned ? 'pinned' : 'unpinned';
      Alert.alert(
        "Success",
        `Comment ${action} successfully`,
        [{ text: "OK" }]
      );

    } catch (error: any) {
      console.error("Error toggling pin:", error);
      
      let errorMessage = "Failed to update pin status";
      if (error.message?.includes("Only the post/reel owner")) {
        errorMessage = "Only the post/reel owner can pin comments";
      } else if (error.message?.includes("not found")) {
        errorMessage = "Comment or post/reel not found";
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePress = () => {
    const action = isPinned ? "unpin" : "pin";
    const message = isPinned 
      ? "Are you sure you want to unpin this comment?" 
      : "Are you sure you want to pin this comment to the top?";

    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Comment`,
      message,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: isPinned ? "destructive" : "default",
          onPress: handlePinToggle,
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[styles.pinButton, style]}
      onPress={handlePress}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.textSecondary} />
      ) : (
        <>
          <Ionicons
            name={isPinned ? "pin" : "pin-outline"}
            size={16}
            color={isPinned ? colors.primary : colors.textSecondary}
            style={styles.pinIcon}
          />
          <Text
            style={[
              styles.pinText,
              {
                color: isPinned ? colors.primary : colors.textSecondary,
              },
            ]}
          >
            {isPinned ? "Unpin" : "Pin"}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pinButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "transparent",
  },
  pinIcon: {
    marginRight: 4,
  },
  pinText: {
    fontSize: 12,
    fontWeight: "500",
  },
});

export default CommentPinButton;
