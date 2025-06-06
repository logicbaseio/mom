# Real-Time Minutes of Meeting Generator - Setup Guide

This guide will help you set up the Minutes of Meeting Generator with real AI-powered transcription and analysis capabilities.

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)
```bash
# Navigate to the project directory
cd "/Users/apple/Trae Projects/Minutes Of Meeting"

# Run the setup script
./setup.sh
```

### Option 2: Manual Setup

#### 1. Install Python Dependencies
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### 2. Install FFmpeg (Required for video processing)
```bash
# macOS (using Homebrew)
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

#### 3. Set OpenAI API Key
```bash
# Get your API key from: https://platform.openai.com/api-keys
export OPENAI_API_KEY="your-api-key-here"

# To make it permanent, add to your shell profile:
echo 'export OPENAI_API_KEY="your-api-key-here"' >> ~/.bashrc
# or for zsh:
echo 'export OPENAI_API_KEY="your-api-key-here"' >> ~/.zshrc
```

## 🏃‍♂️ Running the Application

### Start the Backend Server
```bash
# Activate virtual environment (if not already active)
source venv/bin/activate

# Start the Python backend server
python3 server.py
```

The backend server will start on `http://localhost:5000`

### Access the Application
Open your web browser and navigate to:
- **Backend + Frontend**: `http://localhost:5000`
- **Frontend Only** (if running static server): `http://localhost:8000`

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key for Whisper and GPT-4 |
| `FLASK_ENV` | No | Set to `development` for debug mode |
| `MAX_FILE_SIZE` | No | Maximum upload size (default: 500MB) |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Check server health and configuration |
| `/api/upload` | POST | Upload audio/video files |
| `/api/process` | POST | Process uploaded files |
| `/api/process-url` | POST | Process content from URLs |

## 📁 Project Structure

```
Minutes Of Meeting/
├── index.html          # Frontend interface
├── styles.css          # Styling
├── script.js           # Frontend JavaScript (updated for real API)
├── server.py           # Backend Python server
├── requirements.txt    # Python dependencies
├── setup.sh           # Automated setup script
├── README.md          # Main documentation
├── SETUP_GUIDE.md     # This file
└── venv/              # Virtual environment (created during setup)
```

## 🎯 Features

### Real-Time Processing
- **OpenAI Whisper**: Professional-grade speech-to-text transcription
- **GPT-4 Analysis**: Intelligent content analysis and summarization
- **Multi-format Support**: Audio and video files, YouTube URLs, etc.
- **Progress Tracking**: Real-time processing status updates

### Supported Formats

#### Audio Files
- MP3, WAV, M4A, AAC, OGG, FLAC
- Maximum size: 500MB

#### Video Files
- MP4, AVI, MOV, WMV, MKV, WebM
- Audio extraction for transcription
- Maximum size: 500MB

#### URL Sources
- YouTube videos
- Vimeo content
- Direct media file links
- Other supported platforms via yt-dlp

## 🔍 Testing the Setup

### 1. Health Check
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "openai_configured": true,
  "timestamp": "2024-01-XX..."
}
```

### 2. Test File Upload
1. Open the web interface
2. Upload a small audio/video file
3. Check for successful processing

### 3. Test URL Processing
1. Use a short YouTube video URL
2. Verify transcription and analysis

## 🐛 Troubleshooting

### Common Issues

#### "Backend server is not running"
- Ensure the Python server is started: `python3 server.py`
- Check if port 5000 is available
- Verify virtual environment is activated

#### "OpenAI API key not configured"
- Set the environment variable: `export OPENAI_API_KEY="your-key"`
- Restart the server after setting the key
- Verify the key is valid at https://platform.openai.com

#### "FFmpeg not found"
- Install FFmpeg using your system's package manager
- Ensure FFmpeg is in your system PATH
- Restart the server after installation

#### "File upload failed"
- Check file size (max 500MB)
- Verify file format is supported
- Ensure sufficient disk space

#### "Processing failed"
- Check OpenAI API quota and billing
- Verify internet connection
- Check server logs for detailed error messages

### Debug Mode
```bash
# Run server in debug mode
FLASK_ENV=development python3 server.py
```

### Logs
Server logs will show detailed information about:
- File uploads
- Transcription progress
- API calls
- Error messages

## 💰 Cost Considerations

### OpenAI API Costs
- **Whisper**: ~$0.006 per minute of audio
- **GPT-4**: ~$0.03 per 1K tokens (input) + $0.06 per 1K tokens (output)

### Example Costs
- 30-minute meeting: ~$0.18 (Whisper) + ~$0.50 (GPT-4) = ~$0.68
- 60-minute meeting: ~$0.36 (Whisper) + ~$1.00 (GPT-4) = ~$1.36

*Costs are approximate and may vary based on content complexity and API pricing changes.*

## 🔒 Security Best Practices

### API Key Security
- Never commit API keys to version control
- Use environment variables for sensitive data
- Rotate API keys regularly
- Monitor API usage and costs

### File Upload Security
- Files are processed in temporary directories
- Automatic cleanup after processing
- File type and size validation
- No permanent storage of uploaded content

## 🚀 Production Deployment

### For Production Use
1. **Use a production WSGI server** (e.g., Gunicorn)
2. **Set up reverse proxy** (e.g., Nginx)
3. **Configure HTTPS** for secure file uploads
4. **Implement user authentication**
5. **Set up database** for storing results
6. **Configure monitoring** and logging
7. **Set up backup systems**

### Example Production Setup
```bash
# Install Gunicorn
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 server:app
```

## 📞 Support

### Getting Help
1. Check this guide and README.md
2. Review server logs for error details
3. Verify all dependencies are installed
4. Test with smaller files first
5. Check OpenAI API status and quotas

### Useful Commands
```bash
# Check Python version
python3 --version

# Check pip packages
pip list

# Check FFmpeg
ffmpeg -version

# Test OpenAI API
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
```

---

**Ready to generate professional meeting minutes with real AI power!** 🎉