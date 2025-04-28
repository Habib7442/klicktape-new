import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import CommentsModal from "@/components/Comments";
import { useLocalSearchParams, useRouter } from "expo-router";

const PostsCommentScreen = () => {
  const { postId, postOwnerUsername } = useLocalSearchParams();
  const router = useRouter();

  // Ensure postId is a string
  if (!postId || typeof postId !== "string") {
    return null; // Or display an error message
  }

  return (
    <View style={styles.container}>
      <CommentsModal
        entityType="post"
        entityId={postId}
        onClose={() => router.push("/(root)/(tabs)/home")}
        entityOwnerUsername={postOwnerUsername as string}
      />
    </View>
  );
};

export default PostsCommentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
});
