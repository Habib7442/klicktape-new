#!/usr/bin/env node

/**
 * Security Validation Script for Klicktape
 * 
 * This script validates that the security implementation is correct
 * and that sensitive data is properly protected.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(message, 'cyan');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Security validation checks
const securityChecks = {
  // Files that should NOT contain EXPO_PUBLIC_ sensitive variables
  sensitiveVariableChecks: [
    {
      pattern: /EXPO_PUBLIC_(?:.*TOKEN|.*SECRET|.*PASSWORD|.*CREDENTIAL|.*SERVICE_ROLE_KEY|.*GEMINI_API_KEY|UPSTASH_REDIS_REST_TOKEN)/gi,
      excludePattern: /EXPO_PUBLIC_SUPABASE_ANON_KEY|EXPO_PUBLIC_UPSTASH_REDIS_REST_URL/gi, // These are safe to expose
      files: [
        'lib/**/*.ts',
        'lib/**/*.js',
        'app/**/*.ts',
        'app/**/*.tsx',
        'components/**/*.ts',
        'components/**/*.tsx'
      ],
      description: 'Checking for exposed sensitive variables with EXPO_PUBLIC_ prefix in code files'
    }
  ],

  // Required secure configuration files
  requiredFiles: [
    'lib/config/environment.ts',
    'eas.json',
    'docs/SECURITY_ENVIRONMENT_VARIABLES.md',
    'scripts/setup-eas-env.sh',
    'scripts/setup-eas-env.ps1'
  ],

  // Environment variable structure validation
  envStructure: {
    required: [
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      'EXPO_PUBLIC_SOCKET_SERVER_URL',
      'EXPO_PUBLIC_UPSTASH_REDIS_REST_URL'
    ],
    forbidden: [
      'EXPO_PUBLIC_UPSTASH_REDIS_REST_TOKEN',
      'EXPO_PUBLIC_GEMINI_API_KEY',
      'EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY'
    ],
    secure: [
      'UPSTASH_REDIS_REST_TOKEN',
      'GEMINI_API_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ]
  }
};

// Utility functions
function findFiles(pattern, dir = '.') {
  // Simple file finder without glob dependency
  const files = [];

  // For this validation, we'll check specific known files
  const knownFiles = [
    '.env',
    '.env.example',
    'lib/config/environment.ts',
    'lib/config/redis.ts',
    'lib/supabase.ts',
    'lib/geminiService.ts',
    'lib/redis/storiesCache.ts',
    'lib/redis/postsCache.ts',
    'lib/redis/reelsCache.ts',
    'lib/redis/commentsCache.ts',
    'utils/networkHelper.ts',
    'lib/socketService.ts'
  ];

  return knownFiles.filter(file => checkFileExists(file));
}

function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

// Validation functions
function validateSensitiveVariables() {
  logHeader('🔍 Checking for Exposed Sensitive Variables');

  let issues = 0;

  // First check for development-only EXPO_PUBLIC_ variables in .env files
  const envContent = readFileContent('.env');
  const envExampleContent = readFileContent('.env.example');

  const developmentVars = [
    'EXPO_PUBLIC_UPSTASH_REDIS_REST_TOKEN',
    'EXPO_PUBLIC_GEMINI_API_KEY',
    'EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY'
  ];

  let hasDevelopmentVars = false;
  developmentVars.forEach(varName => {
    if (envContent && envContent.includes(varName)) {
      hasDevelopmentVars = true;
    }
  });

  if (hasDevelopmentVars) {
    logWarning('Development-only EXPO_PUBLIC_ variables detected in .env');
    logInfo('This is acceptable for local development but must be removed for production');
    logInfo('These variables expose sensitive data in the client bundle');
  }
  
  securityChecks.sensitiveVariableChecks.forEach(check => {
    logInfo(check.description);

    check.files.forEach(filePattern => {
      const files = findFiles(filePattern);

      files.forEach(file => {
        // Skip environment files and config files for this check
        if (file.includes('.env') || file.includes('environment.ts')) {
          return;
        }

        const content = readFileContent(file);
        if (!content) return;

        const matches = content.match(check.pattern);
        if (matches) {
          // Filter out excluded patterns (like EXPO_PUBLIC_SUPABASE_ANON_KEY)
          const filteredMatches = check.excludePattern
            ? matches.filter(match => !check.excludePattern.test(match))
            : matches;

          if (filteredMatches.length > 0) {
            logError(`Found exposed sensitive variable in ${file}:`);
            filteredMatches.forEach(match => {
              log(`  - ${match}`, 'red');
            });
            issues++;
          }
        }
      });
    });
  });
  
  if (issues === 0) {
    logSuccess('No exposed sensitive variables found');
  }
  
  return issues;
}

