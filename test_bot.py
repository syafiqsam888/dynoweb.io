#!/usr/bin/env python3
"""
Simple test for the Telegram bot functionality
"""

import unittest
import asyncio
import os
from unittest.mock import Mock, AsyncMock, patch
from telegram_bot import TelegramFileBot, MAX_SMALL_FILE_SIZE, MAX_TELEGRAM_FILE_SIZE

class TestTelegramFileBot(unittest.TestCase):
    
    def setUp(self):
        """Set up test fixtures"""
        self.bot_token = "test_token"
        self.dropbox_url = "https://test.com/token"
        self.bot = TelegramFileBot(self.bot_token, self.dropbox_url)
    
    def test_file_size_formatting(self):
        """Test file size formatting"""
        self.assertEqual(self.bot.format_file_size(0), "0 B")
        self.assertEqual(self.bot.format_file_size(1024), "1.0 KB")
        self.assertEqual(self.bot.format_file_size(1024 * 1024), "1.0 MB")
        self.assertEqual(self.bot.format_file_size(1024 * 1024 * 1024), "1.0 GB")
    
    def test_file_size_constants(self):
        """Test file size constants"""
        self.assertEqual(MAX_SMALL_FILE_SIZE, 20 * 1024 * 1024)  # 20MB
        self.assertEqual(MAX_TELEGRAM_FILE_SIZE, 4 * 1024 * 1024 * 1024)  # 4GB
    
    @patch('aiohttp.ClientSession.get')
    async def test_dropbox_initialization(self, mock_get):
        """Test Dropbox client initialization"""
        # Mock successful token fetch
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.text = AsyncMock(return_value='{"access_token": "test_token"}')
        mock_get.return_value.__aenter__.return_value = mock_response
        
        with patch('dropbox.Dropbox') as mock_dropbox:
            mock_client = Mock()
            mock_client.users_get_current_account.return_value = Mock(email="test@example.com")
            mock_dropbox.return_value = mock_client
            
            await self.bot.initialize_dropbox()
            self.assertIsNotNone(self.bot.dropbox_client)
    
    def test_bot_initialization(self):
        """Test bot initialization"""
        self.assertEqual(self.bot.bot_token, self.bot_token)
        self.assertEqual(self.bot.dropbox_token_url, self.dropbox_url)
        self.assertIsNone(self.bot.dropbox_client)
        self.assertIsNone(self.bot.application)

class TestEnvironmentSetup(unittest.TestCase):
    
    def test_required_environment_variables(self):
        """Test that required environment variables are documented"""
        # Check that example file exists and has required variables
        with open('.env.example', 'r') as f:
            content = f.read()
            self.assertIn('TELEGRAM_BOT_TOKEN', content)
            self.assertIn('DROPBOX_TOKEN_URL', content)

def run_async_test(coro):
    """Helper to run async tests"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()

if __name__ == '__main__':
    # Run tests
    unittest.main(verbosity=2)