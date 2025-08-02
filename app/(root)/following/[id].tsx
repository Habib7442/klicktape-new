import React from "react";
import { useLocalSearchParams } from "expo-router";
import FollowList from "@/components/FollowList";

const FollowingScreen = () => {
  const { id } = useLocalSearchParams();

  // Ensure id is a string
  if (!id || typeof id !== "string") {
    return null;
  }

  return (
    <FollowList
      userId={id}
      type="following"
      title="Following"
    />
  );
};

export default FollowingScreen;