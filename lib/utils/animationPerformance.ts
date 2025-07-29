import { Platform } from 'react-native';

// Animation-specific performance monitoring utilities
export class AnimationPerformanceMonitor {
  private static instance: AnimationPerformanceMonitor;
  private frameDrops: number = 0;
  private lastFrameTime: number = 0;
  private isMonitoring: boolean = false;

  static getInstance(): AnimationPerformanceMonitor {
    if (!AnimationPerformanceMonitor.instance) {
      AnimationPerformanceMonitor.instance = new AnimationPerformanceMonitor();
    }
    return AnimationPerformanceMonitor.instance;
  }

  // Start monitoring frame drops during animations
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.frameDrops = 0;
    this.lastFrameTime = Date.now();
    
    if (__DEV__) {
      console.log('🎬 Animation performance monitoring started');
    }
  }

  // Stop monitoring and report results
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (__DEV__) {
      console.log(`🎬 Animation monitoring stopped. Frame drops: ${this.frameDrops}`);
      if (this.frameDrops > 5) {
        console.warn('⚠️ High frame drops detected. Consider optimizing animations.');
      }
    }
  }

  // Check frame timing
  checkFrame() {
    if (!this.isMonitoring) return;
    
    const currentTime = Date.now();
    const frameDuration = currentTime - this.lastFrameTime;
    
    // Detect frame drops (assuming 60fps = ~16.67ms per frame)
    if (frameDuration > 20) {
      this.frameDrops++;
    }
    
    this.lastFrameTime = currentTime;
  }
}

// Animation performance utilities
export const animationPerformanceUtils = {
  // Check if device is low-end for performance adjustments
  isLowEndDevice: (): boolean => {
    // Simple heuristic - can be improved with actual device detection
    return Platform.OS === 'android' && Platform.Version < 28;
  },

  // Get optimal animation duration based on device performance
  getOptimalAnimationDuration: (baseMs: number): number => {
    if (animationPerformanceUtils.isLowEndDevice()) {
      return Math.max(baseMs * 0.7, 150); // Faster on low-end devices
    }
    return baseMs;
  },

  // Get optimal FlatList props for smooth scrolling during animations
  getOptimizedFlatListProps: (itemHeight: number) => ({
    removeClippedSubviews: true,
    maxToRenderPerBatch: animationPerformanceUtils.isLowEndDevice() ? 5 : 10,
    updateCellsBatchingPeriod: 50,
    initialNumToRender: animationPerformanceUtils.isLowEndDevice() ? 5 : 10,
    windowSize: animationPerformanceUtils.isLowEndDevice() ? 5 : 10,
    getItemLayout: (data: any, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }),
  }),

  // Optimize image loading for animations
  getOptimizedImageProps: () => ({
    resizeMode: 'cover' as const,
    loadingIndicatorSource: { 
      uri: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' 
    },
    fadeDuration: 0, // Disable fade for smoother animations
  }),

  // Memory cleanup utility
  cleanupMemory: () => {
    if (global.gc && __DEV__) {
      global.gc();
      console.log('🧹 Memory cleanup performed');
    }
  },
};

// Hook for monitoring component render performance during animations
export const useAnimationRenderPerformance = (componentName: string) => {
  if (__DEV__) {
    const startTime = Date.now();
    
    return () => {
      const endTime = Date.now();
      const renderTime = endTime - startTime;
      
      if (renderTime > 16) { // More than one frame at 60fps
        console.warn(`⚠️ Slow render during animation in ${componentName}: ${renderTime}ms`);
      }
    };
  }
  
  return () => {}; // No-op in production
};

export default AnimationPerformanceMonitor;
