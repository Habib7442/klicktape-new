import React from "react";
import { StyleSheet, View } from "react-native";
import CommentsModal from "@/components/Comments";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/src/context/ThemeContext";

const PostsCommentScreen = () => {
  const { postId, postOwnerUsername } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();

  // Ensure postId is a string
  if (!postId || typeof postId !== "string") {
    return null; // Or display an error message
  }

  return (
    <CommentsModal
      entityType="post"
      entityId={postId}
      onClose={() => router.push("/(root)/(tabs)/home")}
      entityOwnerUsername={postOwnerUsername as string}
      visible={true}
    />
  );
};

export default PostsCommentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
