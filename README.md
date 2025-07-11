# Telegram Large File Upload Bot

A powerful Telegram bot that handles file uploads up to 4GB by bypassing the Bot API's 20MB limitation through direct Telegram CDN streaming.

## Features

🚀 **Large File Support**: Upload files up to 4GB (Telegram's limit)
📦 **Dual Upload Strategy**: 
- Files ≤ 20MB: Direct Bot API upload
- Files > 20MB: Stream directly from Telegram CDN
☁️ **Dropbox Integration**: All files are stored in Dropbox
🔄 **Automatic Detection**: Bot automatically chooses the best upload method
❌ **No Additional Setup**: No channels or extra secrets required
📊 **Progress Tracking**: Real-time upload progress for large files

## How It Works

### Small Files (≤ 20MB)
1. User sends file to bot
2. Bot downloads file using `getFile` API
3. File is uploaded directly to Dropbox
4. User receives confirmation

### Large Files (> 20MB)
1. User sends file to bot
2. Bot gets direct file URL from Telegram CDN
3. File is streamed in chunks directly to Dropbox
4. Progress is shown to user during upload
5. User receives confirmation when complete

## Installation

### Requirements
- Python 3.8+
- Telegram Bot Token (from @BotFather)
- Dropbox access token or token URL

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/syafiqsam888/dynoweb.io.git
cd dynoweb.io
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your actual tokens
```

4. **Set environment variables**
```bash
export TELEGRAM_BOT_TOKEN="your_bot_token_here"
export DROPBOX_TOKEN_URL="https://your-token-server.com/dropbox-token"
```

5. **Start the bot**
```bash
# Using the startup script
./start_bot.sh

# Or directly with Python
python telegram_bot.py
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | ✅ Yes |
| `DROPBOX_TOKEN_URL` | URL that returns Dropbox access token | ✅ Yes |

## Bot Commands

- `/start` - Start the bot and see welcome message
- `/help` - Show help and usage instructions  
- `/status` - Check bot status and connection info

## Supported File Types

- 📄 Documents (PDF, DOC, etc.)
- 🖼️ Images (JPG, PNG, GIF, etc.)
- 🎥 Videos (MP4, AVI, MOV, etc.)
- 🎵 Audio (MP3, WAV, FLAC, etc.)

## Technical Details

### File Size Limits
- **Telegram Bot API**: 20MB maximum
- **Telegram CDN Direct**: Up to 4GB (Telegram's file limit)
- **Bot Implementation**: Automatically handles both methods

### Upload Process
```
File Upload Flow:

User sends file → Bot checks size → Choose method:

≤ 20MB: Bot API → getFile() → Download → Upload to Dropbox
> 20MB: Direct CDN → Stream URL → Chunk upload → Upload to Dropbox
```

### Configuration
- **Chunk Size**: 8MB (configurable in `config.py`)
- **Retry Attempts**: 3 attempts with 5-second delays
- **Progress Updates**: Real-time for large files
- **Error Handling**: Comprehensive error messages

## Testing

Run the test suite:
```bash
python test_bot.py
```

## Security Considerations

- ✅ Environment variables for sensitive data
- ✅ No hardcoded tokens or secrets
- ✅ Proper error handling without exposing internals
- ✅ Dropbox token fetched from secure URL
- ✅ No file content logging

## Troubleshooting

### Common Issues

**Bot not responding**
- Check `TELEGRAM_BOT_TOKEN` is set correctly
- Verify bot token with @BotFather

**Dropbox upload fails**
- Verify `DROPBOX_TOKEN_URL` returns valid token
- Check Dropbox token permissions
- Ensure sufficient Dropbox storage space

**Large file upload fails**
- Check internet connection stability
- Verify file is under 4GB limit
- Try uploading smaller test file first

**Memory issues**
- Large files are streamed, not loaded into memory
- Adjust `CHUNK_SIZE` in config if needed
- Monitor system resources during uploads

### Logs
The bot provides detailed logging. Check console output for:
- Connection status
- Upload progress
- Error details
- Performance metrics

## Deployment

### Docker (Recommended)
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["python", "telegram_bot.py"]
```

### Environment Variables in Production
```bash
# Set in your deployment environment
TELEGRAM_BOT_TOKEN=your_actual_bot_token
DROPBOX_TOKEN_URL=https://your-secure-token-endpoint.com/token
```

### Cloud Deployment
- **Heroku**: Use environment variables in dashboard
- **AWS**: Use Parameter Store or Secrets Manager
- **Railway**: Set in environment variables section
- **Render**: Configure in environment settings

## API Reference

### TelegramFileBot Class

#### Methods
- `initialize_dropbox()`: Setup Dropbox client
- `process_file()`: Main file processing logic
- `upload_small_file()`: Handle files ≤ 20MB
- `upload_large_file()`: Handle files > 20MB with streaming
- `format_file_size()`: Human-readable file sizes

#### Configuration
```python
MAX_SMALL_FILE_SIZE = 20 * 1024 * 1024  # 20MB
MAX_TELEGRAM_FILE_SIZE = 4 * 1024 * 1024 * 1024  # 4GB
CHUNK_SIZE = 8 * 1024 * 1024  # 8MB
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 Issues: [GitHub Issues](https://github.com/syafiqsam888/dynoweb.io/issues)
- 📖 Documentation: This README
- 💬 Discussions: [GitHub Discussions](https://github.com/syafiqsam888/dynoweb.io/discussions)

---

**Note**: This bot provides a drop-in solution for handling large file uploads without requiring Telegram channels or additional secrets. It's designed to be simple to deploy and maintain while providing robust file handling capabilities.