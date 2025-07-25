/**
 * Lazy-Loaded TanStack Query Provider
 * Only loads when needed to avoid initial EventTarget errors
 */

import React, { useEffect, useState, createContext, useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';

// Context for lazy query client
const LazyQueryContext = createContext<{
  queryClient: any;
  QueryClientProvider: any;
  isReady: boolean;
}>({
  queryClient: null,
  QueryClientProvider: null,
  isReady: false,
});

interface LazyQueryProviderProps {
  children: React.ReactNode;
}

export const LazyQueryProvider: React.FC<LazyQueryProviderProps> = ({ children }) => {
  const [queryModules, setQueryModules] = useState<{
    queryClient: any;
    QueryClientProvider: any;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTanStackQuery = async () => {
      try {
        console.log('🔄 Loading TanStack Query modules...');
        
        // Load polyfills first
        await import('../../polyfills');
        
        // Small delay to ensure polyfills are applied
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify EventTarget is available
        if (typeof global.EventTarget === 'undefined') {
          throw new Error('EventTarget polyfill not available');
        }
        
        // Dynamically import TanStack Query modules
        const [
          { QueryClientProvider },
          { queryClient }
        ] = await Promise.all([
          import('@tanstack/react-query'),
          import('./queryClient')
        ]);
        
        setQueryModules({
          queryClient,
          QueryClientProvider,
        });
        
        console.log('✅ TanStack Query modules loaded successfully');
      } catch (err) {
        console.error('❌ Failed to load TanStack Query:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    loadTanStackQuery();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !queryModules) {
    console.warn('⚠️ TanStack Query not available, falling back to direct Supabase calls');
    // Return children without TanStack Query context
    return (
      <LazyQueryContext.Provider value={{
        queryClient: null,
        QueryClientProvider: null,
        isReady: false,
      }}>
        {children}
      </LazyQueryContext.Provider>
    );
  }

  const { QueryClientProvider, queryClient } = queryModules;

  return (
    <LazyQueryContext.Provider value={{
      queryClient,
      QueryClientProvider,
      isReady: true,
    }}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </LazyQueryContext.Provider>
  );
};

// Hook to use lazy query context
export const useLazyQuery = () => {
  const context = useContext(LazyQueryContext);
  return context;
};

// Hook to check if TanStack Query is available
export const useQueryAvailable = () => {
  const { isReady } = useLazyQuery();
  return isReady;
};

export default LazyQueryProvider;
