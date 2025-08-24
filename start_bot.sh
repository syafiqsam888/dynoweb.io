#!/bin/bash
# Simple startup script for the Telegram bot

echo "Starting Telegram File Upload Bot..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Check environment variables
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "ERROR: TELEGRAM_BOT_TOKEN environment variable is not set"
    exit 1
fi

if [ -z "$DROPBOX_TOKEN_URL" ]; then
    echo "ERROR: DROPBOX_TOKEN_URL environment variable is not set"
    exit 1
fi

echo "Environment variables:"
echo "TELEGRAM_BOT_TOKEN: Set (${#TELEGRAM_BOT_TOKEN} characters)"
echo "DROPBOX_TOKEN_URL: $DROPBOX_TOKEN_URL"

# Start the bot
echo "Starting bot..."
python telegram_bot.py