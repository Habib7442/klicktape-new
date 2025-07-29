import React from "react";
import { useLocalSearchParams } from "expo-router";
import PostLikesList from "@/components/PostLikesList";

const PostLikesScreen = () => {
  const { id } = useLocalSearchParams();
  
  // Ensure id is a string
  if (!id || typeof id !== "string") {
    return null;
  }

  return (
    <PostLikesList
      postId={id}
      title="Likes"
    />
  );
};

export default PostLikesScreen;
