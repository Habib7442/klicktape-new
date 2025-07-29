#!/usr/bin/env node

/**
 * Test script to verify slide animation white flash fixes
 */

const fs = require('fs');
const path = require('path');

console.log('🎬 Testing Slide Animation White Flash Fixes...\n');

// Test files to check
const testFiles = [
  {
    path: 'lib/animations/slideTransitions.ts',
    checks: [
      {
        pattern: /createSlideFromRightConfig = \(isDarkMode: boolean = true\)/,
        description: 'Theme-aware animation configuration function'
      },
      {
        pattern: /backgroundColor = isDarkMode \? '#000000' : '#FFFFFF'/,
        description: 'Theme-aware background color in cardStyleInterpolator'
      },
      {
        pattern: /backgroundColor, \/\/ Theme-aware overlay background/,
        description: 'Theme-aware overlay background'
      },
      {
        pattern: /containerStyle: \{\s*backgroundColor,/,
        description: 'Theme-aware container background'
      },
      {
        pattern: /sceneContainerStyle: \{\s*backgroundColor: isDarkMode/,
        description: 'Theme-aware scene container background'
      }
    ]
  },
  {
    path: 'app/(root)/_layout.tsx',
    checks: [
      {
        pattern: /import.*createThemeAwareSlideConfig.*from/,
        description: 'Import of theme-aware slide configuration'
      },
      {
        pattern: /import.*useTheme.*from/,
        description: 'Import of useTheme hook'
      },
      {
        pattern: /const slideConfig = createThemeAwareSlideConfig\(isDarkMode\)/,
        description: 'Usage of theme-aware slide configuration'
      },
      {
        pattern: /contentStyle: \{\s*backgroundColor: isDarkMode/,
        description: 'Theme-aware content style in screenOptions'
      }
    ]
  },
  {
    path: 'app/_layout.tsx',
    checks: [
      {
        pattern: /function ThemedStack\(\)/,
        description: 'ThemedStack component definition'
      },
      {
        pattern: /const \{ isDarkMode \} = useTheme\(\)/,
        description: 'useTheme hook usage in ThemedStack'
      },
      {
        pattern: /contentStyle: \{\s*backgroundColor: isDarkMode/,
        description: 'Theme-aware background in root Stack'
      }
    ]
  },
  {
    path: 'lib/utils/themeAwareNavigation.ts',
    checks: [
      {
        pattern: /export const getThemeAwareConfig/,
        description: 'Theme-aware configuration utility'
      },
      {
        pattern: /export const applyThemeAwareStatusBar/,
        description: 'Theme-aware status bar utility'
      },
      {
        pattern: /export const getAnimationSafeScreenOptions/,
        description: 'Animation-safe screen options utility'
      }
    ]
  }
];

let allTestsPassed = true;
let totalChecks = 0;
let passedChecks = 0;

// Function to check if file exists and contains required patterns
function checkFile(fileInfo) {
  const filePath = path.join(process.cwd(), fileInfo.path);
  
  console.log(`📁 Checking ${fileInfo.path}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ File not found: ${fileInfo.path}`);
    allTestsPassed = false;
    return;
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  fileInfo.checks.forEach(check => {
    totalChecks++;
    if (check.pattern.test(fileContent)) {
      console.log(`   ✅ ${check.description}`);
      passedChecks++;
    } else {
      console.log(`   ❌ ${check.description}`);
      allTestsPassed = false;
    }
  });
  
  console.log('');
}

// Run tests
testFiles.forEach(checkFile);

// Additional checks for theme integration
console.log('🎨 Checking theme integration...');

// Check if ThemedGradient is used in key screens
const screenFiles = [
  'app/(root)/chat/index.tsx',
  'app/(root)/notifications.tsx'
];

screenFiles.forEach(screenFile => {
  const filePath = path.join(process.cwd(), screenFile);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    totalChecks++;
    if (content.includes('ThemedGradient')) {
      console.log(`   ✅ ${screenFile} uses ThemedGradient`);
      passedChecks++;
    } else {
      console.log(`   ❌ ${screenFile} missing ThemedGradient`);
      allTestsPassed = false;
    }
  }
});

console.log('\n📊 Test Results:');
console.log(`   Total checks: ${totalChecks}`);
console.log(`   Passed: ${passedChecks}`);
console.log(`   Failed: ${totalChecks - passedChecks}`);

if (allTestsPassed) {
  console.log('\n🎉 All tests passed! Slide animation white flash fixes are properly implemented.');
  console.log('\n🚀 Expected improvements:');
  console.log('   • No white flashes during slide transitions');
  console.log('   • Theme-aware backgrounds in all animation states');
  console.log('   • Consistent dark/light theme support');
  console.log('   • Instagram-level smooth transitions');
  console.log('\n🧪 Next steps:');
  console.log('   1. Test on physical device (iOS/Android)');
  console.log('   2. Verify both dark and light themes');
  console.log('   3. Test chat → home and notifications → home transitions');
  console.log('   4. Check for any remaining visual artifacts');
} else {
  console.log('\n❌ Some tests failed. Please review the implementation.');
  process.exit(1);
}
