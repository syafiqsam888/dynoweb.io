# dynoweb.io - Hybrid Telegram Bot

A sophisticated Telegram bot that intelligently handles file uploads based on size:
- **Files ≤ 20MB**: Direct upload to Dropbox with download links
- **Files > 20MB**: Secure storage in Telegram channel with streaming/download links

## Features

- 🔄 Automatic file size detection and smart routing
- 📤 Dropbox integration for small files (≤20MB)
- 📂 Telegram channel storage for large files (>20MB, up to 4GB)
- 🔒 Secure hash-based access for large files
- 🎥 Streamable links for large media files
- ⬇️ Direct download links for all files
- 🛡️ Comprehensive error handling
- 📱 Support for all file types (documents, videos, photos, audio)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHANNEL_ID=-100xxxxxxxxx
DROPBOX_TOKEN_URL=your_dropbox_token_url_here
BOT_SECRET=your_webhook_secret_here
SIA_SECRET=your_file_hash_secret_here
PORT=3000
WEBHOOK_URL=https://your-domain.com
```

### 3. Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11` |
| `TELEGRAM_CHANNEL_ID` | Channel ID for storing large files | `-100123456789` |
| `DROPBOX_TOKEN_URL` | URL endpoint for Dropbox token management | `https://api.example.com/dropbox/token` |
| `BOT_SECRET` | Secret for securing webhook endpoint | `your-secure-webhook-secret` |
| `SIA_SECRET` | Secret for generating file access hashes | `your-secure-hash-secret` |
| `PORT` | Server port (optional, default: 3000) | `3000` |
| `WEBHOOK_URL` | Your domain for webhook setup (optional) | `https://yourdomain.com` |

### 4. Telegram Setup

1. Create a bot with @BotFather and get the bot token
2. Create a channel and add your bot as an administrator
3. Get the channel ID (format: -100xxxxxxxxx)

### 5. Dropbox Setup

Set up a Dropbox token management endpoint that returns:
```json
{
  "access_token": "your_dropbox_access_token"
}
```

## Usage

### Start the Bot

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

### Bot Commands

- `/start` - Welcome message and bot introduction
- `/help` - Help information and feature overview
- `/status` - Bot status and statistics

### File Upload Process

1. **Send any file** to the bot
2. **Automatic detection**: Bot determines file size
3. **Smart routing**:
   - ≤20MB: Uploads to Dropbox, returns download links
   - >20MB: Stores in Telegram channel, returns streaming + download links
4. **Secure access**: Large files get unique hash-based URLs

## API Endpoints

### Health Check
```
GET /health
```
Returns bot status and statistics.

### File Streaming (Large Files)
```
GET /stream/:hash
```
Streams file content for in-browser viewing/playing.

### File Download (Large Files)
```
GET /download/:hash
```
Downloads file with proper filename.

### Webhook (Internal)
```
POST /webhook/:secret
```
Telegram webhook endpoint (secured with BOT_SECRET).

## File Size Handling

| File Size | Method | Storage | Access Method |
|-----------|--------|---------|---------------|
| ≤ 20MB | Dropbox Upload | Dropbox Cloud | Direct HTTP links |
| > 20MB | Channel Storage | Telegram Channel | Hash-based secure links |

## Security Features

- 🔐 Hash-based file access (SHA-256)
- 🛡️ Webhook secret protection
- 🔒 Unique access URLs per file/user combination
- ⚡ No permanent file metadata storage (memory-based)

## Error Handling

The bot includes comprehensive error handling for:
- File size detection failures
- Dropbox upload errors
- Telegram API rate limits
- Network connectivity issues
- Invalid file formats
- Webhook security validation

## Development

### Project Structure

```
├── hybrid-telegram-bot.js    # Main bot implementation
├── package.json             # Dependencies and scripts
├── .env.example            # Environment configuration template
└── README.md              # This documentation
```

### Key Functions

- `processFile()` - Main file processing logic
- `uploadToDropbox()` - Handles small file uploads
- `storeInChannel()` - Handles large file storage
- `generateFileHash()` - Creates secure access hashes

## Deployment

### Environment Variables for Production

Ensure all required environment variables are set in your production environment.

### Webhook vs Polling

- **Webhook** (recommended for production): Set `WEBHOOK_URL`
- **Polling** (development/fallback): Leave `WEBHOOK_URL` empty

### Memory Considerations

The bot stores file metadata in memory. For production with many files, consider implementing database storage by replacing the `fileStore` Map with a persistent database solution.

## License

MIT License - See the LICENSE file for details.