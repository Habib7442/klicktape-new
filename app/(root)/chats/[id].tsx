import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/src/context/ThemeContext';
import ChatScreenContent from '@/components/chat/ChatScreenContent';
import LazyQueryProvider from '@/lib/query/LazyQueryProvider';

// Wrapper component with LazyQueryProvider
export default function ChatScreen() {
  return (
    <LazyQueryProvider>
      <ChatScreenContentWrapper />
    </LazyQueryProvider>
  );
}

// Main chat screen component
function ChatScreenContentWrapper() {
  const { isDarkMode } = useTheme();

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <ChatScreenContent />
    </>
  );
}