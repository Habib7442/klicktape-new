#!/bin/bash

# TanStack Query v5 Installation Script for Klicktape
echo "🚀 Installing TanStack Query v5 for Klicktape..."

# Install TanStack Query v5 and related packages
echo "📦 Installing TanStack Query packages..."
npm install @tanstack/react-query@^5.0.0

# Install devtools for development (optional)
echo "🛠️ Installing development tools..."
npm install --save-dev @tanstack/react-query-devtools@^5.0.0

# Install additional utilities if not already present
echo "📋 Checking for additional dependencies..."

# Check if lodash is installed (for debouncing and utilities)
if ! npm list lodash > /dev/null 2>&1; then
    echo "📦 Installing lodash..."
    npm install lodash
    npm install --save-dev @types/lodash
fi

# Check if async storage is installed (for persistence)
if ! npm list @react-native-async-storage/async-storage > /dev/null 2>&1; then
    echo "📦 Installing AsyncStorage..."
    npm install @react-native-async-storage/async-storage
fi

echo "✅ TanStack Query v5 installation completed!"
echo ""
echo "📋 Next steps:"
echo "1. Wrap your app with QueryProvider"
echo "2. Replace existing data fetching with TanStack Query hooks"
echo "3. Configure environment variables for Redis integration"
echo "4. Test the integration with your existing stories feature"
echo ""
echo "🔧 Configuration files created:"
echo "- lib/query/queryKeys.ts"
echo "- lib/query/queryClient.ts" 
echo "- lib/query/QueryProvider.tsx"
echo ""
echo "📖 See TANSTACK_QUERY_INTEGRATION_GUIDE.md for detailed setup instructions"
