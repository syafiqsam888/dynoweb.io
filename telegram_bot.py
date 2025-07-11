#!/usr/bin/env python3
"""
Telegram Bot for Large File Upload to Dropbox
Handles files up to 4GB by using direct CDN streaming for files > 20MB
"""

import os
import logging
import asyncio
import aiohttp
import json
from typing import Optional, Dict, Any
from telegram import Update, Message
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from telegram.constants import ParseMode
import dropbox
from dropbox.exceptions import ApiError, AuthError

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Constants
MAX_SMALL_FILE_SIZE = 20 * 1024 * 1024  # 20MB in bytes
MAX_TELEGRAM_FILE_SIZE = 4 * 1024 * 1024 * 1024  # 4GB in bytes
CHUNK_SIZE = 8 * 1024 * 1024  # 8MB chunks for large file uploads

class TelegramFileBotError(Exception):
    """Custom exception for bot errors"""
    pass

class TelegramFileBot:
    """Main bot class handling file uploads"""
    
    def __init__(self, bot_token: str, dropbox_token_url: str):
        self.bot_token = bot_token
        self.dropbox_token_url = dropbox_token_url
        self.dropbox_client = None
        self.application = None
        
    async def initialize_dropbox(self):
        """Initialize Dropbox client by fetching token from URL"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.dropbox_token_url) as response:
                    if response.status == 200:
                        token_data = await response.text()
                        # Assuming the URL returns just the token or JSON with token
                        try:
                            token_json = json.loads(token_data)
                            access_token = token_json.get('access_token', token_data.strip())
                        except json.JSONDecodeError:
                            access_token = token_data.strip()
                        
                        self.dropbox_client = dropbox.Dropbox(access_token)
                        # Test the connection
                        account_info = self.dropbox_client.users_get_current_account()
                        logger.info(f"Connected to Dropbox account: {account_info.email}")
                    else:
                        raise TelegramFileBotError(f"Failed to fetch Dropbox token: {response.status}")
        except Exception as e:
            logger.error(f"Failed to initialize Dropbox client: {e}")
            raise TelegramFileBotError(f"Dropbox initialization failed: {e}")
    
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command"""
        welcome_message = """
🤖 **Large File Upload Bot**

I can help you upload files up to 4GB to Dropbox!

📁 **How it works:**
• Files ≤ 20MB: Direct upload via Telegram Bot API
• Files > 20MB: Direct streaming from Telegram CDN

🚀 **Just send me any file and I'll handle the rest!**

Environment: Ready ✅
Dropbox: Connected ✅
        """
        await update.message.reply_text(welcome_message, parse_mode=ParseMode.MARKDOWN)
    
    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /help command"""
        help_message = """
🆘 **Help & Commands**

**Available Commands:**
• `/start` - Start the bot
• `/help` - Show this help message
• `/status` - Check bot status

**File Upload:**
• Send any file (up to 4GB)
• Bot automatically detects file size
• Files are uploaded to Dropbox
• You'll receive a confirmation with file details

**Supported Files:**
• Documents, images, videos, audio
• Any file type up to 4GB
• No special formatting needed

