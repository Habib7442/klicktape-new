import React from "react";
import { StyleSheet, View } from "react-native";
import CommentsModal from "@/components/Comments";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/src/context/ThemeContext";

const ReelsCommentScreen = () => {
  const { reelId, reelOwnerUsername, reelOwnerId } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();

  // Ensure reelId is a string
  if (!reelId || typeof reelId !== "string") {
    return null; // Or display an error message
  }

  return (
    <CommentsModal
      entityType="reel"
      entityId={reelId}
      onClose={() => router.push("/(root)/(tabs)/reels")}
      entityOwnerUsername={reelOwnerUsername as string}
      entityOwnerId={reelOwnerId as string}
      visible={true}
    />
  );
};

export default ReelsCommentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});