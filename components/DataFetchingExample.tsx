/**
 * Example Component showing how to use conditional query hooks
 * This replaces direct TanStack Query usage
 */

import React from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { LazyQueryProvider } from '@/lib/query/LazyQueryProvider';
import { useStories, usePosts, useUserProfile } from '@/lib/query/conditionalHooks';

// Component that needs to be wrapped with LazyQueryProvider
const StoriesComponent = () => {
  const { data: stories, isLoading, error } = useStories();

  if (isLoading) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading stories...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Text>Error loading stories: {error.message}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={stories}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={{ padding: 10, borderBottomWidth: 1 }}>
          <Text>{item.title}</Text>
        </View>
      )}
    />
  );
};

// Component that fetches posts
const PostsComponent = () => {
  const { data: posts, isLoading, error, refetch } = usePosts();

  if (isLoading) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading posts...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Text>Error loading posts: {error.message}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={{ padding: 10, borderBottomWidth: 1 }}>
          <Text>{item.title}</Text>
          <Text>By: {item.profiles?.username}</Text>
        </View>
      )}
      onRefresh={refetch}
      refreshing={isLoading}
    />
  );
};

// Main component that wraps everything with LazyQueryProvider
const DataFetchingExample = () => {
  return (
    <LazyQueryProvider>
      <View style={{ flex: 1 }}>
        <StoriesComponent />
        <PostsComponent />
      </View>
    </LazyQueryProvider>
  );
};

export default DataFetchingExample;

// Usage in your main screens:
/*
// In your home screen or any screen that needs data fetching:

import { LazyQueryProvider } from '@/lib/query/LazyQueryProvider';
import { useStories, usePosts } from '@/lib/query/conditionalHooks';

const HomeScreen = () => {
  return (
    <LazyQueryProvider>
      <YourHomeContent />
    </LazyQueryProvider>
  );
};

const YourHomeContent = () => {
  const { data: stories, isLoading } = useStories();
  const { data: posts } = usePosts();

  // Your component logic here
  return (
    <View>
      {/* Your UI *\/}
    </View>
  );
};
*/
