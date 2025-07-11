#!/bin/bash

# Hybrid Telegram Bot Startup Script
# This script helps with deployment and configuration validation

set -e

echo "🚀 Hybrid Telegram Bot Startup Script"
echo "======================================"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js installation
echo "🔍 Checking Node.js installation..."
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js found: $NODE_VERSION"
    
    # Check if version is >= 16
    MAJOR_VERSION=$(echo $NODE_VERSION | sed 's/v\([0-9]*\).*/\1/')
    if [ "$MAJOR_VERSION" -ge 16 ]; then
        echo "✅ Node.js version is compatible"
    else
        echo "❌ Node.js version must be >= 16.0.0"
        exit 1
    fi
else
    echo "❌ Node.js not found. Please install Node.js >= 16.0.0"
    exit 1
fi

# Check npm installation
echo "🔍 Checking npm installation..."
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm found: $NPM_VERSION"
else
    echo "❌ npm not found. Please install npm"
    exit 1
fi

# Check if package.json exists
echo "🔍 Checking project files..."
if [ -f "package.json" ]; then
    echo "✅ package.json found"
else
    echo "❌ package.json not found. Run this script from the project directory."
    exit 1
fi

if [ -f "hybrid-telegram-bot.js" ]; then
    echo "✅ hybrid-telegram-bot.js found"
else
    echo "❌ hybrid-telegram-bot.js not found"
    exit 1
fi

# Check environment file
echo "🔍 Checking environment configuration..."
if [ -f ".env" ]; then
    echo "✅ .env file found"
    
    # Check required environment variables
    source .env
    
    REQUIRED_VARS=("TELEGRAM_BOT_TOKEN" "TELEGRAM_CHANNEL_ID" "DROPBOX_TOKEN_URL" "BOT_SECRET" "SIA_SECRET")
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -eq 0 ]; then
        echo "✅ All required environment variables are set"
    else
        echo "❌ Missing required environment variables:"
        for var in "${MISSING_VARS[@]}"; do
            echo "   - $var"
        done
        echo "Please update your .env file"
        exit 1
    fi
else
    echo "⚠️  .env file not found"
    echo "Creating .env from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ .env file created from template"
        echo "⚠️  Please edit .env file with your actual configuration"
        echo "❌ Cannot continue without proper environment configuration"
        exit 1
    else
        echo "❌ .env.example template not found"
        exit 1
    fi
fi

# Install dependencies if needed
echo "🔍 Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules found"
else
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
fi

# Run syntax check
echo "🔍 Checking code syntax..."
if node -c hybrid-telegram-bot.js; then
    echo "✅ Code syntax is valid"
else
    echo "❌ Code syntax errors found"
    exit 1
fi

# Run tests
echo "🧪 Running tests..."
if [ -f "test-bot.js" ]; then
    if node test-bot.js > /dev/null 2>&1; then
        echo "✅ All tests passed"
    else
        echo "❌ Some tests failed"
        echo "Running tests with output:"
        node test-bot.js
        exit 1
    fi
else
    echo "⚠️  Test file not found, skipping tests"
fi

echo ""
echo "🎉 All checks passed! Ready to start the bot."
echo ""
echo "Start options:"
echo "  🔧 Development mode: npm run dev"
echo "  🚀 Production mode:  npm start"
echo ""

# Ask if user wants to start the bot
read -p "Do you want to start the bot now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting bot in production mode..."
    npm start
else
    echo "✅ Setup complete. Start the bot when ready with 'npm start'"
fi