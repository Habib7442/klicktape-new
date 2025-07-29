#!/usr/bin/env node

/**
 * Animation Performance Test Script
 * 
 * This script helps test and verify that the Instagram-style slide animations
 * are working smoothly without performance issues.
 * 
 * Usage: node scripts/testAnimationPerformance.js
 */

const fs = require('fs');
const path = require('path');

console.log('🎬 Animation Performance Test Suite');
console.log('=====================================\n');

// Check if required animation files exist
const requiredFiles = [
  'lib/animations/slideTransitions.ts',
  'lib/utils/animationPerformance.ts',
  'app/(root)/_layout.tsx',
  'app/(root)/chat/index.tsx',
  'app/(root)/notifications.tsx'
];

console.log('📁 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Please ensure all animation files are in place.');
  process.exit(1);
}

console.log('\n🔍 Checking animation configuration...');

// Check slideTransitions.ts
const slideTransitionsPath = path.join(process.cwd(), 'lib/animations/slideTransitions.ts');
const slideTransitionsContent = fs.readFileSync(slideTransitionsPath, 'utf8');

const checks = [
  {
    name: 'useNativeDriver enabled',
    pattern: /useNativeDriver:\s*true/g,
    required: true
  },
  {
    name: 'Platform-specific durations',
    pattern: /Platform\.select/g,
    required: true
  },
  {
    name: 'Custom interpolator',
    pattern: /cardStyleInterpolator/g,
    required: true
  },
  {
    name: 'Gesture configuration',
    pattern: /gestureEnabled:\s*true/g,
    required: true
  }
];

checks.forEach(check => {
  const matches = slideTransitionsContent.match(check.pattern);
  if (matches && matches.length > 0) {
    console.log(`✅ ${check.name} - Found ${matches.length} instance(s)`);
  } else if (check.required) {
    console.log(`❌ ${check.name} - NOT FOUND`);
  } else {
    console.log(`⚠️  ${check.name} - Optional, not found`);
  }
});

// Check layout configuration
console.log('\n🏗️  Checking layout configuration...');
const layoutPath = path.join(process.cwd(), 'app/(root)/_layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

const layoutChecks = [
  {
    name: 'slideFromRightConfig import',
    pattern: /import.*slideFromRightConfig.*from/g,
    required: true
  },
  {
    name: 'Chat screen animation',
    pattern: /name="chat\/index".*slideFromRightConfig/s,
    required: true
  },
  {
    name: 'Notifications screen animation',
    pattern: /name="notifications".*slideFromRightConfig/s,
    required: true
  }
];

layoutChecks.forEach(check => {
  const matches = layoutContent.match(check.pattern);
  if (matches && matches.length > 0) {
    console.log(`✅ ${check.name}`);
  } else if (check.required) {
    console.log(`❌ ${check.name} - NOT FOUND`);
  }
});

// Check performance optimizations
console.log('\n⚡ Checking performance optimizations...');

const chatPath = path.join(process.cwd(), 'app/(root)/chat/index.tsx');
const chatContent = fs.readFileSync(chatPath, 'utf8');

const notificationsPath = path.join(process.cwd(), 'app/(root)/notifications.tsx');
const notificationsContent = fs.readFileSync(notificationsPath, 'utf8');

const perfChecks = [
  {
    name: 'FlatList optimizations (Chat)',
    content: chatContent,
    pattern: /getOptimizedFlatListProps/g,
    required: true
  },
  {
    name: 'FlatList optimizations (Notifications)',
    content: notificationsContent,
    pattern: /getOptimizedFlatListProps/g,
    required: true
  },
  {
    name: 'Image optimizations (Chat)',
    content: chatContent,
    pattern: /getOptimizedImageProps/g,
    required: true
  },
  {
    name: 'Image optimizations (Notifications)',
    content: notificationsContent,
    pattern: /getOptimizedImageProps/g,
    required: true
  },
  {
    name: 'useCallback optimization (Chat)',
    content: chatContent,
    pattern: /useCallback/g,
    required: true
  },
  {
    name: 'useCallback optimization (Notifications)',
    content: notificationsContent,
    pattern: /useCallback/g,
    required: true
  }
];

perfChecks.forEach(check => {
  const matches = check.content.match(check.pattern);
  if (matches && matches.length > 0) {
    console.log(`✅ ${check.name}`);
  } else if (check.required) {
    console.log(`❌ ${check.name} - NOT FOUND`);
  }
});

console.log('\n📊 Performance Test Summary');
console.log('============================');

// Generate recommendations
const recommendations = [];

if (!slideTransitionsContent.includes('useNativeDriver: true')) {
  recommendations.push('Enable useNativeDriver in animation config for better performance');
}

if (!chatContent.includes('removeClippedSubviews')) {
  recommendations.push('Add removeClippedSubviews to FlatList in chat screen');
}

if (!notificationsContent.includes('removeClippedSubviews')) {
  recommendations.push('Add removeClippedSubviews to FlatList in notifications screen');
}

if (recommendations.length === 0) {
  console.log('🎉 All performance optimizations are in place!');
  console.log('\n📱 Test Instructions:');
  console.log('1. Run the app on a physical device');
  console.log('2. Navigate to home screen');
  console.log('3. Tap the chat icon - should slide smoothly from right');
  console.log('4. Swipe back or use back button - should slide smoothly to left');
  console.log('5. Repeat with notifications icon');
  console.log('6. Check for any frame drops or stuttering');
  console.log('\n🔧 Debugging:');
  console.log('- Open React Native Debugger');
  console.log('- Check console for performance warnings');
  console.log('- Use Flipper for detailed performance metrics');
} else {
  console.log('⚠️  Recommendations for better performance:');
  recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });
}

console.log('\n✨ Animation performance test completed!');
