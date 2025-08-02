import React from "react";
import { useLocalSearchParams } from "expo-router";
import ReelLikesList from "@/components/ReelLikesList";

const ReelLikesScreen = () => {
  const { id } = useLocalSearchParams();
  
  // Ensure id is a string
  if (!id || typeof id !== "string") {
    return null;
  }

  return (
    <ReelLikesList
      reelId={id}
      title="Likes"
    />
  );
};

export default ReelLikesScreen;
