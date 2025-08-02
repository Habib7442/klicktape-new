#!/bin/bash

# ============================================================================
# EAS Environment Variables Setup Script for Klicktape
# ============================================================================
# 
# This script helps you set up secure environment variables for your
# Klicktape app using EAS Environment Variables.
# 
# SECURITY: This script sets sensitive variables with 'secret' visibility
# to ensure they are not exposed in the client bundle.
# 
# ============================================================================

echo "🔒 Setting up secure EAS Environment Variables for Klicktape"
echo "============================================================================"

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI is not installed. Please install it first:"
    echo "   npm install -g @expo/eas-cli"
    exit 1
fi

# Check if user is logged in
if ! eas whoami &> /dev/null; then
    echo "❌ You are not logged in to EAS. Please login first:"
    echo "   eas login"
    exit 1
fi

echo "✅ EAS CLI is ready"
echo ""

# Function to create environment variable
create_env_var() {
    local name=$1
    local environment=$2
    local visibility=$3
    local description=$4
    
    echo "📝 Setting up $name for $environment environment..."
    read -p "Enter value for $name ($description): " -s value
    echo ""
    
    if [ -n "$value" ]; then
        eas env:create --name "$name" --value "$value" --environment "$environment" --visibility "$visibility"
        echo "✅ $name set for $environment environment"
    else
        echo "⚠️  Skipping $name (no value provided)"
    fi
    echo ""
}

# Function to setup environment
setup_environment() {
    local env=$1
    echo "🌍 Setting up $env environment variables..."
    echo "----------------------------------------"
    
    # Redis Token (CRITICAL - must be secret)
    create_env_var "UPSTASH_REDIS_REST_TOKEN" "$env" "secret" "Redis authentication token from Upstash dashboard"
    

    
    # Supabase Service Role Key (CRITICAL - must be secret)
    create_env_var "SUPABASE_SERVICE_ROLE_KEY" "$env" "secret" "Supabase service role key (admin access)"
    
    # App Variant (for dynamic configuration)
    if [ "$env" != "production" ]; then
        eas env:create --name "APP_VARIANT" --value "$env" --environment "$env" --visibility "plain text"
        echo "✅ APP_VARIANT set to $env"
        echo ""
    fi
}

# Main setup
echo "This script will set up environment variables for all environments."
echo "You'll be prompted to enter values for each sensitive variable."
echo ""
echo "⚠️  IMPORTANT: Never share these values or commit them to version control!"
echo ""

read -p "Continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

echo ""
echo "🚀 Starting environment setup..."
echo ""

# Setup each environment
setup_environment "development"
setup_environment "preview" 
setup_environment "production"

echo "============================================================================"
echo "✅ EAS Environment Variables setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Verify variables: eas env:list"
echo "2. Test development build: eas build --platform ios --profile development"
echo "3. Test production build: eas build --platform all --profile production"
echo ""
echo "🔒 Security reminders:"
echo "- Remove sensitive variables from .env files for production"
echo "- Use 'eas env:pull --environment development' for local development"
echo "- Regularly rotate API keys and update EAS environment variables"
echo ""
echo "📚 Documentation: docs/SECURITY_ENVIRONMENT_VARIABLES.md"
echo "============================================================================"
