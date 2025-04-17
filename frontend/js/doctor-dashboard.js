document.addEventListener('DOMContentLoaded', () => {
    // Chat functionality
    const chatMessages = document.querySelector('.chat-messages');
    const chatInput = document.querySelector('.input-wrapper input');
    const sendButton = document.querySelector('.send-button');
    const suggestionChips = document.querySelectorAll('.suggestion-chips button');
    
    // API endpoints and session management
    const API_BASE_URL = 'http://localhost:5002';
    let sessionId = '1'; // Default session ID
    

    // Function to reset chat interface layout - fixes positioning issues when switching views
    function resetChatLayout() {
        const chatInterface = document.querySelector('.chat-interface');
        const inputWrapper = document.querySelector('.input-wrapper');
        const chatMessages = document.querySelector('.chat-messages');
        const mainContent = document.querySelector('.main-content');
        const inputContainer = document.querySelector('.chat-input-container');
        
        if (chatInterface) {
            chatInterface.style.position = 'relative';
            chatInterface.style.height = '100%';
            chatInterface.style.transform = 'none';
        }
        
        if (inputWrapper) {
            inputWrapper.style.position = 'relative';
            inputWrapper.style.bottom = 'auto';
            inputWrapper.style.transform = 'none';
            inputWrapper.style.marginTop = '0';
        }
        
        if (inputContainer) {
            // Ensure input container is fixed at the bottom
            inputContainer.style.position = 'fixed';
            inputContainer.style.bottom = '20px';
            inputContainer.style.left = 'calc(260px + 2rem)'; // Account for sidebar width
            inputContainer.style.right = '2rem';
            
            // Calculate input height for chat messages padding
            const inputHeight = inputContainer.offsetHeight;
            
            if (chatMessages) {
                chatMessages.style.paddingBottom = `${inputHeight + 40}px`;
            }
        }
        
        if (chatMessages) {
            chatMessages.style.flex = '1';
            chatMessages.style.marginBottom = '10px';
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        if (mainContent) {
            // Ensure margin for sidebar is maintained
            mainContent.style.marginLeft = '260px';
        }
    }
    
    // Make resetChatLayout available globally
    window.resetChatLayout = resetChatLayout;
    

    // Check auth status first
    async function setupSessionId() {
        try {
            // Try to get the current user
            const { user, error } = await window.supabaseAuth.getCurrentUser();
            
            if (error || !user) {
                console.warn('User not authenticated, using temporary session');
                // Generate a temporary session ID if not logged in
                sessionId = 'temp_' + Date.now();
                localStorage.setItem('tempChatSessionId', sessionId);
                return;
            }
            
            // For authenticated users, create a user-specific session ID
            const userSpecificKey = `chatSessionId_${user.id}`;
            
            if (localStorage.getItem(userSpecificKey)) {
                sessionId = localStorage.getItem(userSpecificKey);
            } else {
                // Generate a unique user-specific session ID
                sessionId = `user_${user.id}_${Date.now()}`;
                localStorage.setItem(userSpecificKey, sessionId);
            }
            
            console.log(`Using session ID: ${sessionId} for user: ${user.id}`);
        } catch (error) {
            console.error('Error setting up session ID:', error);
            // Fallback to a temporary session
            sessionId = 'temp_' + Date.now();
            localStorage.setItem('tempChatSessionId', sessionId);
        }
    }
    
    // Sample responses for demo/fallback
    const sampleResponses = {
        'Schedule an appointment': 'I can help you schedule an appointment. Please provide the following details:\n1. Preferred date and time\n2. Type of consultation\n3. Any specific doctor preference',
        'Check my medications': 'Here are your current medications:\n1. Metformin (500mg) - Twice daily\n2. Lisinopril (10mg) - Once daily\n3. Atorvastatin (20mg) - Once at bedtime',
        'View my health metrics': 'Your recent health metrics:\n- Heart Rate: 72 bpm (Normal)\n- Blood Pressure: 120/80 mmHg (Normal)\n- Weight: 70 kg (Stable)\n- Temperature: 98.6°F (Normal)',
        'Get mental health support': "I'm here to help with mental health support. Would you like to:\n1. Schedule a therapy session\n2. Access guided meditation\n3. Get emergency support\n4. Learn coping strategies"
    };

    // Add message to chat
    function addMessage(text, isUser = false, isFile = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = isUser ? 'message user-message' : 'message bot-message';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        if (!isUser) messageContent.style.marginLeft = 'auto';
        
        // Add bot icon for bot messages
        if (!isUser) {
            const botIcon = document.createElement('i');
            botIcon.className = 'bot-icon fas fa-robot';
            messageContent.appendChild(botIcon);
        }

        const textContent = document.createElement('div');
        textContent.className = 'text-content';
        
        // Determine content size to apply adaptive styling
        const contentLength = text.length;
        
        // Set different sizes based on content length
        if (contentLength > 1000) {
            // Very long content
            messageContent.classList.add('xl-content');
        } else if (contentLength > 600) {
            // Long content
            messageContent.classList.add('large-content');
        } else if (contentLength > 300) {
            // Medium content
            messageContent.classList.add('medium-content');
        }
        
        // Handle file uploads or text messages differently
        if (isFile) {
            const fileIcon = document.createElement('i');
            fileIcon.className = 'fas fa-file-medical';
            fileIcon.style.marginRight = '10px';
            textContent.appendChild(fileIcon);
            
            const fileSpan = document.createElement('span');
            fileSpan.textContent = text;
            textContent.appendChild(fileSpan);
        } else {
            // Check if the text is a medical analysis (contains markdown formatting or very long)
            const isMedicalAnalysis = text.includes('**') || 
                                      text.includes('Treatment Recommendations') || 
                                      text.includes('Specialist Referral') ||
                                      text.length > 400;
                                      
            if (isMedicalAnalysis) {
                // Add analysis-specific classes
                messageContent.classList.add('analysis-content');
                textContent.classList.add('medical-report');
                
                // Apply adaptive height based on content length
                if (contentLength > 1500) {
                    textContent.classList.add('xxl-scrollable');
                } else if (contentLength > 1000) {
                    textContent.classList.add('xl-scrollable');
                } else if (contentLength > 600) {
                    textContent.classList.add('large-scrollable');
                } else {
                    textContent.classList.add('adaptive-height');
                }
                
                // Create better paragraphs and sections
                let sections = text.split(/\*\*(.*?)\*\*/g);
                let newFormattedText = '';

                if (sections.length > 1) {
                    for (let i = 0; i < sections.length; i++) {
                        if (i % 2 === 0) { // Content
                            if (sections[i].trim()) {
                                // Format the content
                                let content = sections[i]
                                    // Create better lists
                                    .replace(/(\d+\.\s.*?)(?=\n\d+\.|$)/gs, '<li>$1</li>')
                                    // Handle bullet points
                                    .replace(/(-\s+.*?)(?=\n-\s+|$)/gs, '<li>$1</li>')
                                    // Fix extremely long words by adding word breaks where needed
                                    .replace(/(\S{30,})/g, function(match) {
                                        return '<span style="word-break: break-all;">' + match + '</span>';
                                    })
                                    // Replace newlines with <br>
                                    .replace(/\n/g, '<br>');
                                
                                // Wrap lists
                                content = content
                                    .replace(/(<li>.*?<\/li>)+/g, function(match) {
                                        if (match.includes('<li>-')) {
                                            return '<ul style="max-width: 100%;">' + match.replace(/<li>-\s+/g, '<li>') + '</ul>';
                                        } else {
                                            return '<ol style="max-width: 100%;">' + match + '</ol>';
                                        }
                                    });
                                
                                newFormattedText += '<div class="section-content">' + content + '</div>';
                            }
                        } else { // Section header
                            newFormattedText += '<h3 class="section-title">' + sections[i] + '</h3>';
                        }
                    }
                    
                    let formattedText = newFormattedText;
                    
                    // Highlight abnormal values
                    formattedText = formattedText.replace(/(\d+(\.\d+)?\s*(g\/dL|mg\/dL|U\/L|cells\/mm3|%|mmol\/L|ng\/mL)?\s*\(Low\s*[^)]*\))/gi, 
                        '<span class="abnormal">$1</span>');
                    formattedText = formattedText.replace(/(\d+(\.\d+)?\s*(g\/dL|mg\/dL|U\/L|cells\/mm3|%|mmol\/L|ng\/mL)?\s*\(High\s*[^)]*\))/gi, 
                        '<span class="abnormal">$1</span>');
                    formattedText = formattedText.replace(/(\d+(\.\d+)?\s*(g\/dL|mg\/dL|U\/L|cells\/mm3|%|mmol\/L|ng\/mL)?\s*\(Normal\s*[^)]*\))/gi, 
                        '<span class="normal">$1</span>');
                    
                    // Highlight diagnoses and important terms
                    formattedText = formattedText.replace(/(diagnosed with|positive for|evidence of|abnormal|urgent|critical|referral)\s+([^.,]+)/gi, 
                        '$1 <span class="highlight">$2</span>');
                    
                    // Add styling for sections
                    textContent.style.whiteSpace = 'normal';
                    textContent.style.overflow = 'visible';
                    
                    // Set the HTML content
                    textContent.innerHTML = formattedText;
                    
                    // Add a class to identify this as a medical analysis
                    textContent.classList.add('medical-analysis');
                } else {
                    // If no sections, format as simple text with smart wrapping
                    textContent.style.whiteSpace = 'pre-wrap'; // Preserve line breaks
                    
                    // Fix very long words by adding breaks for words over 30 chars
                    text = text.replace(/(\S{30,})/g, function(match) {
                        return match.replace(/(.{15})/g, "$1\u200B"); // Add zero-width space every 15 chars
                    });
                    
                    textContent.textContent = text;
                }
                
                // Apply overflow protection for the entire content
                textContent.style.overflowX = 'hidden';
                textContent.style.maxWidth = '100%';
            } else {
                // Simple text without markdown
                textContent.style.whiteSpace = 'pre-wrap'; // Preserve line breaks
                textContent.textContent = text;
            }
        }
        
        messageContent.appendChild(textContent);
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Ensure input stays in proper position after adding messages
        const inputWrapper = document.querySelector('.input-wrapper');
        if (inputWrapper) {
            // Prevent input from moving up when messages are added
            inputWrapper.style.position = 'relative';
            inputWrapper.style.bottom = 'auto';
            inputWrapper.style.transform = 'none';
            inputWrapper.style.marginTop = '0';
        }
        
        // Add can-collapse class to welcome message if there are messages
        if (chatMessages.children.length > 0) {
            const welcomeMessage = document.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.classList.add('can-collapse');
            }
        }
        
        // Add ResizeObserver to automatically adjust the height if needed
        if (!isFile) {
            const resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    // If content is being clipped, adjust the container
                    if (entry.target.scrollHeight > entry.contentRect.height + 20) {
                        if (!entry.target.classList.contains('scrollable') && 
                            !entry.target.classList.contains('xl-scrollable') && 
                            !entry.target.classList.contains('large-scrollable') && 
                            !entry.target.classList.contains('xxl-scrollable')) {
                            // Make it scrollable if too tall
                            if (entry.target.scrollHeight > 600) {
                                entry.target.classList.add('scrollable');
                            } else {
                                // Otherwise, expand it
                                entry.target.style.height = 'auto';
                                entry.target.style.maxHeight = 'none';
                            }
                        }
                    }
                }
            });
            
            // Start observing text content
            resizeObserver.observe(textContent);
        }
    }

    // Function to collapse welcome message and make chat area scrollable
    function collapseWelcomeMessage() {
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            // Remove collapsed class if it exists
            welcomeMessage.classList.remove('collapsed');
            // Add hidden class to completely remove it
            welcomeMessage.classList.add('hidden');
            
            // Make chat messages take full height
            const chatMessages = document.querySelector('.chat-messages');
            chatMessages.classList.remove('expanded');
            chatMessages.classList.add('fully-expanded');
            
            // Reset input positioning to prevent it from moving up
            const inputWrapper = document.querySelector('.input-wrapper');
            if (inputWrapper) {
                inputWrapper.style.position = 'relative';
                inputWrapper.style.bottom = 'auto';
                inputWrapper.style.transform = 'none';
                inputWrapper.style.marginTop = '0';
            }
            
            // Ensure chat interface has proper layout
            const chatInterface = document.querySelector('.chat-interface');
            if (chatInterface) {
                chatInterface.style.position = 'relative';
                chatInterface.style.transform = 'none';
            }
        }
    }

    // Toggle welcome message expansion when clicked (keep this for backward compatibility)
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.addEventListener('click', function() {
            if (this.classList.contains('collapsed')) {
                this.classList.remove('collapsed');
                document.querySelector('.chat-messages').classList.remove('expanded');
            } else if (document.querySelector('.chat-messages').children.length > 0) {
                // Only collapse if there are messages
                this.classList.add('collapsed');
                document.querySelector('.chat-messages').classList.add('expanded');
            }
        });
    }

    // Fetch chat history
    async function fetchHistory() {
        try {
            const response = await fetch(`${API_BASE_URL}/history?session_id=${sessionId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch history');
            }
            
            const data = await response.json();
            
            // Clear existing messages
            chatMessages.innerHTML = '';
            
            // Display history
            data.history.forEach(message => {
                addMessage(message.content, message.role === 'human');
            });
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    }

    // Get global context
    async function fetchGlobalContext() {
        try {
            const response = await fetch(`${API_BASE_URL}/context?session_id=${sessionId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch context');
            }
            
            const data = await response.json();
            
            // Update context in UI if needed
            if (document.querySelector('.side-panel .panel-content')) {
                document.querySelector('.side-panel .panel-content').textContent = data.context || 'No context available';
            }
            
            return data.context;
        } catch (error) {
            console.error('Error fetching context:', error);
            return '';
        }
    }

    // Generate local AI response (fallback)
    function generateLocalResponse(message) {
        // Check if message matches any suggestion
        for (const [key, value] of Object.entries(sampleResponses)) {
            if (message.toLowerCase().includes(key.toLowerCase())) {
                return value;
            }
        }
        
        // Default response
        return "I'm here to help with your healthcare needs. You can ask me about:\n1. Scheduling appointments\n2. Checking medications\n3. Viewing health metrics\n4. Getting mental health support";
    }

    // Send message to API
    async function sendToAPI(message) {
        try {
            console.log(`Sending message to API using model: ${currentModel}`);
            
            // Convert the input into proper format for model prediction
            // Try to parse the message as JSON if possible for features array
            let features = [];
            try {
                // See if the message is a valid JSON array of features
                features = JSON.parse(message);
                if (!Array.isArray(features)) {
                    // If it's a JSON object but not an array, convert it
                    features = Object.values(features);
                }
            } catch (e) {
                // If not valid JSON, split by commas or spaces to create feature array
                features = message.split(/[,\s]+/).map(val => parseFloat(val.trim())).filter(val => !isNaN(val));
            }
            
            // If we still don't have features and it's not an image model, show error
            if (features.length === 0 && 
                currentModel !== 'kidney-disease' && 
                currentModel !== 'brain-tumor') {
                return "Please provide numerical values separated by commas or spaces for analysis.";
            }
            
            // Different endpoint based on model type
            let endpoint = '';
            let requestBody = {};
            
            // Determine endpoint and format request body based on selected model
            switch(currentModel) {
                case 'breast-cancer':
                    endpoint = `${API_BASE_URL}/predict/breast-cancer`;
                    requestBody = { features: features };
                    break;
                case 'heart-disease':
                    endpoint = `${API_BASE_URL}/predict/heart-disease`;
                    requestBody = { features: features };
                    break;
                case 'liver-disease':
                    endpoint = `${API_BASE_URL}/predict/liver-disease`;
                    requestBody = { features: features };
                    break;
                case 'kidney-disease':
                    endpoint = `${API_BASE_URL}/predict/kidney-disease`;
                    requestBody = { input: features };
                    break;
                case 'brain-tumor':
                    endpoint = `${API_BASE_URL}/predict/brain-tumor`;
                    requestBody = { input: features };
                    break;
                case 'hepatitis-C':
                    endpoint = `${API_BASE_URL}/predict/hepatitis`;
                    requestBody = { features: features };
                    break;
                case 'diabetis':
                    endpoint = `${API_BASE_URL}/predict/diabetes`;
                    requestBody = { features: features };
                    break;
                default:
                    // If no model is selected, return a message guiding user to select a model
                    return "Please select a disease model from the dropdown menu at the top.";
            }
            
            console.log(`Calling endpoint: ${endpoint} with data:`, requestBody);
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('API Error Response:', errorData);
                throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Prediction Response:', data);
            
            // Format response based on model type
            let formattedResponse = "";
            
            if (data.prediction !== undefined) {
                // Create a formatted response with the prediction result
                formattedResponse = `**${currentModel.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Analysis Result**\n\n`;
                formattedResponse += `Diagnosis: ${data.diagnosis}\n\n`;
                
                if (data.probability) {
                    if (Array.isArray(data.probability)) {
                        formattedResponse += `Confidence: ${Math.round(data.probability[0][1] * 100)}%\n\n`;
                    } else {
                        formattedResponse += `Confidence: ${Math.round(data.probability * 100)}%\n\n`;
                    }
                }
                
                formattedResponse += `Based on the provided values, our AI model ${data.prediction ? 'detected' : 'did not detect'} indicators of ${currentModel.replace('-', ' ')}.`;
                
                // Add specific recommendations based on model
                if (data.prediction) {
                    formattedResponse += "\n\n**Recommendations**\n\n";
                    switch(currentModel) {
                        case 'breast-cancer':
                            formattedResponse += "1. Consult with an oncologist immediately\n2. Schedule additional diagnostic imaging\n3. Discuss treatment options with your healthcare provider";
                            break;
                        case 'heart-disease':
                            formattedResponse += "1. Consult with a cardiologist\n2. Monitor blood pressure regularly\n3. Consider lifestyle modifications (diet, exercise)\n4. Discuss medication options with your doctor";
                            break;
                        case 'liver-disease':
                            formattedResponse += "1. Consult with a hepatologist\n2. Schedule additional liver function tests\n3. Consider dietary changes and alcohol reduction\n4. Discuss possible medications with your doctor";
                            break;
                        case 'kidney-disease':
                            formattedResponse += "1. Consult with a nephrologist\n2. Monitor fluid intake and blood pressure\n3. Consider dietary modifications (low sodium, low protein)\n4. Discuss medication options with your healthcare provider";
                            break;
                        case 'brain-tumor':
                            formattedResponse += "1. Consult with a neurologist or neurosurgeon immediately\n2. Schedule an MRI scan for confirmation\n3. Discuss treatment options (surgery, radiation, etc.)";
                            break;
                        case 'hepatitis-C':
                            formattedResponse += "1. Consult with a hepatologist or infectious disease specialist\n2. Schedule additional viral load testing\n3. Discuss antiviral treatment options\n4. Monitor liver function regularly";
                            break;
                        case 'diabetis':
                            formattedResponse += "1. Consult with an endocrinologist\n2. Monitor blood glucose levels regularly\n3. Consider dietary modifications and exercise\n4. Discuss medication options (insulin, oral medications)";
                            break;
                    }
                }
                
                return formattedResponse;
            }
            
            return "Unable to process the prediction. Please check your input values and try again.";
            
        } catch (error) {
            console.error('Error sending message:', error);
            // Fall back to local responses if API fails
            return "There was an error processing your request. Please make sure your input is in the correct format for the selected model.";
        }
    }

    // Handle message sending
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (message) {
            // Collapse welcome message when first message is sent
            collapseWelcomeMessage();
            
            // Show user message
            addMessage(message, true);
            chatInput.value = '';
            
            // Show loading indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message bot-message';
            loadingDiv.innerHTML = '<div class="message-content" style="margin-left: auto;"><div class="text-content">...</div></div>';
            chatMessages.appendChild(loadingDiv);
            
            // Send to API and get response
            const aiResponse = await sendToAPI(message);
            
            // Remove loading indicator
            chatMessages.removeChild(loadingDiv);
            
            // Show AI response
            addMessage(aiResponse);
        }
    }

    // Reset context
    async function resetContext() {
        try {
            const response = await fetch(`${API_BASE_URL}/context?session_id=${sessionId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to reset context');
            }
            
            alert('Context has been reset successfully');
        } catch (error) {
            console.error('Error resetting context:', error);
            alert('Failed to reset context');
        }
    }

    // Handle file upload
    function handleFileUpload(file) {
        if (!file) return;
        
        // Show file upload message
        addMessage(`Uploading file: ${file.name}`, true, true);
        
        // Check if the current model supports image analysis
        if (currentModel !== 'brain-tumor' && currentModel !== 'kidney-disease') {
            addMessage("The currently selected model does not support image analysis. Please select Brain Tumor or Kidney Disease model to analyze medical images.", false);
            return;
        }
        
        // Create a FormData object
        const formData = new FormData();
        formData.append('file', file);
        
        // Show loading message
        addMessage("Processing your medical image...", false);
        
        // Determine the correct endpoint based on the selected model
        let endpoint = '';
        if (currentModel === 'brain-tumor') {
            endpoint = `${API_BASE_URL}/predict/brain-tumor/image`;
        } else if (currentModel === 'kidney-disease') {
            endpoint = `${API_BASE_URL}/predict/kidney-disease/image`;
        }
        
        console.log(`Sending image to endpoint: ${endpoint}`);
        
        // Send the image to the correct endpoint
        fetch(endpoint, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log(`Response status: ${response.status}, ${response.statusText}`);
            
            if (!response.ok) {
                // Try to get more detailed error information
                return response.json().catch(e => {
                    // If we can't parse the JSON error response, throw the original error
                    throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
                }).then(errorData => {
                    // If we got a JSON error response, throw it with details
                    throw new Error(errorData.error || `Server error: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Image Analysis Response:', data);
            
            if (!data.prediction && data.prediction !== false) {
                throw new Error('Invalid response data');
            }
            
            // Format the response
            let formattedResponse = `**${currentModel.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Image Analysis Result**\n\n`;
            formattedResponse += `Diagnosis: ${data.diagnosis}\n\n`;
            
            if (data.probability !== undefined) {
                formattedResponse += `Confidence: ${Math.round(data.probability * 100)}%\n\n`;
            }
            
            formattedResponse += `Based on the provided image, our AI model ${data.prediction ? 'detected' : 'did not detect'} indicators of ${currentModel.replace('-', ' ')}.`;
            
            // Add recommendations if positive prediction
            if (data.prediction) {
                formattedResponse += "\n\n**Recommendations**\n\n";
                if (currentModel === 'brain-tumor') {
                    formattedResponse += "1. Consult with a neurologist or neurosurgeon immediately\n2. Schedule additional MRI scans for confirmation\n3. Discuss treatment options including surgery, radiation therapy, or chemotherapy";
                } else if (currentModel === 'kidney-disease') {
                    formattedResponse += "1. Consult with a nephrologist\n2. Consider additional kidney function tests\n3. Monitor blood pressure and fluid intake\n4. Discuss medication and treatment options with your healthcare provider";
                }
            }
            
            // Display the analysis result
            addMessage(formattedResponse);
        })
        .catch(error => {
            console.error('Error processing image:', error);
            
            // Check if this is a model loading error
            const isModelLoadingError = error.message && (
                error.message.includes('model is not loaded') || 
                error.message.includes('not defined') ||
                error.message.includes('Image processing error')
            );
            
            // Add debugging info for users
            let errorMessage = `I'm sorry, there was an error processing your ${currentModel.replace('-', ' ')} image.`;
            
            if (isModelLoadingError) {
                // More helpful message for model loading errors
                errorMessage += "\n\nError details: The AI model failed to load or process your image.";
                errorMessage += "\n\nTroubleshooting tips:\n1. Make sure the model server is running (python cnn_models/load_models.py)\n2. Verify the model files exist in the cnn_models/saved_models directory\n3. Check that the server is running on port 5002\n4. Try a different image format or size";
            } else {
                // General error
                errorMessage += `\n\nError details: ${error.message}`;
                errorMessage += "\n\nTroubleshooting tips:\n1. Check your network connection\n2. Ensure the model server is running\n3. Try a different image";
            }
            
            addMessage(errorMessage);
        });
    }

    // Create a hidden file input for handling file uploads
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    // Handle file selection
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            collapseWelcomeMessage();
            handleFileUpload(file);
        }
    });

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Add input event listener to collapse welcome message when typing
    chatInput.addEventListener('input', () => {
        if (chatInput.value.trim().length > 0) {
            collapseWelcomeMessage();
        }
    });

    // Suggestion chips
    suggestionChips.forEach(button => {
        button.addEventListener('click', async () => {
            // Collapse welcome message when suggestion is clicked
            collapseWelcomeMessage();
            
            const message = button.textContent;
            addMessage(message, true);
            
            // Show loading indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message bot-message';
            loadingDiv.innerHTML = '<div class="message-content" style="margin-left: auto;"><div class="text-content">...</div></div>';
            chatMessages.appendChild(loadingDiv);
            
            // Send to API and get response
            const aiResponse = await sendToAPI(message);
            
            // Remove loading indicator
            chatMessages.removeChild(loadingDiv);
            
            // Show AI response
            addMessage(aiResponse);
        });
    });

    // Health metrics panel toggle
    const healthMetricsButton = document.querySelector('.nav-menu a:nth-child(5)');
    const sidePanel = document.querySelector('.side-panel');
    const closePanel = document.querySelector('.close-panel');

    if (healthMetricsButton) {
        healthMetricsButton.addEventListener('click', (e) => {
            e.preventDefault();
            sidePanel.classList.add('active');
        });
    }

    if (closePanel) {
        closePanel.addEventListener('click', () => {
            sidePanel.classList.remove('active');
        });
    }

    // User profile dropdown
    const userProfile = document.querySelector('.user-profile');
    const dropdownMenu = document.querySelector('.dropdown-menu');

    if (userProfile && dropdownMenu) {
        userProfile.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
        });

        document.addEventListener('click', () => {
            dropdownMenu.style.display = 'none';
        });
    }

    // Notifications
    const notifications = document.querySelector('.notifications');
    const badge = document.querySelector('.badge');

    if (notifications && badge) {
        notifications.addEventListener('click', () => {
            // In a real app, this would show a notifications panel
            badge.textContent = '0';
            badge.style.display = 'none';
        });
    }

    // Model selector functionality
    const modelSelector = document.querySelector('.model-selector');
    const modelDropdown = document.querySelector('.model-dropdown');
    const modelName = document.querySelector('.model-selector .model-name');
    const modelOptions = document.querySelectorAll('.model-option');
    
    // Set default disease model
    let currentModel = 'default';
    
    // Toggle dropdown on click
    modelSelector.addEventListener('click', (e) => {
        // Don't toggle if clicking on a model option
        if (!e.target.closest('.model-option')) {
            const isVisible = modelDropdown.style.display === 'block';
            modelDropdown.style.display = isVisible ? 'none' : 'block';
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!modelSelector.contains(e.target)) {
            modelDropdown.style.display = 'none';
        }
    });

    // Function to set active model
    function setActiveModel(modelOption) {
        // Remove active class from all options
        modelOptions.forEach(opt => {
            opt.classList.remove('active');
        });
        
        // Add active class to selected option
        modelOption.classList.add('active');
        
        // Update current model
        currentModel = modelOption.dataset.model;
        
        // Update displayed model name
        const selectedModelName = modelOption.querySelector('span').textContent;
        modelName.textContent = `HealthAI: ${selectedModelName}`;
        
        // Update welcome message to reflect the model change
        const welcomeMessageEl = document.querySelector('.welcome-message h1');
        if (welcomeMessageEl) {
            welcomeMessageEl.textContent = `How can I help with ${selectedModelName} analysis?`;
        }
        
        // Update suggestions based on the selected model
        updateSuggestionChips(currentModel);
        
        return selectedModelName;
    }

    // Handle model option selection
    modelOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent event bubbling to model selector
            
            // Set this option as active and get the name
            const selectedModelName = setActiveModel(option);
            
            // Hide dropdown after selection
            setTimeout(() => {
                modelDropdown.style.display = 'none';
            }, 100);
            
            // Show notification about model change
            window.utils && window.utils.showNotification(`Switched to ${selectedModelName} model`, 'success');
        });
    });

    // Set the first model (Breast Cancer) as active by default
    const defaultModel = document.querySelector('.model-option[data-model="breast-cancer"]');
    if (defaultModel) {
        setActiveModel(defaultModel);
    }

    // Check model status
    async function checkModelStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/models/status`);
            if (!response.ok) {
                throw new Error(`Failed to fetch model status: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Model Status:', data);
            
            // Format status message
            let statusMessage = "**AI Model Status**\n\n";
            
            // Check if server is connected
            statusMessage += "Server Connection: ✓ Connected\n\n";
            
            // Add model status table
            statusMessage += "Model | Status | File Exists\n";
            statusMessage += "--- | --- | ---\n";
            
            // Add a row for each model
            for (const model in data.models_loaded) {
                const isLoaded = data.models_loaded[model];
                const fileExists = data.files_exist[model];
                
                const modelName = model.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const loadedStatus = isLoaded ? "✓ Loaded" : "✗ Not Loaded";
                const fileStatus = fileExists ? "✓ Found" : "✗ Missing";
                
                statusMessage += `${modelName} | ${loadedStatus} | ${fileStatus}\n`;
            }
            
            // Add troubleshooting instructions
            const hasIssues = Object.values(data.models_loaded).some(status => status === false);
            if (hasIssues) {
                statusMessage += "\n**Troubleshooting Steps**\n\n";
                statusMessage += "1. Run the diagnostic script: `python cnn_models/check_models.py`\n";
                statusMessage += "2. Ensure all model files are in the correct location\n";
                statusMessage += "3. Restart the model server\n";
            }
            
            // Display in chat
            addMessage(statusMessage);
            
            return data;
        } catch (error) {
            console.error('Error checking model status:', error);
            
            // Add error message to chat
            const errorMessage = "Unable to connect to the AI model server. Please ensure the server is running at " + 
                API_BASE_URL + ".\n\nTroubleshooting steps:\n" +
                "1. Run: `python cnn_models/load_models.py`\n" +
                "2. Check that the server is running on port 5002\n" +
                "3. Run the diagnostic script: `python cnn_models/check_models.py`";
            
            addMessage(errorMessage);
            return null;
        }
    }

    // Function to update suggestion chips based on selected model
    function updateSuggestionChips(model) {
        const suggestionChips = document.querySelector('.suggestion-chips');
        if (!suggestionChips) return;
        
        // Clear existing suggestions
        suggestionChips.innerHTML = '';
        
        // Add model-specific suggestions
        let suggestions = [];
        
        switch (model) {
            case 'breast-cancer':
                suggestions = [
                    'Analyze mammogram results',
                    'Check cancer risk factors',
                    'View treatment options',
                    'Schedule patient follow-up'
                ];
                break;
            case 'heart-disease':
                suggestions = [
                    'Analyze ECG patterns',
                    'Check cardiac risk score',
                    'Review cholesterol levels',
                    'Heart disease prevention'
                ];
                break;
            case 'kidney-disease':
                suggestions = [
                    'Check kidney function tests',
                    'Analyze GFR readings',
                    'Renal disease management',
                    'Upload kidney scan image'
                ];
                break;
            case 'liver-disease':
                suggestions = [
                    'Check liver function tests',
                    'Analyze enzyme levels',
                    'Hepatic disease management',
                    'Cirrhosis treatment options'
                ];
                break;
            case 'brain-tumor':
                suggestions = [
                    'Upload MRI scan',
                    'Analyze tumor markers',
                    'Review neurological symptoms',
                    'Treatment protocols'
                ];
                break;
            case 'hepatitis-C':
                suggestions = [
                    'Check viral load',
                    'Analyze liver enzymes',
                    'Treatment options',
                    'Monitoring protocols'
                ];
                break;
            case 'diabetis':
                suggestions = [
                    'Check glucose levels',
                    'Analyze A1C results',
                    'Insulin management',
                    'Diet recommendations'
                ];
                break;
            default:
                suggestions = [
                    'Select a disease model above',
                    'Upload medical images',
                    'Enter test values',
                    'Check model status'
                ];
        }
        
        // Create and append new suggestion buttons
        suggestions.forEach(text => {
            const button = document.createElement('button');
            button.textContent = text;
            button.addEventListener('click', async () => {
                // Special handling for 'Check model status'
                if (text === 'Check model status') {
                    // Collapse welcome message
                    collapseWelcomeMessage();
                    // Add user message
                    addMessage('Check model status', true);
                    // Check model status
                    await checkModelStatus();
                    return;
                }
                
                // Re-use existing suggestion click handler for other suggestions
                const suggestionClickEvent = new Event('click');
                button.dispatchEvent(suggestionClickEvent);
            });
            suggestionChips.appendChild(button);
        });
        
        // Always add a "Check model status" button at the end if not already included
        if (!suggestions.includes('Check model status')) {
            const statusButton = document.createElement('button');
            statusButton.textContent = 'Check model status';
            statusButton.classList.add('status-button');
            statusButton.addEventListener('click', async () => {
                // Collapse welcome message
                collapseWelcomeMessage();
                // Add user message
                addMessage('Check model status', true);
                // Check model status
                await checkModelStatus();
            });
            suggestionChips.appendChild(statusButton);
        }
    }

    // Feature buttons
    const featureButtons = document.querySelectorAll('.feature-button');
    
    if (featureButtons.length > 0) {
        featureButtons.forEach(button => {
            button.addEventListener('click', () => {
                const icon = button.querySelector('i');
                if (icon.classList.contains('fa-microphone')) {
                    // Voice input functionality
                    collapseWelcomeMessage();
                    window.utils && window.utils.showNotification('Voice input is not implemented yet', 'info');
                } else if (icon.classList.contains('fa-image')) {
                    // Image upload functionality
                    collapseWelcomeMessage();
                    fileInput.accept = 'image/*';
                    fileInput.click();
                } else if (icon.classList.contains('fa-file-medical')) {
                    // Medical record upload functionality
                    collapseWelcomeMessage();
                    fileInput.accept = '.pdf,.doc,.docx,.txt,.csv,.jpg,.jpeg,.png';
                    fileInput.click();
                }
            });
        });
    }

    // Initialize with welcome message and fetch history
    async function initialize() {
        try {
            // Setup session ID first
            await setupSessionId();
            
            // Fetch history after session ID is set
            await fetchHistory();
            
            // If no history, add welcome message
            if (chatMessages.children.length === 0) {
                addMessage("Hello! I'm your AI healthcare assistant. How can I help you today?");
                
                // Collapse welcome message after initial message
                setTimeout(() => {
                    collapseWelcomeMessage();
                }, 2000);
            }
            
            // Fetch context
            await fetchGlobalContext();
        } catch (error) {
            console.error('Error initializing chat:', error);
            addMessage("Hello! I'm your AI healthcare assistant. How can I help you today?");
            
            // Collapse welcome message after initial message
            setTimeout(() => {
                collapseWelcomeMessage();
            }, 2000);
        }
    }
    
    // Initialize the chat
    initialize();

    // Set the default model (first option) right after initialization
    setTimeout(() => {
        // Set the first model (Breast Cancer) as active by default if no model is active yet
        if (!document.querySelector('.model-option.active')) {
            const defaultModel = document.querySelector('.model-option[data-model="breast-cancer"]');
            if (defaultModel) {
                setActiveModel(defaultModel);
            }
        }
    }, 500);

    // Check model status
});