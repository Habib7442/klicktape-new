/**
 * Simple render performance testing utility
 * Helps identify slow renders during animations
 */

export class RenderPerformanceTest {
  private static measurements: Map<string, number[]> = new Map();
  
  static startMeasurement(componentName: string): () => void {
    if (!__DEV__) return () => {}; // No-op in production
    
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Store measurement
      if (!this.measurements.has(componentName)) {
        this.measurements.set(componentName, []);
      }
      this.measurements.get(componentName)!.push(renderTime);
      
      // Warn if render is slow (more than 16ms = 1 frame at 60fps)
      if (renderTime > 16) {
        console.warn(`⚠️ Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
      
      // Keep only last 10 measurements
      const measurements = this.measurements.get(componentName)!;
      if (measurements.length > 10) {
        measurements.shift();
      }
    };
  }
  
  static getAverageRenderTime(componentName: string): number {
    const measurements = this.measurements.get(componentName);
    if (!measurements || measurements.length === 0) return 0;
    
    const sum = measurements.reduce((a, b) => a + b, 0);
    return sum / measurements.length;
  }
  
  static getReport(): string {
    if (!__DEV__) return 'Performance testing only available in development';
    
    let report = '📊 Render Performance Report\n';
    report += '============================\n\n';
    
    for (const [componentName, measurements] of this.measurements) {
      const avg = this.getAverageRenderTime(componentName);
      const max = Math.max(...measurements);
      const min = Math.min(...measurements);
      
      report += `${componentName}:\n`;
      report += `  Average: ${avg.toFixed(2)}ms\n`;
      report += `  Min: ${min.toFixed(2)}ms\n`;
      report += `  Max: ${max.toFixed(2)}ms\n`;
      report += `  Samples: ${measurements.length}\n`;
      
      if (avg > 16) {
        report += `  ⚠️ SLOW - Consider optimization\n`;
      } else if (avg > 8) {
        report += `  ⚡ MODERATE - Room for improvement\n`;
      } else {
        report += `  ✅ FAST - Good performance\n`;
      }
      report += '\n';
    }
    
    return report;
  }
  
  static clearMeasurements(): void {
    this.measurements.clear();
  }
}

// React hook for easy component performance testing
export const useRenderPerformanceTest = (componentName: string) => {
  if (!__DEV__) return;
  
  const finishMeasurement = RenderPerformanceTest.startMeasurement(componentName);
  
  // Call this at the end of your component render
  return finishMeasurement;
};

// Utility to test animation performance
export const testAnimationPerformance = {
  // Test slide animation performance
  testSlideAnimation: async (testDuration: number = 5000) => {
    if (!__DEV__) return;
    
    console.log('🎬 Starting animation performance test...');
    
    let frameCount = 0;
    let droppedFrames = 0;
    let lastFrameTime = performance.now();
    
    const testFrame = () => {
      const currentTime = performance.now();
      const frameDuration = currentTime - lastFrameTime;
      
      frameCount++;
      
      // Detect dropped frames (assuming 60fps = ~16.67ms per frame)
      if (frameDuration > 20) {
        droppedFrames++;
      }
      
      lastFrameTime = currentTime;
      
      if (currentTime - startTime < testDuration) {
        requestAnimationFrame(testFrame);
      } else {
        // Test complete
        const fps = (frameCount / (testDuration / 1000)).toFixed(1);
        const dropRate = ((droppedFrames / frameCount) * 100).toFixed(1);
        
        console.log('🎬 Animation performance test complete:');
        console.log(`   Average FPS: ${fps}`);
        console.log(`   Dropped frames: ${droppedFrames}/${frameCount} (${dropRate}%)`);
        
        if (droppedFrames > frameCount * 0.05) {
          console.warn('⚠️ High frame drop rate detected. Consider optimizing animations.');
        } else {
          console.log('✅ Animation performance is good!');
        }
      }
    };
    
    const startTime = performance.now();
    requestAnimationFrame(testFrame);
  },
  
  // Monitor memory usage during animations
  monitorMemory: () => {
    if (!__DEV__ || !performance.memory) return;
    
    const memory = performance.memory;
    console.log('💾 Memory usage:');
    console.log(`   Used: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Total: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Limit: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
  }
};

export default RenderPerformanceTest;
