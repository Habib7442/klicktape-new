import { Stack } from "expo-router";
import { createThemeAwareSlideConfig } from "@/lib/animations/slideTransitions";
import { useTheme } from "@/src/context/ThemeContext";

const Layout = () => {
  const { isDarkMode } = useTheme();

  // Create theme-aware slide configuration
  const slideConfig = createThemeAwareSlideConfig(isDarkMode);

  return (
    <Stack
      screenOptions={{
        // Set default background color for all screens to prevent white flash
        contentStyle: {
          backgroundColor: isDarkMode ? "#000000" : "#FFFFFF",
        },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="create-profile" options={{ headerShown: false }} />
      <Stack.Screen
        name="posts-comments-screen"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="reels-comments-screen"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={slideConfig} />
      <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="post-likes/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="reel/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="rooms/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="community/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="community-post/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="community-post-likes/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="reel-likes/[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="rooms/members/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="userProfile/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="followers/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="following/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="chat/index" options={slideConfig} />
      <Stack.Screen name="demo/index" options={{ headerShown: false }} />
      <Stack.Screen name="demos" options={{ headerShown: false }} />
      <Stack.Screen name="chats/[id]" options={slideConfig} />
      <Stack.Screen name="settings" options={slideConfig} />
      <Stack.Screen name="welcome-main" options={{ headerShown: false }} />
      <Stack.Screen name="appearance" options={{ headerShown: false }} />
      <Stack.Screen
        name="terms-and-conditions"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
    </Stack>
  );
};

export default Layout;
