# DynoWeb Upload by Link

This tool allows you to upload files to Dropbox by providing URLs. It will download files from the provided URLs and upload them directly to your Dropbox account.

## Features

- ✅ **Robust URL validation** using proper URL constructor
- ✅ **Smart filename extraction** that handles:
  - URLs with query parameters (e.g., `?hash=AgADNx`)
  - URL-encoded characters (e.g., `%20` for spaces)
  - Missing filenames with intelligent fallbacks
  - Invalid characters replacement
- ✅ **Enhanced error handling** with specific Dropbox API error messages
- ✅ **Debug logging** for troubleshooting during development
- ✅ **Progress tracking** with real-time status updates
- ✅ **Folder selection** for organizing uploads
- ✅ **Batch processing** of multiple URLs

## Setup

### 1. Get Dropbox Access Token

1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Click "Create app"
3. Choose "Scoped access" and "Full Dropbox"
4. Give your app a name (e.g., "DynoWeb Uploader")
5. Click "Create app"
6. In the app settings, scroll down to "OAuth 2" section
7. Under "Access token expiration", select "No expiration"
8. Click "Generate access token"
9. Copy the generated token

### 2. Configure the Upload Tool

1. Open `upload.html` in a text editor
2. Find the line: `const DROPBOX_ACCESS_TOKEN = 'YOUR_DROPBOX_ACCESS_TOKEN';`
3. Replace `YOUR_DROPBOX_ACCESS_TOKEN` with your actual token
4. Save the file

### 3. Use the Tool

1. Open `upload.html` in a web browser
2. Enter URLs (one per line) in the text area
3. Select the destination folder in your Dropbox
4. Click "Start Upload"
5. Monitor progress and results

## Test Cases

The tool handles various URL formats including:

- `https://tj.tbnbotsnetwork.workers.dev/125617/Extras_for_Chasing_the_Dragon_2025_CHINESE_1080p_WEB_MalaySub.mp4?hash=AgADNx`
- `https://example.com/files/document.pdf`
- `https://cdn.example.com/media/video%20file.mp4`

## Error Handling

The tool provides detailed error messages for:
- Invalid URLs
- Network failures
- Dropbox API errors
- File size limitations (150MB max for single uploads)
- Authentication issues

## Debug Mode

Console logging is enabled by default for troubleshooting. Check browser developer tools for detailed logs.

## Files

- `upload.html` - Main upload interface
- `test-upload.html` - Function tests to verify core functionality
- `README.md` - This documentation

## Browser Compatibility

Requires a modern browser with support for:
- Fetch API
- ES6 features (arrow functions, async/await)
- URL constructor