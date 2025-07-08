import { View, TouchableOpacity, Text, StyleSheet, StatusBar } from 'react-native';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import CreatePost from '@/components/CreatePost';
import CreateReel from '@/components/CreateReel';
import ThemedGradient from '@/components/ThemedGradient';
import { useTheme } from '@/src/context/ThemeContext';
import { SafeAreaView } from "react-native-safe-area-context";

const Create = () => {
  const router = useRouter();
  const [mode, setMode] = useState<'post' | 'reel'>('post');
  const { colors, isDarkMode } = useTheme();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <ThemedGradient style={styles.container}>
      <View style={[styles.header, {
        borderBottomColor: `${colors.primary}20`,
        backgroundColor: `${colors.backgroundSecondary}90`
      }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            mode === 'post' && [styles.activeTab, { borderBottomColor: colors.primary }]
          ]}
          onPress={() => setMode('post')}
        >
          <AntDesign
            name="picture"
            size={24}
            color={mode === 'post' ? colors.text : colors.textTertiary}
          />
          <Text style={[
            styles.tabText,
            { color: colors.textTertiary },
            mode === 'post' && [styles.activeTabText, { color: colors.text }]
          ]}>
            Post
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            mode === 'reel' && [styles.activeTab, { borderBottomColor: colors.primary }]
          ]}
          onPress={() => setMode('reel')}
        >
          <AntDesign
            name="videocamera"
            size={24}
            color={mode === 'reel' ? colors.text : colors.textTertiary}
          />
          <Text style={[
            styles.tabText,
            { color: colors.textTertiary },
            mode === 'reel' && [styles.activeTabText, { color: colors.text }]
          ]}>
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
      </ThemedGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
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
  },
  tabText: {
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  activeTabText: {
    // Color is set inline
  },
});

export default Create;