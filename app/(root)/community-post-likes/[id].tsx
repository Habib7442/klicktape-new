import React from "react";
import { useLocalSearchParams } from "expo-router";
import CommunityPostLikesList from "@/components/community/CommunityPostLikesList";

const CommunityPostLikesScreen = () => {
  const { id } = useLocalSearchParams();
  
  // Ensure id is a string
  if (!id || typeof id !== "string") {
    return null;
  }

  return (
    <CommunityPostLikesList
      postId={id}
      title="Likes"
    />
  );
};

export default CommunityPostLikesScreen;
