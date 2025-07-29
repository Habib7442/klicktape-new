# ============================================================================
# EAS Environment Variables Setup Script for Klicktape (PowerShell)
# ============================================================================
# 
# This script helps you set up secure environment variables for your
# Klicktape app using EAS Environment Variables.
# 
# SECURITY: This script sets sensitive variables with 'secret' visibility
# to ensure they are not exposed in the client bundle.
# 
# ============================================================================

Write-Host "🔒 Setting up secure EAS Environment Variables for Klicktape" -ForegroundColor Green
Write-Host "============================================================================"

# Check if EAS CLI is installed
try {
    $null = Get-Command eas -ErrorAction Stop
    Write-Host "✅ EAS CLI is ready" -ForegroundColor Green
} catch {
    Write-Host "❌ EAS CLI is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g @expo/eas-cli"
    exit 1
}

# Check if user is logged in
try {
    $whoami = eas whoami 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Not logged in"
    }
} catch {
    Write-Host "❌ You are not logged in to EAS. Please login first:" -ForegroundColor Red
    Write-Host "   eas login"
    exit 1
}

Write-Host ""

# Function to create environment variable
function Create-EnvVar {
    param(
        [string]$Name,
        [string]$Environment,
        [string]$Visibility,
        [string]$Description
    )
    
    Write-Host "📝 Setting up $Name for $Environment environment..." -ForegroundColor Yellow
    $value = Read-Host "Enter value for $Name ($Description)" -AsSecureString
    $plainValue = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($value))
    
    if ($plainValue) {
        eas env:create --name $Name --value $plainValue --environment $Environment --visibility $Visibility
        Write-Host "✅ $Name set for $Environment environment" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Skipping $Name (no value provided)" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Function to setup environment
function Setup-Environment {
    param([string]$Environment)
    
    Write-Host "🌍 Setting up $Environment environment variables..." -ForegroundColor Cyan
    Write-Host "----------------------------------------"
    
    # Redis Token (CRITICAL - must be secret)
    Create-EnvVar -Name "UPSTASH_REDIS_REST_TOKEN" -Environment $Environment -Visibility "secret" -Description "Redis authentication token from Upstash dashboard"
    
    # Gemini API Key (CRITICAL - must be secret)
    Create-EnvVar -Name "GEMINI_API_KEY" -Environment $Environment -Visibility "secret" -Description "Google Gemini AI API key from AI Studio"
    
    # Supabase Service Role Key (CRITICAL - must be secret)
    Create-EnvVar -Name "SUPABASE_SERVICE_ROLE_KEY" -Environment $Environment -Visibility "secret" -Description "Supabase service role key (admin access)"
    
    # App Variant (for dynamic configuration)
    if ($Environment -ne "production") {
        eas env:create --name "APP_VARIANT" --value $Environment --environment $Environment --visibility "plain text"
        Write-Host "✅ APP_VARIANT set to $Environment" -ForegroundColor Green
        Write-Host ""
    }
}

# Main setup
Write-Host "This script will set up environment variables for all environments."
Write-Host "You'll be prompted to enter values for each sensitive variable."
Write-Host ""
Write-Host "⚠️  IMPORTANT: Never share these values or commit them to version control!" -ForegroundColor Yellow
Write-Host ""

$continue = Read-Host "Continue? (y/N)"
if ($continue -notmatch "^[Yy]$") {
    Write-Host "Setup cancelled."
    exit 0
}

Write-Host ""
Write-Host "🚀 Starting environment setup..." -ForegroundColor Green
Write-Host ""

# Setup each environment
Setup-Environment -Environment "development"
Setup-Environment -Environment "preview"
Setup-Environment -Environment "production"

Write-Host "============================================================================"
Write-Host "✅ EAS Environment Variables setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:"
Write-Host "1. Verify variables: eas env:list"
Write-Host "2. Test development build: eas build --platform ios --profile development"
Write-Host "3. Test production build: eas build --platform all --profile production"
Write-Host ""
Write-Host "🔒 Security reminders:"
Write-Host "- Remove sensitive variables from .env files for production"
Write-Host "- Use 'eas env:pull --environment development' for local development"
Write-Host "- Regularly rotate API keys and update EAS environment variables"
Write-Host ""
Write-Host "📚 Documentation: docs/SECURITY_ENVIRONMENT_VARIABLES.md"
Write-Host "============================================================================"