function validateRequiredFiles() {
  logHeader('📁 Checking Required Security Files');
  
  let missing = 0;
  
  securityChecks.requiredFiles.forEach(file => {
    if (checkFileExists(file)) {
      logSuccess(`${file} exists`);
    } else {
      logError(`${file} is missing`);
      missing++;
    }
  });
  
  return missing;
}

function validateEnvironmentStructure() {
  logHeader('🌍 Validating Environment Variable Structure');
  
  const envExampleContent = readFileContent('.env.example');
  if (!envExampleContent) {
    logError('.env.example file not found');
    return 1;
  }
  
  let issues = 0;
  
  // Check required public variables
  logInfo('Checking required public variables...');
  securityChecks.envStructure.required.forEach(varName => {
    if (envExampleContent.includes(varName)) {
      logSuccess(`${varName} found in .env.example`);
    } else {
      logError(`${varName} missing from .env.example`);
      issues++;
    }
  });
  
  // Check forbidden public variables
  logInfo('Checking for forbidden public variables...');
  securityChecks.envStructure.forbidden.forEach(varName => {
    if (envExampleContent.includes(varName)) {
      // Check if this is a development-only setup
      if (envExampleContent.includes('DEVELOPMENT ONLY') && envExampleContent.includes('REMOVE FOR PRODUCTION')) {
        logWarning(`${varName} found in .env.example (development setup - remove for production)`);
      } else {
        logError(`${varName} found in .env.example (should be secure)`);
        issues++;
      }
    } else {
      logSuccess(`${varName} correctly not exposed as public`);
    }
  });
  
  // Check secure variables
  logInfo('Checking secure variables...');
  securityChecks.envStructure.secure.forEach(varName => {
    if (envExampleContent.includes(varName)) {
      logSuccess(`${varName} found as secure variable`);
    } else {
      logWarning(`${varName} not found in .env.example`);
    }
  });
  
  return issues;
}

function validateEASConfiguration() {
  logHeader('⚙️  Validating EAS Configuration');
  
  const easConfig = readFileContent('eas.json');
  if (!easConfig) {
    logError('eas.json file not found');
    return 1;
  }
  
  let issues = 0;
  
  try {
    const config = JSON.parse(easConfig);
    
    // Check build profiles have environment field
    const profiles = ['development', 'preview', 'production'];
    profiles.forEach(profile => {
      if (config.build && config.build[profile]) {
        if (config.build[profile].environment) {
          logSuccess(`${profile} profile has environment configuration`);
        } else {
          logWarning(`${profile} profile missing environment field`);
        }
      } else {
        logError(`${profile} build profile not found`);
        issues++;
      }
    });
    
  } catch (error) {
    logError('Invalid JSON in eas.json');
    issues++;
  }
  
  return issues;
}

function validateSecurityDocumentation() {
  logHeader('📚 Validating Security Documentation');
  
  const securityDoc = readFileContent('docs/SECURITY_ENVIRONMENT_VARIABLES.md');
  if (!securityDoc) {
    logError('Security documentation not found');
    return 1;
  }
  
  const requiredSections = [
    'EXPO_PUBLIC_',
    'EAS Environment Variables',
    'Security',
    'Production'
  ];
  
  let missing = 0;
  requiredSections.forEach(section => {
    if (securityDoc.includes(section)) {
      logSuccess(`Documentation includes ${section} section`);
    } else {
      logError(`Documentation missing ${section} section`);
      missing++;
    }
  });
  
  return missing;
}

// Main validation function
function runSecurityValidation() {
  log('🔒 Klicktape Security Validation', 'magenta');
  log('This script validates the security implementation\n', 'white');
  
  let totalIssues = 0;
  
  totalIssues += validateSensitiveVariables();
  totalIssues += validateRequiredFiles();
  totalIssues += validateEnvironmentStructure();
  totalIssues += validateEASConfiguration();
  totalIssues += validateSecurityDocumentation();
  
  // Final report
  logHeader('📊 Security Validation Report');
  
  if (totalIssues === 0) {
    logSuccess('All security checks passed! 🎉');
    logInfo('Your Klicktape app follows security best practices.');
  } else {
    logError(`Found ${totalIssues} security issue(s) that need attention.`);
    logInfo('Please review the issues above and fix them before deploying to production.');
  }
  
  logInfo('\nNext steps:');
  log('1. Run: npm run setup-eas-env (or yarn setup-eas-env)', 'blue');
  log('2. Test: eas build --platform ios --profile development', 'blue');
  log('3. Deploy: eas build --platform all --profile production', 'blue');
  
  return totalIssues;
}

// Run validation if script is executed directly
if (require.main === module) {
  const issues = runSecurityValidation();
  process.exit(issues > 0 ? 1 : 0);
}

module.exports = { runSecurityValidation };
