import React from "react";
import { StyleSheet, View } from "react-native";
import CommentsModal from "@/components/Comments";
import { useLocalSearchParams, useRouter } from "expo-router";

const ReelsCommentScreen = () => {
  const { reelId, reelOwnerUsername } = useLocalSearchParams();
  const router = useRouter();

  // Ensure reelId is a string
  if (!reelId || typeof reelId !== "string") {
    return null; // Or display an error message
  }

  return (
    <View style={styles.container}>
      <CommentsModal
        entityType="reel"
        entityId={reelId}
        onClose={() => router.push("/(root)/(tabs)/reels")}
        entityOwnerUsername={reelOwnerUsername as string}
      />
    </View>
  );
};

export default ReelsCommentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
});