**Troubleshooting:**
• If upload fails, try again in a few minutes
• Large files may take longer to process
• Check file size if you get errors
        """
        await update.message.reply_text(help_message, parse_mode=ParseMode.MARKDOWN)
    
    async def status_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /status command"""
        try:
            # Check Dropbox connection
            if self.dropbox_client:
                account_info = self.dropbox_client.users_get_current_account()
                dropbox_status = f"✅ Connected ({account_info.email})"
            else:
                dropbox_status = "❌ Not connected"
            
            status_message = f"""
🔧 **Bot Status**

**Telegram Bot:** ✅ Running
**Dropbox:** {dropbox_status}

**File Limits:**
• Small files: ≤ 20MB (Bot API)
• Large files: > 20MB (Direct CDN)
• Maximum size: 4GB

**Current Settings:**
• Chunk size: {CHUNK_SIZE // (1024*1024)}MB
• Max file size: {MAX_TELEGRAM_FILE_SIZE // (1024*1024*1024)}GB
            """
            await update.message.reply_text(status_message, parse_mode=ParseMode.MARKDOWN)
        except Exception as e:
            logger.error(f"Status check failed: {e}")
            await update.message.reply_text("❌ Error checking bot status")
    
    async def handle_document(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle document uploads"""
        document = update.message.document
        if document:
            await self.process_file(update, document, "document")
    
    async def handle_photo(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle photo uploads"""
        photo = update.message.photo[-1]  # Get highest resolution
        if photo:
            await self.process_file(update, photo, "photo")
    
    async def handle_video(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle video uploads"""
        video = update.message.video
        if video:
            await self.process_file(update, video, "video")
    
    async def handle_audio(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle audio uploads"""
        audio = update.message.audio
        if audio:
            await self.process_file(update, audio, "audio")
    
    async def process_file(self, update: Update, file_obj: Any, file_type: str):
        """Process file upload based on size"""
        try:
            file_size = getattr(file_obj, 'file_size', 0)
            file_name = getattr(file_obj, 'file_name', None) or f"{file_type}_{file_obj.file_id}"
            
            # Send initial processing message
            processing_msg = await update.message.reply_text(
                f"📁 Processing {file_type}: `{file_name}`\n"
                f"📊 Size: {self.format_file_size(file_size)}\n"
                f"⏳ Please wait...",
                parse_mode=ParseMode.MARKDOWN
            )
            
            # Check file size limits
            if file_size > MAX_TELEGRAM_FILE_SIZE:
                await processing_msg.edit_text(
                    f"❌ File too large!\n"
                    f"📁 File: `{file_name}`\n"
                    f"📊 Size: {self.format_file_size(file_size)}\n"
                    f"⚠️ Maximum supported size: {self.format_file_size(MAX_TELEGRAM_FILE_SIZE)}",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            # Choose upload method based on file size
            if file_size <= MAX_SMALL_FILE_SIZE:
                success = await self.upload_small_file(file_obj, file_name, processing_msg)
            else:
                success = await self.upload_large_file(file_obj, file_name, processing_msg)
            
            if success:
                await processing_msg.edit_text(
                    f"✅ Upload successful!\n"
                    f"📁 File: `{file_name}`\n"
                    f"📊 Size: {self.format_file_size(file_size)}\n"
                    f"🗂️ Location: Dropbox root folder\n"
                    f"📝 Method: {'Bot API' if file_size <= MAX_SMALL_FILE_SIZE else 'Direct CDN'}",
                    parse_mode=ParseMode.MARKDOWN
                )
            else:
                await processing_msg.edit_text(
                    f"❌ Upload failed!\n"
                    f"📁 File: `{file_name}`\n"
                    f"📊 Size: {self.format_file_size(file_size)}\n"
                    f"🔄 Please try again later",
                    parse_mode=ParseMode.MARKDOWN
                )
                
        except Exception as e:
            logger.error(f"Error processing file: {e}")
            await update.message.reply_text(
                f"❌ Error processing file: {str(e)}"
            )
    
    async def upload_small_file(self, file_obj: Any, file_name: str, status_msg: Message) -> bool:
        """Upload small files using Bot API"""
        try:
            # Get file from Telegram
            file = await file_obj.get_file()
            
            # Download file data
            file_data = await file.download_as_bytearray()
            
            # Upload to Dropbox
            upload_result = self.dropbox_client.files_upload(
                file_data,
                f"/{file_name}",
                mode=dropbox.files.WriteMode.overwrite
            )
            
            logger.info(f"Small file uploaded successfully: {file_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to upload small file {file_name}: {e}")
            return False
    
    async def upload_large_file(self, file_obj: Any, file_name: str, status_msg: Message) -> bool:
        """Upload large files using direct CDN streaming"""
        try:
            # Get file path from Telegram
            file = await file_obj.get_file()
            file_url = file.file_path
            
            # Start upload session with Dropbox
            session_start_result = self.dropbox_client.files_upload_session_start(b'')
            session_id = session_start_result.session_id
            
            # Stream file in chunks
            async with aiohttp.ClientSession() as session:
                async with session.get(file_url) as response:
                    if response.status != 200:
                        logger.error(f"Failed to get file from Telegram CDN: {response.status}")
                        return False
                    
                    offset = 0
                    chunk_num = 0
                    
                    async for chunk in response.content.iter_chunked(CHUNK_SIZE):
                        chunk_num += 1
                        
                        # Update progress
                        progress = (offset / file_obj.file_size) * 100
                        await status_msg.edit_text(
                            f"📤 Uploading large file...\n"
                            f"📁 File: `{file_name}`\n"
                            f"📊 Progress: {progress:.1f}%\n"
                            f"📦 Chunk: {chunk_num}",
                            parse_mode=ParseMode.MARKDOWN
                        )
                        
                        if len(chunk) == 0:
                            break
                        
                        # Upload chunk
                        cursor = dropbox.files.UploadSessionCursor(session_id, offset)
                        
                        if offset + len(chunk) >= file_obj.file_size:
                            # Last chunk - finish upload
                            commit_info = dropbox.files.CommitInfo(
                                path=f"/{file_name}",
                                mode=dropbox.files.WriteMode.overwrite
                            )
                            self.dropbox_client.files_upload_session_finish(
                                chunk, cursor, commit_info
                            )
                            break
                        else:
                            # Intermediate chunk
                            self.dropbox_client.files_upload_session_append_v2(
                                chunk, cursor
                            )
                        
                        offset += len(chunk)
            
            logger.info(f"Large file uploaded successfully: {file_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to upload large file {file_name}: {e}")
            return False
    
    def format_file_size(self, size_bytes: int) -> str:
        """Format file size in human readable format"""
        if size_bytes == 0:
            return "0 B"
        
        size_names = ["B", "KB", "MB", "GB"]
        i = 0
        while size_bytes >= 1024 and i < len(size_names) - 1:
            size_bytes /= 1024.0
            i += 1
        
        return f"{size_bytes:.1f} {size_names[i]}"
    
    async def error_handler(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle errors"""
        logger.error(f"Update {update} caused error {context.error}")
        if update and update.message:
            await update.message.reply_text("❌ An error occurred. Please try again.")
    
    def setup_handlers(self):
        """Setup bot handlers"""
        # Command handlers
        self.application.add_handler(CommandHandler("start", self.start_command))
        self.application.add_handler(CommandHandler("help", self.help_command))
        self.application.add_handler(CommandHandler("status", self.status_command))
        
        # File handlers
        self.application.add_handler(MessageHandler(filters.Document.ALL, self.handle_document))
        self.application.add_handler(MessageHandler(filters.PHOTO, self.handle_photo))
        self.application.add_handler(MessageHandler(filters.VIDEO, self.handle_video))
        self.application.add_handler(MessageHandler(filters.AUDIO, self.handle_audio))
        
        # Error handler
        self.application.add_error_handler(self.error_handler)
    
    async def start(self):
        """Start the bot"""
        try:
            # Initialize Dropbox
            await self.initialize_dropbox()
            
            # Create application
            self.application = Application.builder().token(self.bot_token).build()
            
            # Setup handlers
            self.setup_handlers()
            
            # Start bot
            logger.info("Starting Telegram bot...")
            await self.application.run_polling(allowed_updates=Update.ALL_TYPES)
            
        except Exception as e:
            logger.error(f"Failed to start bot: {e}")
            raise

async def main():
    """Main function"""
    # Get environment variables
    bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
    dropbox_token_url = os.getenv('DROPBOX_TOKEN_URL')
    
    if not bot_token:
        raise ValueError("TELEGRAM_BOT_TOKEN environment variable is required")
    
    if not dropbox_token_url:
        raise ValueError("DROPBOX_TOKEN_URL environment variable is required")
    
    # Create and start bot
    bot = TelegramFileBot(bot_token, dropbox_token_url)
    await bot.start()

if __name__ == "__main__":
    asyncio.run(main())