# Minutes of Meeting Generator

A powerful web-based tool that automatically generates professional meeting minutes from audio files, video files, or video/audio URLs. The application uses AI-powered transcription and intelligent content analysis to create structured, comprehensive meeting summaries.

## Features

### 🎯 Core Functionality
- **Multiple Input Methods**: Upload audio/video files or provide URLs (YouTube, Zoom recordings, etc.)
- **Smart Content Analysis**: AI-powered identification of key discussion points, decisions, and action items
- **Customizable Instructions**: Provide specific guidance on what to focus on during analysis
- **Professional Output**: Generate clean, structured meeting minutes in a professional format

### 📋 Meeting Minutes Include
- **Meeting Summary**: Overview of the main topics discussed
- **Attendee List**: Automatic speaker identification and participant tracking
- **Key Decisions**: Important decisions made during the meeting
- **Action Items**: Tasks assigned with responsible parties
- **Discussion Points**: Detailed conversation flow with timestamps
- **Next Steps**: Follow-up actions and future planning

### ⚙️ Customization Options
- **Include Timestamps**: Add time markers to track when topics were discussed
- **Identify Speakers**: Recognize and label different participants
- **Extract Action Items**: Automatically identify and highlight assigned tasks
- **Summarize Decisions**: Capture and emphasize important decisions made

### 💼 Output Features
- **Download as PDF**: Export minutes in professional PDF format
- **Copy to Clipboard**: Quick copy for sharing or pasting into other documents
- **Inline Editing**: Edit generated content directly in the browser
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## How to Use

### 1. Choose Input Method
- **File Upload**: Drag and drop or browse for audio/video files (max 500MB)
- **URL Input**: Paste links to online recordings or streaming content

### 2. Configure Options
- Select processing preferences (timestamps, speaker identification, etc.)
- Add custom instructions if you want the AI to focus on specific aspects

### 3. Generate Minutes
- Click "Generate Minutes of Meeting" to start processing
- Monitor progress through the 4-stage pipeline:
  1. **Uploading**: Processing your input
  2. **Transcribing**: Converting audio to text
  3. **Analyzing**: AI analysis of content
  4. **Generating**: Creating structured minutes

### 4. Review and Export
- Review the generated minutes
- Edit content if needed
- Download as PDF or copy to clipboard

## Supported File Formats

### Audio Files
- MP3, WAV, M4A, AAC, OGG, FLAC
- Maximum file size: 500MB

### Video Files
- MP4, AVI, MOV, WMV, MKV, WebM
- Audio track will be extracted for transcription
- Maximum file size: 500MB

### URL Sources
- YouTube videos
- Vimeo content
- Zoom cloud recordings
- Direct audio/video file links
- Other streaming platforms

## Technical Implementation

### Current Version (Demo)
This version includes:
- Complete UI/UX implementation
- File handling and validation
- Simulated transcription and AI analysis
- Professional minutes generation
- All export and editing features

### Production Implementation Requirements

To make this a fully functional production tool, you would need to integrate:

#### 1. Transcription Services
```javascript
// Example integration options:
- OpenAI Whisper API
- Google Cloud Speech-to-Text
- Amazon Transcribe
- Azure Cognitive Services Speech
- AssemblyAI
```

#### 2. AI Analysis Services
```javascript
// Example integration options:
- OpenAI GPT-4 API
- Google Cloud Natural Language AI
- Azure Cognitive Services Text Analytics
- AWS Comprehend
- Anthropic Claude API
```

#### 3. Backend Infrastructure
```javascript
// Required backend components:
- File upload handling
- Queue management for processing
- Database for storing results
- User authentication
- API rate limiting
```

#### 4. Additional Features for Production
- User accounts and authentication
- Meeting history and storage
- Team collaboration features
- Integration with calendar systems
- Webhook notifications
- Advanced export options (Word, Excel)
- Multi-language support
- Real-time processing status

## Installation and Setup

### Local Development
1. Clone or download the project files
2. Open `index.html` in a modern web browser
3. No additional setup required for demo version

### Production Deployment
1. Set up a web server (Apache, Nginx, or cloud hosting)
2. Configure HTTPS for secure file uploads
3. Implement backend services for transcription and AI analysis
4. Set up database for user data and meeting storage
5. Configure API keys for external services

## Customization

### Styling
Modify `styles.css` to customize:
- Color scheme and branding
- Layout and spacing
- Mobile responsiveness
- Animation effects

### Functionality
Extend `script.js` to add:
- Additional file format support
- Custom AI prompts
- Integration with external APIs
- Advanced processing options

### Content Templates
Customize meeting minutes templates by modifying the `createMinutesDocument` function to include:
- Company-specific formatting
- Custom sections and fields
- Branding and headers
- Specific terminology

## API Integration Examples

### OpenAI Whisper Integration
```javascript
async function transcribeWithWhisper(audioFile) {
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: formData
    });
    
    return await response.json();
}
```

### GPT-4 Analysis Integration
```javascript
async function analyzeWithGPT4(transcription, customInstructions) {
    const prompt = `
        Analyze this meeting transcription and generate professional minutes:
        ${customInstructions ? `Focus on: ${customInstructions}` : ''}
        
        Transcription: ${transcription}
        
        Please provide:
        1. Meeting summary
        2. Key decisions
        3. Action items with assignees
        4. Important discussion points
    `;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 2000
        })
    });
    
    return await response.json();
}
```

## Security Considerations

### File Upload Security
- Validate file types and sizes
- Scan uploads for malware
- Use secure temporary storage
- Implement rate limiting

### Data Privacy
- Encrypt sensitive meeting content
- Implement secure deletion policies
- Comply with GDPR/privacy regulations
- Use secure API connections (HTTPS)

### API Key Management
- Store API keys securely (environment variables)
- Implement key rotation policies
- Monitor API usage and costs
- Use least-privilege access principles

## Browser Compatibility

- **Chrome**: 80+
- **Firefox**: 75+
- **Safari**: 13+
- **Edge**: 80+
- **Mobile**: iOS Safari 13+, Chrome Mobile 80+

## Performance Optimization

### File Processing
- Implement chunked file uploads
- Use web workers for heavy processing
- Compress audio before transcription
- Cache processed results

### UI/UX Improvements
- Progressive loading indicators
- Offline capability with service workers
- Real-time processing updates
- Keyboard shortcuts for power users

## Contributing

To contribute to this project:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For questions, issues, or feature requests:
- Create an issue in the project repository
- Check the documentation for common solutions
- Review the code comments for implementation details

---

**Note**: This is a demonstration version with simulated AI processing. For production use, integrate with real transcription and AI analysis services as outlined in the technical implementation section.