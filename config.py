# Telegram Bot Configuration
BOT_CONFIG = {
    "max_small_file_size": 20 * 1024 * 1024,  # 20MB
    "max_total_file_size": 4 * 1024 * 1024 * 1024,  # 4GB
    "chunk_size": 8 * 1024 * 1024,  # 8MB
    "retry_attempts": 3,
    "retry_delay": 5,  # seconds
    "dropbox_upload_path": "/",  # Root folder
    "supported_file_types": [
        "document",
        "photo", 
        "video",
        "audio"
    ],
    "log_level": "INFO",
    "webhook_enabled": False,
    "webhook_url": None,
    "webhook_port": 8443
}