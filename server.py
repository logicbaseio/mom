#!/usr/bin/env python3
"""
Minutes of Meeting Generator - Backend Server
Handles real-time video/audio processing with OpenAI APIs
"""

import os
import json
import tempfile
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import openai
from moviepy.editor import VideoFileClip
import yt_dlp
from werkzeug.utils import secure_filename
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Configuration
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB
ALLOWED_EXTENSIONS = {
    'audio': {'mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'},
    'video': {'mp4', 'avi', 'mov', 'wmv', 'mkv', 'webm'}
}

# OpenAI API configuration
# Set your OpenAI API key as an environment variable: export OPENAI_API_KEY="your-key-here"
openai.api_key = os.getenv('OPENAI_API_KEY')

if not openai.api_key:
    logger.warning("OpenAI API key not found. Set OPENAI_API_KEY environment variable.")

class MinutesProcessor:
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp()
        
    def is_allowed_file(self, filename: str) -> bool:
        """Check if file extension is allowed"""
        if '.' not in filename:
            return False
        ext = filename.rsplit('.', 1)[1].lower()
        return ext in ALLOWED_EXTENSIONS['audio'] or ext in ALLOWED_EXTENSIONS['video']
    
    def extract_audio_from_video(self, video_path: str) -> str:
        """Extract audio from video file"""
        try:
            video = VideoFileClip(video_path)
            audio_path = os.path.join(self.temp_dir, 'extracted_audio.wav')
            video.audio.write_audiofile(audio_path, verbose=False, logger=None)
            video.close()
            return audio_path
        except Exception as e:
            logger.error(f"Error extracting audio: {str(e)}")
            raise
    
    def download_from_url(self, url: str) -> str:
        """Download audio/video from URL"""
        try:
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': os.path.join(self.temp_dir, '%(title)s.%(ext)s'),
                'extractaudio': True,
                'audioformat': 'wav',
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'referer': 'https://www.youtube.com/',
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-us,en;q=0.5',
                    'Accept-Encoding': 'gzip,deflate',
                    'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.7',
                    'Connection': 'keep-alive',
                },
                'extractor_retries': 3,
                'fragment_retries': 3,
                'retry_sleep_functions': {'http': lambda n: min(4 ** n, 60)},
                # Enhanced options for better YouTube compatibility
                'ignoreerrors': True,
                'no_warnings': True,
                'extract_flat': False,
                'writesubtitles': False,
                'writeautomaticsub': False,
                # Additional headers for better authentication
                'age_limit': None,
                'geo_bypass': True,
                'geo_bypass_country': 'US',
                # Use embedded player for better access
                'youtube_include_dash_manifest': False,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)
                return filename
        except Exception as e:
            logger.error(f"Error downloading from URL: {str(e)}")
            raise
    
    async def transcribe_audio(self, audio_path: str) -> Dict[str, Any]:
        """Transcribe audio using OpenAI Whisper"""
        try:
            with open(audio_path, 'rb') as audio_file:
                transcript = await asyncio.to_thread(
                    openai.Audio.transcribe,
                    model="whisper-1",
                    file=audio_file,
                    response_format="verbose_json",
                    timestamp_granularities=["segment"]
                )
            
            return {
                'text': transcript['text'],
                'segments': transcript.get('segments', []),
                'duration': transcript.get('duration', 0)
            }
        except Exception as e:
            logger.error(f"Error transcribing audio: {str(e)}")
            raise
    
    async def analyze_with_gpt4(self, transcription: Dict[str, Any], custom_instructions: str = "", options: Dict[str, bool] = None) -> str:
        """Analyze transcription using GPT-4"""
        if options is None:
            options = {
                'include_timestamps': True,
                'identify_speakers': True,
                'extract_action_items': True,
                'summarize_decisions': True
            }
        
        # Build the prompt
        prompt = f"""
You are an expert meeting minutes generator. Analyze the following meeting transcription and create professional, structured meeting minutes.

{f"CUSTOM INSTRUCTIONS: {custom_instructions}" if custom_instructions else ""}

TRANSCRIPTION:
{transcription['text']}

{"SEGMENTS WITH TIMESTAMPS:" if transcription.get('segments') else ""}
{self._format_segments(transcription.get('segments', [])) if transcription.get('segments') else ""}

Please generate meeting minutes in HTML format with the following structure:
1. Meeting Summary (2-3 sentences overview)
2. Key Decisions (if any important decisions were made)
3. Action Items (specific tasks with responsible parties if identifiable)
4. Discussion Points (main topics covered)
5. Next Steps (follow-up actions)

Formatting requirements:
- Use proper HTML tags (h1, h2, h3, p, ul, li, strong, em)
- {"Include timestamps where relevant" if options.get('include_timestamps') else "Do not include timestamps"}
- {"Try to identify different speakers" if options.get('identify_speakers') else "Do not focus on speaker identification"}
- {"Highlight action items clearly" if options.get('extract_action_items') else "Do not emphasize action items specifically"}
- {"Emphasize decisions made" if options.get('summarize_decisions') else "Do not emphasize decisions specifically"}
- Use professional, business-appropriate language
- Make it concise but comprehensive
"""
        
        try:
            response = await asyncio.to_thread(
                openai.ChatCompletion.create,
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a professional meeting minutes generator with expertise in creating structured, actionable meeting summaries."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.3
            )
            
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error analyzing with GPT-4: {str(e)}")
            raise
    
    def _format_segments(self, segments: list) -> str:
        """Format transcription segments with timestamps"""
        formatted = []
        for segment in segments:
            start_time = self._format_timestamp(segment.get('start', 0))
            text = segment.get('text', '').strip()
            formatted.append(f"[{start_time}] {text}")
        return "\n".join(formatted)
    
    def _format_timestamp(self, seconds: float) -> str:
        """Convert seconds to MM:SS format"""
        minutes = int(seconds // 60)
        seconds = int(seconds % 60)
        return f"{minutes:02d}:{seconds:02d}"
    
    def transcribe_audio_sync(self, audio_path: str) -> Dict[str, Any]:
        """Synchronous wrapper for transcribe_audio"""
        try:
            # Check file size and adjust timeout accordingly
            file_size = os.path.getsize(audio_path)
            # Set timeout based on file size: 60s base + 30s per 10MB
            timeout = min(300, 60 + (file_size // (10 * 1024 * 1024)) * 30)
            
            with open(audio_path, 'rb') as audio_file:
                transcript = openai.Audio.transcribe(
                    model="whisper-1",
                    file=audio_file,
                    response_format="verbose_json",
                    timestamp_granularities=["segment"],
                    request_timeout=timeout
                )
            
            return {
                'text': transcript['text'],
                'segments': transcript.get('segments', []),
                'duration': transcript.get('duration', 0)
            }
        except Exception as e:
            logger.error(f"Error transcribing audio: {str(e)}")
            # If it's a timeout error, provide a more helpful message
            if "timeout" in str(e).lower():
                raise Exception(f"Audio transcription timed out. File may be too large or network is slow. Try with a smaller file or check your internet connection.")
            raise
    
    def analyze_with_gpt4_sync(self, transcription: Dict[str, Any], custom_instructions: str = "", options: Dict[str, bool] = None) -> str:
        """Synchronous wrapper for analyze_with_gpt4"""
        if options is None:
            options = {
                'includeTimestamps': False,
                'identifySpeakers': False,
                'extractActionItems': False,
                'summarizeDecisions': False
            }
        
        # Extract options with correct parameter names
        include_timestamps = options.get('includeTimestamps', False)
        identify_speakers = options.get('identifySpeakers', False)
        extract_action_items = options.get('extractActionItems', False)
        summarize_decisions = options.get('summarizeDecisions', False)
        
        logger.info(f"Processing with options: {options}")
        
        # Build the prompt with enhanced instructions based on selected options
        prompt_parts = [
            "You are an expert meeting minutes generator. Analyze the following meeting transcription and create professional, structured meeting minutes."
        ]
        
        if custom_instructions:
            prompt_parts.append(f"\nCUSTOM INSTRUCTIONS: {custom_instructions}")
        
        prompt_parts.append(f"\nTRANSCRIPTION:\n{transcription['text']}")
        
        if transcription.get('segments') and include_timestamps:
            prompt_parts.append(f"\nSEGMENTS WITH TIMESTAMPS:\n{self._format_segments(transcription.get('segments', []))}")
        
        # Structure requirements
        structure_parts = ["\nPlease generate meeting minutes in HTML format with the following structure:"]
        structure_parts.append("1. Meeting Summary (2-3 sentences overview)")
        
        if identify_speakers:
            structure_parts.append("2. Attendees/Speakers (list of identified participants)")
        
        structure_parts.append("3. Discussion Points (main topics covered)")
        
        if summarize_decisions:
            structure_parts.append("4. Key Decisions (important decisions made during the meeting)")
        
        if extract_action_items:
            structure_parts.append("5. Action Items (specific tasks with responsible parties if identifiable)")
        
        structure_parts.append("6. Next Steps (follow-up actions)")
        
        prompt_parts.extend(structure_parts)
        
        # Formatting requirements
        formatting_parts = ["\nFormatting requirements:"]
        formatting_parts.append("- Use proper HTML tags (h1, h2, h3, p, ul, li, strong, em)")
        
        if include_timestamps:
            formatting_parts.append("- IMPORTANT: Include timestamps where relevant throughout the minutes")
        else:
            formatting_parts.append("- Do not include timestamps")
        
        if identify_speakers:
            formatting_parts.append("- IMPORTANT: Identify and label different speakers throughout the discussion")
        else:
            formatting_parts.append("- Do not focus on speaker identification")
        
        if extract_action_items:
            formatting_parts.append("- IMPORTANT: Create a dedicated Action Items section with clear tasks and responsible parties")
        else:
            formatting_parts.append("- Do not emphasize action items specifically")
        
        if summarize_decisions:
            formatting_parts.append("- IMPORTANT: Create a dedicated Key Decisions section highlighting all decisions made")
        else:
            formatting_parts.append("- Do not emphasize decisions specifically")
        
        formatting_parts.extend([
            "- Use professional, business-appropriate language",
            "- Make it concise but comprehensive",
            "- Ensure all requested features are clearly implemented"
        ])
        
        prompt_parts.extend(formatting_parts)
        
        # Add processing note
        applied_features = []
        if include_timestamps: applied_features.append("timestamps")
        if identify_speakers: applied_features.append("speaker identification")
        if extract_action_items: applied_features.append("action items extraction")
        if summarize_decisions: applied_features.append("decision summarization")
        
        if applied_features:
            prompt_parts.append(f"\nIMPORTANT: The user has specifically requested these features: {', '.join(applied_features)}. Make sure to implement them clearly.")
        
        prompt = "\n".join(prompt_parts)
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a professional meeting minutes generator with expertise in creating structured, actionable meeting summaries."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.3,
                request_timeout=120  # 2 minutes timeout for GPT-4 analysis
            )
            
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error analyzing with GPT-4: {str(e)}")
            raise
    
    def cleanup(self):
        """Clean up temporary files"""
        import shutil
        try:
            shutil.rmtree(self.temp_dir)
        except Exception as e:
            logger.error(f"Error cleaning up temp files: {str(e)}")

# Global processor instance
processor = MinutesProcessor()

@app.route('/')
def serve_frontend():
    """Serve the main HTML file"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    return send_from_directory('.', filename)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file upload"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not processor.is_allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        # Save uploaded file
        filename = secure_filename(file.filename)
        filepath = os.path.join(processor.temp_dir, filename)
        file.save(filepath)
        
        # Check file size
        if os.path.getsize(filepath) > MAX_FILE_SIZE:
            os.remove(filepath)
            return jsonify({'error': 'File too large (max 500MB)'}), 400
        
        return jsonify({
            'success': True,
            'filename': filename,
            'filepath': filepath,
            'size': os.path.getsize(filepath)
        })
    
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        return jsonify({'error': 'Upload failed'}), 500

@app.route('/api/process', methods=['POST'])
def process_content():
    """Process uploaded file or URL"""
    try:
        data = request.get_json()
        
        if not openai.api_key:
            return jsonify({'error': 'OpenAI API key not configured'}), 500
        
        input_type = data.get('type')  # 'file' or 'url'
        custom_instructions = data.get('custom_instructions', '')
        options = data.get('options', {})
        
        audio_path = None
        
        if input_type == 'file':
            filepath = data.get('filepath')
            if not filepath or not os.path.exists(filepath):
                return jsonify({'error': 'File not found'}), 400
            
            # Check if it's a video file that needs audio extraction
            ext = filepath.rsplit('.', 1)[1].lower()
            if ext in ALLOWED_EXTENSIONS['video']:
                audio_path = processor.extract_audio_from_video(filepath)
            else:
                audio_path = filepath
        
        elif input_type == 'url':
            url = data.get('url')
            if not url:
                return jsonify({'error': 'URL not provided'}), 400
            
            audio_path = processor.download_from_url(url)
        
        else:
            return jsonify({'error': 'Invalid input type'}), 400
        
        # Transcribe audio
        transcription = processor.transcribe_audio_sync(audio_path)
        
        # Generate minutes using GPT-4
        minutes_html = processor.analyze_with_gpt4_sync(
            transcription, custom_instructions, options
        )
        
        return jsonify({
            'success': True,
            'transcription': transcription,
            'minutes': minutes_html,
            'duration': transcription.get('duration', 0),
            'processed_at': datetime.now().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Processing error: {str(e)}")
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500

@app.route('/api/process-url', methods=['POST'])
def process_url():
    """Process content from URL"""
    try:
        data = request.get_json()
        url = data.get('url')
        custom_instructions = data.get('custom_instructions', '')
        options = data.get('options', {})
        
        if not url:
            return jsonify({'error': 'URL not provided'}), 400
        
        if not openai.api_key:
            return jsonify({'error': 'OpenAI API key not configured'}), 500
        
        # Download and process
        audio_path = processor.download_from_url(url)
        transcription = processor.transcribe_audio_sync(audio_path)
        minutes_html = processor.analyze_with_gpt4_sync(
            transcription, custom_instructions, options
        )
        
        return jsonify({
            'success': True,
            'transcription': transcription,
            'minutes': minutes_html,
            'duration': transcription.get('duration', 0),
            'processed_at': datetime.now().isoformat()
        })
    
    except Exception as e:
        logger.error(f"URL processing error: {str(e)}")
        return jsonify({'error': f'URL processing failed: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'openai_configured': bool(openai.api_key),
        'timestamp': datetime.now().isoformat()
    })

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large'}), 413

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    try:
        port = int(os.getenv('PORT', 5001))
        print("Starting Minutes of Meeting Generator Server...")
        print(f"OpenAI API configured: {bool(openai.api_key)}")
        print(f"Server will be available at: http://0.0.0.0:{port}")
        print("\nTo set up OpenAI API key:")
        print("export OPENAI_API_KEY='your-api-key-here'")
        print("\nPress Ctrl+C to stop the server")
        
        app.run(host='0.0.0.0', port=port, debug=False)
    except KeyboardInterrupt:
        print("\nShutting down server...")
        processor.cleanup()
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        processor.cleanup()