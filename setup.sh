#!/bin/bash

# Minutes of Meeting Generator - Setup Script
# This script sets up the environment for real-time processing

echo "🎯 Minutes of Meeting Generator - Setup"
echo "======================================"

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip3."
    exit 1
fi

echo "✅ pip3 found"

# Create virtual environment
echo "📦 Creating virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📥 Installing Python dependencies..."
pip install -r requirements.txt

echo ""
echo "🔧 Setup Configuration"
echo "====================="

# Check for OpenAI API key
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  OpenAI API key not found in environment variables."
    echo ""
    echo "To set up your OpenAI API key:"
    echo "1. Get your API key from: https://platform.openai.com/api-keys"
    echo "2. Run: export OPENAI_API_KEY='your-api-key-here'"
    echo "3. Or add it to your ~/.bashrc or ~/.zshrc file"
    echo ""
    read -p "Do you want to set the API key now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your OpenAI API key: " api_key
        export OPENAI_API_KEY="$api_key"
        echo "✅ API key set for this session"
        echo "💡 To make it permanent, add this to your shell profile:"
        echo "   export OPENAI_API_KEY='$api_key'"
    fi
else
    echo "✅ OpenAI API key found"
fi

# Check for FFmpeg (required for video processing)
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  FFmpeg not found. This is required for video processing."
    echo ""
    echo "To install FFmpeg:"
    echo "• macOS: brew install ffmpeg"
    echo "• Ubuntu/Debian: sudo apt update && sudo apt install ffmpeg"
    echo "• Windows: Download from https://ffmpeg.org/download.html"
    echo ""
else
    echo "✅ FFmpeg found: $(ffmpeg -version | head -n1)"
fi

echo ""
echo "🚀 Setup Complete!"
echo "================="
echo ""
echo "To start the server:"
echo "1. Activate virtual environment: source venv/bin/activate"
echo "2. Start the server: python3 server.py"
echo "3. Open your browser to: http://localhost:5000"
echo ""
echo "For development with both servers:"
echo "• Backend (Python): python3 server.py (port 5000)"
echo "• Frontend (Static): python3 -m http.server 8000 (port 8000)"
echo ""
echo "📚 Documentation: See README.md for detailed instructions"
echo "🐛 Issues? Check the logs and ensure all dependencies are installed"
echo ""
echo "Happy meeting minute generation! 🎉"