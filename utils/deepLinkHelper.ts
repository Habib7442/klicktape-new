/**
 * Deep Link Helper Utility
 * Generates deep links for sharing posts, reels, and profiles
 */

export interface DeepLinkOptions {
  postId?: string;
  reelId?: string;
  userId?: string;
  username?: string;
}

/**
 * Generate a deep link URL for the app
 */
export const generateDeepLink = (options: DeepLinkOptions): string => {
  const baseScheme = 'klicktape://';
  
  if (options.postId) {
    return `${baseScheme}post/${options.postId}`;
  }
  
  if (options.reelId) {
    return `${baseScheme}reel/${options.reelId}`;
  }
  
  if (options.userId) {
    return `${baseScheme}userProfile/${options.userId}`;
  }
  
  // Default to home if no specific route
  return `${baseScheme}`;
};



/**
 * Generate a complete share message with deep link
 */
export const generateShareMessage = (
  content: {
    type: 'post' | 'reel' | 'profile';
    username: string;
    caption?: string;
    id: string;
  }
): string => {
  const deepLink = generateDeepLink(
    content.type === 'post'
      ? { postId: content.id }
      : content.type === 'reel'
      ? { reelId: content.id }
      : { userId: content.id }
  );

  if (content.type === 'post') {
    return `Check out this post by ${content.username} on Klicktape: ${content.caption || ''}\n\n${deepLink}`;
  }

  if (content.type === 'reel') {
    return `Check out this reel by ${content.username} on Klicktape: ${content.caption || ''}\n\n${deepLink}`;
  }

  if (content.type === 'profile') {
    return `Check out ${content.username}'s profile on Klicktape!\n\n${deepLink}`;
  }

  return `Check out Klicktape!\n\n${deepLink}`;
};

/**
 * Generate share content for React Native Share API
 */
export const generateShareContent = (
  content: {
    type: 'post' | 'reel' | 'profile';
    username: string;
    caption?: string;
    id: string;
    mediaUrl?: string;
  }
) => {
  const message = generateShareMessage(content);
  const deepLink = generateDeepLink(
    content.type === 'post'
      ? { postId: content.id }
      : content.type === 'reel'
      ? { reelId: content.id }
      : { userId: content.id }
  );

  return {
    message,
    url: deepLink, // This makes the deep link appear as a clickable link
  };
};
