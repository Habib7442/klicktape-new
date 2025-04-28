import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import debounce from 'lodash/debounce';
import { supabase } from '@/lib/supabase';
import { postsAPI } from '@/lib/postsApi';
import { reelsAPI } from '@/lib/reelsApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  username: string;
  avatar: string;
  bio?: string;
}

interface Post {
  id: string;
  image_urls?: string[];
  caption: string;
  user: {
    username: string;
    avatar: string;
  };
  type: 'image';
}

interface Reel {
  id: string;
  video_url: string;
  thumbnail_url?: string;
  caption: string;
  user: {
    username: string;
    avatar: string;
  };
  type: 'video';
}

type PostOrReel = Post | Reel;

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [exploreItems, setExploreItems] = useState<PostOrReel[]>([]);
  const [loading, setLoading] = useState(false);
  const [exploreLoading, setExploreLoading] = useState(true);

  const debouncedSearch = useCallback(
    debounce(async (text: string) => {
      if (text.length > 0) {
        setLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          const searchResults = await postsAPI.searchUsers(text);
          setUsers(searchResults.map(result => ({
            id: result.id,
            username: result.username,
            avatar: result.avatar_url,
            bio: result.bio,
          })));
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setUsers([]);
      }
    }, 500),
    []
  );

  useEffect(() => {
    const getUserData = async () => {
      try {
        // First try to get user from AsyncStorage
        const userData = await AsyncStorage.getItem("user");
        let currentUser;
        
        if (userData) {
          currentUser = JSON.parse(userData);
        } else {
          // If not in storage, fetch from Supabase
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Cache the user data
            await AsyncStorage.setItem("user", JSON.stringify(user));
            currentUser = user;
          }
        }

        if (currentUser) {
          // Use the user data for explore items fetch
          const [posts, reels] = await Promise.all([
            postsAPI.getExplorePosts(),
            reelsAPI.getReels(30, 0, []),
          ]);
          
          // Rest of your explore items logic
          const combinedItems: PostOrReel[] = [
            ...posts,
            ...reels.map(reel => ({
              id: reel.id,
              video_url: reel.video_url,
              thumbnail_url: reel.thumbnail_url,
              caption: reel.caption,
              user: reel.user || {
                username: 'Unknown User',
                avatar: 'https://via.placeholder.com/150',
              },
              type: 'video' as const,
            })),
          ];

          setExploreItems(combinedItems.sort(() => Math.random() - 0.5));
        }
      } catch (error) {
        console.error("Error getting user data:", error);
      } finally {
        setExploreLoading(false);
      }
    };

    getUserData();
  }, []);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  const navigateToProfile = (user: User) => {
    console.log('Navigating to user profile with ID:', user.id);
    router.push({
      pathname: `/userProfile/${user.id}`,
      params: {
        id: user.id,
        avatar: user.avatar,
      },
    });
  };

  const navigateToPost = (item: PostOrReel) => {
    if (item.type === 'image') {
      router.push(`/post/${item.id}`);
    } else {
      router.push(`/reel/${item.id}`);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => navigateToProfile(item)}
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.userInfo}>
        <Text className="font-rubik-bold" style={styles.username}>
          {item.username}
        </Text>
        {item.bio && (
          <Text className="font-rubik-regular" style={styles.bio}>
            {item.bio}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderPostItem = ({ item }: { item: PostOrReel }) => (
    <TouchableOpacity
      style={styles.postItem}
      onPress={() => navigateToPost(item)}
    >
      <Image
        source={{
          uri:
            item.type === 'image'
              ? item.image_urls?.[0]
              : item.thumbnail_url || 'https://via.placeholder.com/150',
        }}
        style={styles.postImage}
        resizeMode="cover"
      />
      {item.type === 'video' && (
        <Feather
          name="play-circle"
          size={24}
          color="#FFD700"
          style={styles.playIcon}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#000000', '#1a1a1a', '#2a2a2a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.searchContainer}>
        <Feather
          name="search"
          size={20}
          color="#FFD700"
          style={styles.searchIcon}
        />
        <TextInput
          className="font-rubik-medium"
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {searchQuery.length > 0 ? (
        loading ? (
          <ActivityIndicator style={styles.loader} color="#FFD700" />
        ) : (
          <FlatList
            key="searchList"
            data={users}
            renderItem={renderUserItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : exploreLoading ? (
        <ActivityIndicator style={styles.loader} color="#FFD700" />
      ) : (
        <FlatList
          key="exploreGrid"
          data={exploreItems}
          renderItem={renderPostItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.postListContainer}
          showsVerticalScrollIndicator={false}
          numColumns={3}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}
    </LinearGradient>
  );
};

export default Search;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    color: '#ffffff',
  },
  bio: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  loader: {
    marginTop: 20,
  },
  postListContainer: {
    paddingHorizontal: 4,
    paddingBottom: 20,
  },
  postItem: {
    flex: 1,
    margin: 2,
    aspectRatio: 1,
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  playIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    opacity: 0.8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
});