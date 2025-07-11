/**
 * Hybrid Telegram Bot
 * Handles files ≤ 20MB via Dropbox upload
 * Handles files > 20MB via Telegram channel storage with streamable links
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

// Configuration
const config = {
    telegramToken: process.env.TELEGRAM_BOT_TOKEN,
    channelId: process.env.TELEGRAM_CHANNEL_ID,
    dropboxTokenUrl: process.env.DROPBOX_TOKEN_URL,
    botSecret: process.env.BOT_SECRET,
    siaSecret: process.env.SIA_SECRET,
    maxFileSize: 20 * 1024 * 1024, // 20MB in bytes
    port: process.env.PORT || 3000,
    webhookUrl: process.env.WEBHOOK_URL
};

// Validate required environment variables
const requiredEnvVars = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHANNEL_ID', 'DROPBOX_TOKEN_URL', 'BOT_SECRET', 'SIA_SECRET'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`❌ Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}

// Initialize bot and express app
const bot = new TelegramBot(config.telegramToken);
const app = express();

// Middleware
app.use(express.json());

// Store for file metadata (in production, use a database)
const fileStore = new Map();

/**
 * Generate secure hash for file access
 */
function generateFileHash(fileId, userId) {
    const data = `${fileId}_${userId}_${config.siaSecret}`;
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Get file size from Telegram
 */
async function getFileSize(fileId) {
    try {
        const file = await bot.getFile(fileId);
        return file.file_size || 0;
    } catch (error) {
        console.error('Error getting file size:', error);
        return 0;
    }
}

/**
 * Upload file to Dropbox
 */
async function uploadToDropbox(fileUrl, fileName, userId) {
    try {
        console.log(`📤 Uploading ${fileName} to Dropbox for user ${userId}`);
        
        // Download file from Telegram
        const response = await axios.get(fileUrl, { responseType: 'stream' });
        
        // Get Dropbox access token
        const tokenResponse = await axios.get(config.dropboxTokenUrl);
        const accessToken = tokenResponse.data.access_token;
        
        // Upload to Dropbox
        const uploadResponse = await axios.post(
            'https://content.dropboxapi.com/2/files/upload',
            response.data,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Dropbox-API-Arg': JSON.stringify({
                        path: `/${fileName}`,
                        mode: 'add',
                        autorename: true
                    }),
                    'Content-Type': 'application/octet-stream'
                }
            }
        );
        
        // Create sharing link
        const shareResponse = await axios.post(
            'https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings',
            {
                path: uploadResponse.data.path_lower,
                settings: {
                    requested_visibility: 'public'
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return {
            success: true,
            downloadUrl: shareResponse.data.url.replace('dl=0', 'dl=1'),
            directUrl: shareResponse.data.url
        };
        
    } catch (error) {
        console.error('Dropbox upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Store file in Telegram channel
 */
async function storeInChannel(msg, fileId, fileName, fileSize) {
    try {
        console.log(`📤 Storing ${fileName} in Telegram channel for user ${msg.from.id}`);
        
        // Forward the entire message to channel
        const channelMessage = await bot.forwardMessage(config.channelId, msg.chat.id, msg.message_id);
        
        // Generate secure hash
        const hash = generateFileHash(channelMessage.message_id, msg.from.id);
        
        // Store metadata including the original file ID for easier access
        const metadata = {
            messageId: channelMessage.message_id,
            originalFileId: fileId,
            fileName,
            fileSize,
            userId: msg.from.id,
            uploadTime: Date.now(),
            hash
        };
        
        fileStore.set(hash, metadata);
        
        // Generate streamable URLs
        const baseUrl = config.webhookUrl || `http://localhost:${config.port}`;
        const streamUrl = `${baseUrl}/stream/${hash}`;
        const downloadUrl = `${baseUrl}/download/${hash}`;
        
        return {
            success: true,
            streamUrl,
            downloadUrl,
            hash,
            fileSize
        };
        
    } catch (error) {
        console.error('Channel storage error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Process uploaded file
 */
async function processFile(msg, fileId, fileName, mimeType) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
        // Get file size
        const fileSize = await getFileSize(fileId);
        
        if (fileSize === 0) {
            await bot.sendMessage(chatId, '❌ Unable to determine file size. Please try again.');
            return;
        }
        
        // Send processing message
        const processingMsg = await bot.sendMessage(
            chatId, 
            `🔄 Processing ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)...`
        );
        
        let result;
        
        if (fileSize <= config.maxFileSize) {
            // Small file: Upload to Dropbox
            const fileUrl = await bot.getFileLink(fileId);
            result = await uploadToDropbox(fileUrl, fileName, userId);
            
            if (result.success) {
                await bot.editMessageText(
                    `✅ File uploaded to Dropbox!\n\n` +
                    `📁 **${fileName}**\n` +
                    `📊 Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB\n\n` +
                    `🔗 [Download Link](${result.downloadUrl})\n` +
                    `🌐 [Direct Link](${result.directUrl})`,
                    {
                        chat_id: chatId,
                        message_id: processingMsg.message_id,
                        parse_mode: 'Markdown'
                    }
                );
            } else {
                await bot.editMessageText(
                    `❌ Dropbox upload failed: ${result.error}`,
                    {
                        chat_id: chatId,
                        message_id: processingMsg.message_id
                    }
                );
            }
        } else {
            // Large file: Store in channel
            result = await storeInChannel(msg, fileId, fileName, fileSize);
            
            if (result.success) {
                await bot.editMessageText(
                    `✅ Large file stored successfully!\n\n` +
                    `📁 **${fileName}**\n` +
                    `📊 Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB\n` +
                    `🔐 Access Hash: \`${result.hash.substring(0, 8)}...\`\n\n` +
                    `🎥 [Stream Link](${result.streamUrl})\n` +
                    `⬇️ [Download Link](${result.downloadUrl})\n\n` +
                    `ℹ️ Links are secure and unique to your upload.`,
                    {
                        chat_id: chatId,
                        message_id: processingMsg.message_id,
                        parse_mode: 'Markdown'
                    }
                );
            } else {
                await bot.editMessageText(
                    `❌ Channel storage failed: ${result.error}`,
                    {
                        chat_id: chatId,
                        message_id: processingMsg.message_id
                    }
                );
            }
        }
        
    } catch (error) {
        console.error('File processing error:', error);
        await bot.sendMessage(chatId, `❌ Error processing file: ${error.message}`);
    }
}

// Bot event handlers
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    
    if (msg.text) {
        if (msg.text.startsWith('/start')) {
            await bot.sendMessage(
                chatId,
                `🤖 **Hybrid File Upload Bot**\n\n` +
                `📤 Send me any file and I'll handle it intelligently:\n\n` +
                `🟢 **Files ≤ 20MB**: Uploaded to Dropbox\n` +
                `🔵 **Files > 20MB**: Stored in secure channel with streaming links\n\n` +
                `✅ Supported: Documents, Videos, Photos, Audio\n` +
                `🔒 Large files get secure hash-based access\n\n` +
                `Just send me a file to get started!`,
                { parse_mode: 'Markdown' }
            );
        } else if (msg.text.startsWith('/help')) {
            await bot.sendMessage(
                chatId,
                `🆘 **Help & Information**\n\n` +
                `**File Size Limits:**\n` +
                `• Small files (≤20MB): Direct Dropbox upload\n` +
                `• Large files (>20MB): Telegram channel storage\n\n` +
                `**Features:**\n` +
                `• Automatic size detection\n` +
                `• Secure hash-based access for large files\n` +
                `• Stream and download links\n` +
                `• Support for all file types\n\n` +
                `**Commands:**\n` +
                `/start - Welcome message\n` +
                `/help - This help message\n` +
                `/status - Bot status`,
                { parse_mode: 'Markdown' }
            );
        } else if (msg.text.startsWith('/status')) {
            const uptime = process.uptime();
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            
            await bot.sendMessage(
                chatId,
                `📊 **Bot Status**\n\n` +
                `✅ Bot is running\n` +
                `⏱️ Uptime: ${hours}h ${minutes}m\n` +
                `📁 Files in store: ${fileStore.size}\n` +
                `🔧 Max file size: ${config.maxFileSize / 1024 / 1024}MB`,
                { parse_mode: 'Markdown' }
            );
        }
        return;
    }
    
    // Handle file uploads
    let fileId, fileName, mimeType;
    
    if (msg.document) {
        fileId = msg.document.file_id;
        fileName = msg.document.file_name || 'document';
        mimeType = msg.document.mime_type;
    } else if (msg.video) {
        fileId = msg.video.file_id;
        fileName = msg.video.file_name || `video_${Date.now()}.mp4`;
        mimeType = msg.video.mime_type;
    } else if (msg.photo) {
        const photo = msg.photo[msg.photo.length - 1]; // Get highest resolution
        fileId = photo.file_id;
        fileName = `photo_${Date.now()}.jpg`;
        mimeType = 'image/jpeg';
    } else if (msg.audio) {
        fileId = msg.audio.file_id;
        fileName = msg.audio.file_name || `audio_${Date.now()}.mp3`;
        mimeType = msg.audio.mime_type;
    } else if (msg.voice) {
        fileId = msg.voice.file_id;
        fileName = `voice_${Date.now()}.ogg`;
        mimeType = msg.voice.mime_type;
    } else if (msg.video_note) {
        fileId = msg.video_note.file_id;
        fileName = `video_note_${Date.now()}.mp4`;
        mimeType = 'video/mp4';
    }
    
    if (fileId) {
        await processFile(msg, fileId, fileName, mimeType);
    }
});

// Express routes for file streaming/downloading
app.get('/stream/:hash', async (req, res) => {
    const hash = req.params.hash;
    const metadata = fileStore.get(hash);
    
    if (!metadata) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    try {
        // Use the original file ID to get the file
        const file = await bot.getFile(metadata.originalFileId);
        const fileUrl = `https://api.telegram.org/file/bot${config.telegramToken}/${file.file_path}`;
        
        // Stream the file
        const response = await axios.get(fileUrl, { responseType: 'stream' });
        
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${metadata.fileName}"`);
        
        response.data.pipe(res);
        
    } catch (error) {
        console.error('Streaming error:', error);
        res.status(500).json({ error: 'Failed to stream file' });
    }
});

app.get('/download/:hash', async (req, res) => {
    const hash = req.params.hash;
    const metadata = fileStore.get(hash);
    
    if (!metadata) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    try {
        // Use the original file ID to get the file
        const file = await bot.getFile(metadata.originalFileId);
        const fileUrl = `https://api.telegram.org/file/bot${config.telegramToken}/${file.file_path}`;
        
        // Download the file
        const response = await axios.get(fileUrl, { responseType: 'stream' });
        
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${metadata.fileName}"`);
        
        response.data.pipe(res);
        
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        filesStored: fileStore.size,
        timestamp: new Date().toISOString()
    });
});

// Webhook endpoint
app.post(`/webhook/${config.botSecret}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Setup webhook
async function setupWebhook() {
    if (config.webhookUrl) {
        try {
            const webhookUrl = `${config.webhookUrl}/webhook/${config.botSecret}`;
            await bot.setWebHook(webhookUrl);
            console.log('✅ Webhook set up successfully');
        } catch (error) {
            console.error('❌ Webhook setup failed:', error);
            console.log('🔄 Falling back to polling...');
            bot.startPolling();
        }
    } else {
        console.log('🔄 Starting polling mode...');
        bot.startPolling();
    }
}

// Error handling
bot.on('error', (error) => {
    console.error('Bot error:', error);
});

bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});

// Start the application
async function start() {
    try {
        // Start Express server
        app.listen(config.port, () => {
            console.log(`🚀 Server running on port ${config.port}`);
        });
        
        // Setup Telegram webhook or polling
        await setupWebhook();
        
        console.log('✅ Hybrid Telegram Bot started successfully!');
        console.log(`📊 Max file size for Dropbox: ${config.maxFileSize / 1024 / 1024}MB`);
        console.log(`📂 Channel ID: ${config.channelId}`);
        
    } catch (error) {
        console.error('❌ Failed to start bot:', error);
        process.exit(1);
    }
}

// Start the bot
start();

module.exports = { app, bot };