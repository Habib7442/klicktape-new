import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import CreatePost from '@/components/CreatePost';
import CreateReel from '@/components/CreateReel';

const Create = () => {
  const router = useRouter();
  const [mode, setMode] = useState<'post' | 'reel'>('post');

  return (
    <LinearGradient
      colors={["#000000", "#1a1a1a", "#2a2a2a"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.tab, mode === 'post' && styles.activeTab]}
          onPress={() => setMode('post')}
        >
          <AntDesign 
            name="picture" 
            size={24} 
            color={mode === 'post' ? '#FFD700' : 'rgba(255, 215, 0, 0.7)'} 
          />
          <Text style={[styles.tabText, mode === 'post' && styles.activeTabText]}>
            Post
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, mode === 'reel' && styles.activeTab]}
          onPress={() => setMode('reel')}
        >
          <AntDesign 
            name="videocamera" 
            size={24} 
            color={mode === 'reel' ? '#FFD700' : 'rgba(255, 215, 0, 0.7)'} 
          />
          <Text style={[styles.tabText, mode === 'reel' && styles.activeTabText]}>
            Reel
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'post' ? (
        <CreatePost 
          onPostCreated={() => {
            router.back();
          }}
        />
      ) : (
        <CreateReel />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FFD700',
  },
  tabText: {
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    color: 'rgba(255, 215, 0, 0.7)',
  },
  activeTabText: {
    color: '#ffffff',
  },
});

export default Create;