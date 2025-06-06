// Minutes of Meeting Generator - Main JavaScript File

// API Configuration
const API_BASE_URL = 'http://localhost:5001/api';

class MinutesGenerator {
    constructor() {
        this.currentMethod = 'file';
        this.selectedFile = null;
        this.isProcessing = false;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.updateGenerateButton();
        
        // Check backend health
        const health = await this.checkBackendHealth();
        if (health.status !== 'healthy') {
            this.showError('Backend server is not running. Please start the Python server first.');
        } else if (!health.openai_configured) {
            this.showError('OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable.');
        }
    }

    setupEventListeners() {
        // Method selection
        document.querySelectorAll('.method-card').forEach(card => {
            card.addEventListener('click', (e) => this.switchMethod(e.target.closest('.method-card')));
        });

        // File input
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileSelect(e));
        
        // URL input
        document.getElementById('urlInput').addEventListener('input', () => this.updateGenerateButton());
        
        // Generate button
        document.getElementById('generateBtn').addEventListener('click', () => this.generateMinutes());
        
        // Action buttons
        document.getElementById('downloadBtn')?.addEventListener('click', () => this.downloadPDF());
        document.getElementById('copyBtn')?.addEventListener('click', () => this.copyToClipboard());
        document.getElementById('editBtn')?.addEventListener('click', () => this.enableEditing());
        document.getElementById('newMeetingBtn')?.addEventListener('click', () => this.resetForm());
    }

    setupDragAndDrop() {
        const dropZone = document.getElementById('dropZone');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
        });

        dropZone.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    switchMethod(card) {
        // Remove active class from all cards
        document.querySelectorAll('.method-card').forEach(c => c.classList.remove('active'));
        
        // Add active class to selected card
        card.classList.add('active');
        
        // Get method type
        this.currentMethod = card.dataset.method;
        
        // Show/hide appropriate sections
        document.getElementById('file-section').style.display = this.currentMethod === 'file' ? 'block' : 'none';
        document.getElementById('url-section').style.display = this.currentMethod === 'url' ? 'block' : 'none';
        
        // Reset form
        this.resetInputs();
        this.updateGenerateButton();
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    processFile(file) {
        // Validate file type
        const validTypes = ['audio/', 'video/'];
        const isValid = validTypes.some(type => file.type.startsWith(type));
        
        if (!isValid) {
            this.showError('Please select a valid audio or video file.');
            return;
        }

        // Validate file size (max 500MB)
        const maxSize = 500 * 1024 * 1024; // 500MB
        if (file.size > maxSize) {
            this.showError('File size must be less than 500MB.');
            return;
        }

        this.selectedFile = file;
        this.displayFileInfo(file);
        this.updateGenerateButton();
    }

    displayFileInfo(file) {
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        
        fileName.textContent = file.name;
        fileSize.textContent = this.formatFileSize(file.size);
        fileInfo.style.display = 'block';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateGenerateButton() {
        const generateBtn = document.getElementById('generateBtn');
        let isValid = false;
        
        if (this.currentMethod === 'file') {
            isValid = this.selectedFile !== null;
        } else if (this.currentMethod === 'url') {
            const urlInput = document.getElementById('urlInput').value.trim();
            isValid = this.isValidUrl(urlInput);
        }
        
        generateBtn.disabled = !isValid || this.isProcessing;
    }

    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    async generateMinutes() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showProgressSection();
        
        try {
            let processingData = {};
            
            if (this.currentMethod === 'file') {
                // Step 1: Upload file
                await this.updateProgress(1, 'Uploading file...', 25, 'Preparing your content for processing...');
                const uploadResult = await this.uploadFile(this.selectedFile);
                processingData = {
                    type: 'file',
                    filepath: uploadResult.filepath,
                    custom_instructions: document.getElementById('customInstructions').value.trim(),
                    options: this.getSelectedOptions()
                };
            } else {
                // Step 1: Prepare URL processing
                await this.updateProgress(1, 'Preparing URL processing...', 25, 'Preparing your content for processing...');
                processingData = {
                    type: 'url',
                    url: document.getElementById('urlInput').value.trim(),
                    custom_instructions: document.getElementById('customInstructions').value.trim(),
                    options: this.getSelectedOptions()
                };
            }
            
            // Step 2: Transcription
            await this.updateProgress(2, 'Transcribing audio content...', 50, 'Converting speech to text using AI...');
            
            // Step 3: AI Analysis
            await this.updateProgress(3, 'Analyzing content with AI...', 75, 'Identifying key topics and speakers...');
            
            // Step 4: Generate Minutes
            await this.updateProgress(4, 'Generating meeting minutes...', 85, 'Creating structured meeting summary...');
            
            // Step 5: Translation (if needed)
            if (processingData.outputLanguage && processingData.outputLanguage !== 'auto') {
                await this.updateProgress(5, 'Translating content...', 95, 'Converting to selected language...');
                await this.delay(2500);
            }
            
            // Process with backend
            const result = await this.processWithBackend(processingData);
            
            await this.updateProgress(processingData.outputLanguage && processingData.outputLanguage !== 'auto' ? 5 : 4, 'Finalizing results...', 100, 'Your meeting minutes are ready!');
            await this.delay(500);
            
            // Show results
            this.showResults(result.minutes);
            
        } catch (error) {
            this.showError(error.message || 'An error occurred while processing your content. Please try again.');
            console.error('Processing error:', error);
        } finally {
            this.isProcessing = false;
            this.updateGenerateButton();
        }
    }

    async updateProgress(step, text, percentage, details = '') {
        const estimatedTimes = [10, 15, 30, 25]; // Estimated seconds for each step
        const remainingTime = estimatedTimes.slice(step).reduce((a, b) => a + b, 0);
        
        // Update progress bar
        document.getElementById('progressFill').style.width = percentage + '%';
        
        // Update progress text
        document.getElementById('progressText').textContent = text;
        
        // Update progress percentage
        const progressPercentage = document.getElementById('progressPercentage');
        if (progressPercentage) progressPercentage.textContent = `${Math.round(percentage)}%`;
        
        // Update progress details
        const progressDetails = document.getElementById('progressDetails');
        if (progressDetails && details) progressDetails.textContent = details;
        
        // Add or update time estimate
        let progressTime = document.getElementById('progressTime');
        if (!progressTime) {
            progressTime = document.createElement('div');
            progressTime.id = 'progressTime';
            progressTime.className = 'progress-time';
            progressDetails.parentNode.appendChild(progressTime);
        }
        
        if (remainingTime > 0) {
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            const timeText = minutes > 0 ? `${minutes}m ${seconds}s remaining` : `${seconds}s remaining`;
            progressTime.textContent = timeText;
        } else {
            progressTime.textContent = 'Almost done...';
        }
        
        // Update step indicators
        for (let i = 1; i <= 4; i++) {
            const stepElement = document.getElementById(`step${i}`);
            stepElement.classList.remove('active', 'completed');
            
            if (i < step) {
                stepElement.classList.add('completed');
            } else if (i === step) {
                stepElement.classList.add('active');
            }
        }
        
        await this.delay(500);
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }
        
        return await response.json();
    }
    
    async processWithBackend(data) {
        const endpoint = data.type === 'url' ? `${API_BASE_URL}/process-url` : `${API_BASE_URL}/process`;
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Processing failed');
        }
        
        return await response.json();
    }

    getSampleTranscription() {
        return {
            duration: "45:32",
            speakers: ["John Smith (Project Manager)", "Sarah Johnson (Developer)", "Mike Chen (Designer)", "Lisa Brown (QA Lead)"],
            content: [
                {
                    timestamp: "00:02:15",
                    speaker: "John Smith",
                    text: "Good morning everyone. Let's start today's sprint planning meeting. We have several important items to discuss regarding the upcoming product release."
                },
                {
                    timestamp: "00:03:45",
                    speaker: "Sarah Johnson",
                    text: "I've completed the user authentication module. The API endpoints are ready and tested. However, we need to discuss the password reset functionality."
                },
                {
                    timestamp: "00:05:20",
                    speaker: "Mike Chen",
                    text: "The new UI designs are finalized. I've updated the design system with the new components. The mobile responsiveness has been improved significantly."
                },
                {
                    timestamp: "00:07:10",
                    speaker: "Lisa Brown",
                    text: "I've identified three critical bugs in the payment processing module. Two are fixed, but one requires immediate attention before the release."
                },
                {
                    timestamp: "00:15:30",
                    speaker: "John Smith",
                    text: "Based on our discussion, I'm assigning the payment bug to Sarah. Mike, please prepare the final design assets by Friday. Lisa, continue with the regression testing."
                },
                {
                    timestamp: "00:25:45",
                    speaker: "Sarah Johnson",
                    text: "I'll need access to the production logs to debug the payment issue. Can we schedule a deployment window for Thursday?"
                },
                {
                    timestamp: "00:35:20",
                    speaker: "John Smith",
                    text: "Let's schedule the deployment for Thursday at 2 PM. Everyone should be available for monitoring. Any other concerns before we wrap up?"
                }
            ]
        };
    }

    getSampleTranscriptionFromUrl(url) {
        // Customize transcription based on URL type
        const transcription = this.getSampleTranscription();
        transcription.source = url;
        return transcription;
    }

    async checkBackendHealth() {
        try {
            const response = await fetch(`${API_BASE_URL}/health`);
            const health = await response.json();
            return health;
        } catch (error) {
            console.error('Backend health check failed:', error);
            return { status: 'unhealthy', openai_configured: false };
        }
    }

    getSelectedOptions() {
        const options = {
            includeTimestamps: document.getElementById('includeTimestamps')?.checked || false,
            identifySpeakers: document.getElementById('identifySpeakers')?.checked || false,
            extractActionItems: document.getElementById('extractActionItems')?.checked || false,
            summarizeDecisions: document.getElementById('summarizeDecisions')?.checked || false,
            outputLanguage: document.getElementById('outputLanguage')?.value || 'en'
        };
        
        console.log('Selected processing options:', options);
        
        // Show user which options are selected
        const selectedOptionsText = Object.entries(options)
            .filter(([key, value]) => value)
            .map(([key, value]) => {
                switch(key) {
                    case 'includeTimestamps': return 'Include Timestamps';
                    case 'identifySpeakers': return 'Identify Speakers';
                    case 'extractActionItems': return 'Extract Action Items';
                    case 'summarizeDecisions': return 'Summarize Decisions';
                    default: return key;
                }
            })
            .join(', ');
            
        if (selectedOptionsText) {
            console.log('Active processing options:', selectedOptionsText);
        } else {
            console.log('No additional processing options selected');
        }
        
        return options;
    }

    createMinutesDocument(transcription, customInstructions, options) {
        const date = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Get translated content based on output language
        const content = this.getTranslatedContent(options.outputLanguage || 'en');
        
        let minutes = `<h1>${content.title}</h1>`;
        minutes += `<p><strong>${content.date}:</strong> ${date}</p>`;
        minutes += `<p><strong>${content.duration}:</strong> ${transcription.duration}</p>`;
        
        if (options.identifySpeakers && transcription.speakers) {
            minutes += `<p><strong>${content.attendees}:</strong></p><ul>`;
            transcription.speakers.forEach(speaker => {
                minutes += `<li>${speaker}</li>`;
            });
            minutes += `</ul>`;
        }
        
        if (customInstructions) {
            minutes += `<h2>${content.customFocus}</h2>`;
            minutes += `<p><em>${customInstructions}</em></p>`;
        }
        
        minutes += `<h2>${content.summary}</h2>`;
        minutes += `<p>${content.summaryText}</p>`;
        
        if (options.summarizeDecisions) {
            minutes += `<h2>${content.decisions}</h2>`;
            minutes += `<div class="decision">`;
            minutes += `<strong>${content.deploymentSchedule}:</strong> ${content.deploymentText}`;
            minutes += `</div>`;
            minutes += `<div class="decision">`;
            minutes += `<strong>${content.bugPriority}:</strong> ${content.bugText}`;
            minutes += `</div>`;
        }
        
        if (options.extractActionItems) {
            minutes += `<h2>${content.actionItems}</h2>`;
            content.actionItemsList.forEach(item => {
                minutes += `<div class="action-item">`;
                minutes += `<strong>${item.person}:</strong> ${item.task}`;
                minutes += `</div>`;
            });
        }
        
        minutes += `<h2>${content.discussionPoints}</h2>`;
        
        transcription.content.forEach(item => {
            if (options.includeTimestamps) {
                minutes += `<p><span class="timestamp">[${item.timestamp}]</span> `;
            }
            if (options.identifySpeakers) {
                minutes += `<span class="speaker">${item.speaker}:</span> `;
            }
            minutes += `${item.text}</p>`;
        });
        
        minutes += `<h2>${content.nextSteps}</h2>`;
        minutes += `<ul>`;
        content.nextStepsList.forEach(step => {
            minutes += `<li>${step}</li>`;
        });
        minutes += `</ul>`;
        
        return minutes;
    }

    getTranslatedContent(language) {
        const translations = {
            en: {
                title: 'Meeting Minutes',
                date: 'Date',
                duration: 'Duration',
                attendees: 'Attendees',
                customFocus: 'Custom Focus Areas',
                summary: 'Meeting Summary',
                summaryText: 'This sprint planning meeting covered key updates on the upcoming product release. The team discussed progress on various modules including user authentication, UI design improvements, and quality assurance findings.',
                decisions: 'Key Decisions',
                deploymentSchedule: 'Deployment Schedule',
                deploymentText: 'Thursday at 2 PM with full team monitoring',
                bugPriority: 'Bug Priority',
                bugText: 'Payment processing bug assigned highest priority for immediate resolution',
                actionItems: 'Action Items',
                actionItemsList: [
                    { person: 'Sarah Johnson', task: 'Fix critical payment processing bug, requires production log access' },
                    { person: 'Mike Chen', task: 'Prepare final design assets by Friday' },
                    { person: 'Lisa Brown', task: 'Continue regression testing and monitor deployment' },
                    { person: 'John Smith', task: 'Coordinate Thursday deployment window and team availability' }
                ],
                discussionPoints: 'Discussion Points',
                nextSteps: 'Next Steps',
                nextStepsList: [
                    'Monitor payment bug resolution progress',
                    'Prepare for Thursday deployment',
                    'Complete final design asset preparation',
                    'Continue regression testing'
                ]
            },
            es: {
                title: 'Acta de Reunión',
                date: 'Fecha',
                duration: 'Duración',
                attendees: 'Asistentes',
                customFocus: 'Áreas de Enfoque Personalizado',
                summary: 'Resumen de la Reunión',
                summaryText: 'Esta reunión de planificación de sprint cubrió actualizaciones clave sobre el próximo lanzamiento del producto. El equipo discutió el progreso en varios módulos incluyendo autenticación de usuarios, mejoras de diseño de UI y hallazgos de aseguramiento de calidad.',
                decisions: 'Decisiones Clave',
                deploymentSchedule: 'Cronograma de Implementación',
                deploymentText: 'Jueves a las 2 PM con monitoreo completo del equipo',
                bugPriority: 'Prioridad de Errores',
                bugText: 'Error de procesamiento de pagos asignado máxima prioridad para resolución inmediata',
                actionItems: 'Elementos de Acción',
                actionItemsList: [
                    { person: 'Sarah Johnson', task: 'Corregir error crítico de procesamiento de pagos, requiere acceso a registros de producción' },
                    { person: 'Mike Chen', task: 'Preparar activos de diseño final para el viernes' },
                    { person: 'Lisa Brown', task: 'Continuar pruebas de regresión y monitorear implementación' },
                    { person: 'John Smith', task: 'Coordinar ventana de implementación del jueves y disponibilidad del equipo' }
                ],
                discussionPoints: 'Puntos de Discusión',
                nextSteps: 'Próximos Pasos',
                nextStepsList: [
                    'Monitorear progreso de resolución de errores de pago',
                    'Prepararse para implementación del jueves',
                    'Completar preparación de activos de diseño final',
                    'Continuar pruebas de regresión'
                ]
            },
            fr: {
                title: 'Procès-verbal de Réunion',
                date: 'Date',
                duration: 'Durée',
                attendees: 'Participants',
                customFocus: 'Domaines de Focus Personnalisés',
                summary: 'Résumé de la Réunion',
                summaryText: 'Cette réunion de planification de sprint a couvert les mises à jour clés sur la prochaine version du produit. L\'équipe a discuté des progrès sur divers modules incluant l\'authentification des utilisateurs, les améliorations de conception UI et les résultats d\'assurance qualité.',
                decisions: 'Décisions Clés',
                deploymentSchedule: 'Planning de Déploiement',
                deploymentText: 'Jeudi à 14h avec surveillance complète de l\'équipe',
                bugPriority: 'Priorité des Bugs',
                bugText: 'Bug de traitement des paiements assigné priorité maximale pour résolution immédiate',
                actionItems: 'Éléments d\'Action',
                actionItemsList: [
                    { person: 'Sarah Johnson', task: 'Corriger le bug critique de traitement des paiements, nécessite accès aux logs de production' },
                    { person: 'Mike Chen', task: 'Préparer les actifs de conception finale pour vendredi' },
                    { person: 'Lisa Brown', task: 'Continuer les tests de régression et surveiller le déploiement' },
                    { person: 'John Smith', task: 'Coordonner la fenêtre de déploiement de jeudi et la disponibilité de l\'équipe' }
                ],
                discussionPoints: 'Points de Discussion',
                nextSteps: 'Prochaines Étapes',
                nextStepsList: [
                    'Surveiller le progrès de résolution du bug de paiement',
                    'Se préparer pour le déploiement de jeudi',
                    'Compléter la préparation des actifs de conception finale',
                    'Continuer les tests de régression'
                ]
            }
        };
        
        // Return English as default if language not found
        return translations[language] || translations.en;
    }

    showProgressSection() {
        document.querySelector('.upload-section').style.display = 'none';
        document.getElementById('progressSection').style.display = 'block';
        document.getElementById('progressSection').classList.add('fade-in');
    }

    showResults(minutes) {
        document.getElementById('progressSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('minutesContent').innerHTML = minutes;
        document.getElementById('resultsSection').classList.add('slide-up');
    }

    resetForm() {
        // Hide results and progress sections
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('progressSection').style.display = 'none';
        
        // Show upload section
        document.querySelector('.upload-section').style.display = 'block';
        
        // Reset inputs
        this.resetInputs();
        
        // Reset state
        this.selectedFile = null;
        this.isProcessing = false;
        
        // Update button
        this.updateGenerateButton();
    }

    resetInputs() {
        document.getElementById('fileInput').value = '';
        document.getElementById('urlInput').value = '';
        document.getElementById('customInstructions').value = '';
        document.getElementById('fileInfo').style.display = 'none';
    }

    downloadPDF() {
        const content = document.getElementById('minutesContent').innerHTML;
        
        if (!content || content.trim() === '') {
            this.showError('No content to download. Please generate minutes first.');
            return;
        }
        
        try {
            let doc;
            
            // Check if jsPDF is available (try different loading methods)
            if (typeof window.jspdf !== 'undefined' && window.jspdf.jsPDF) {
                const { jsPDF } = window.jspdf;
                doc = new jsPDF();
            } else if (typeof window.jsPDF !== 'undefined') {
                doc = new window.jsPDF();
            } else {
                console.log('jsPDF not found, falling back to text download');
                this.downloadAsText();
                return;
            }
            
            // Convert HTML to text for PDF with proper formatting
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            
            // Process the content to preserve structure
            let textContent = '';
            const processNode = (node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    textContent += node.textContent;
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const tagName = node.tagName.toLowerCase();
                    
                    // Add line breaks for block elements
                    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'li'].includes(tagName)) {
                        if (textContent && !textContent.endsWith('\n')) {
                            textContent += '\n';
                        }
                    }
                    
                    // Process child nodes
                    for (let child of node.childNodes) {
                        processNode(child);
                    }
                    
                    // Add line breaks after block elements
                    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'li'].includes(tagName)) {
                        textContent += '\n';
                    }
                    
                    // Add extra line break after headings
                    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                        textContent += '\n';
                    }
                }
            };
            
            processNode(tempDiv);
            
            // Clean up the text content
            const cleanText = textContent
                .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
                .replace(/^\s+|\s+$/g, '') // Trim start and end
                .replace(/[ \t]+/g, ' '); // Normalize spaces
            
            // Set font and size
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            
            // Split text into lines that fit the PDF width
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;
            const maxLineWidth = pageWidth - (margin * 2);
            
            const lines = doc.splitTextToSize(cleanText, maxLineWidth);
            
            // Add title
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Meeting Minutes', margin, 20);
            
            // Add content
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            
            let yPosition = 35;
            const lineHeight = 6;
            const pageHeight = doc.internal.pageSize.getHeight();
            
            for (let i = 0; i < lines.length; i++) {
                if (yPosition + lineHeight > pageHeight - margin) {
                    doc.addPage();
                    yPosition = margin;
                }
                
                doc.text(lines[i], margin, yPosition);
                yPosition += lineHeight;
            }
            
            // Download the PDF
            doc.save('meeting-minutes.pdf');
            
            this.showSuccess('PDF downloaded successfully!');
        } catch (error) {
            console.error('Error generating PDF:', error);
            // Fallback to text download
            this.downloadAsText();
        }
    }
    
    downloadAsText() {
        const content = document.getElementById('minutesContent').innerHTML;
        
        // Convert HTML to text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        
        // Create and download text file
        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'meeting-minutes.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccess('Minutes downloaded as text file!');
    }

    async copyToClipboard() {
        const content = document.getElementById('minutesContent').innerText;
        
        try {
            await navigator.clipboard.writeText(content);
            this.showSuccess('Minutes copied to clipboard!');
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = content;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showSuccess('Minutes copied to clipboard!');
        }
    }

    enableEditing() {
        const minutesContent = document.getElementById('minutesContent');
        minutesContent.contentEditable = true;
        minutesContent.style.border = '2px dashed #1a1a1a';
        minutesContent.focus();
        
        // Add save button
        const saveBtn = document.createElement('button');
        saveBtn.className = 'action-btn';
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        saveBtn.onclick = () => this.saveEdits();
        
        const actionsContainer = document.querySelector('.results-actions');
        actionsContainer.appendChild(saveBtn);
        
        this.showSuccess('Editing enabled. Click anywhere in the content to make changes.');
    }

    saveEdits() {
        const minutesContent = document.getElementById('minutesContent');
        minutesContent.contentEditable = false;
        minutesContent.style.border = '1px solid #e2e8f0';
        
        // Remove save button
        const saveBtn = document.querySelector('.results-actions button:last-child');
        if (saveBtn && saveBtn.textContent.includes('Save')) {
            saveBtn.remove();
        }
        
        this.showSuccess('Changes saved successfully!');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            background: type === 'error' ? '#e53e3e' : '#38a169',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: '1000',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            maxWidth: '400px',
            animation: 'slideInRight 0.3s ease-out'
        });
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Add notification animations to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MinutesGenerator();
});