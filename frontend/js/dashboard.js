document.addEventListener('DOMContentLoaded', () => {
    // Make the sidebar unscrollable
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.style.position = 'fixed';
        sidebar.style.top = '0';
        sidebar.style.left = '0';
        sidebar.style.bottom = '0';
        sidebar.style.overflowY = 'hidden';
        sidebar.style.zIndex = '1000';
        
        // Adjust main content to account for fixed sidebar
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.marginLeft = '260px'; // Match sidebar width
        }
    }

    // Ensure AI Assistant is set as active if we're on the dashboard page
    if (window.location.pathname.includes('dashboard.html') || window.location.pathname.endsWith('/')) {
        // Use centralized navigation if available
        if (window.navigation && typeof window.navigation.setActiveMenuItem === 'function') {
            window.navigation.setActiveMenuItem('ai-assistant');
        } else {
            // Fallback to direct DOM manipulation
            const menuItems = document.querySelectorAll('.nav-menu a');
            menuItems.forEach(item => item.classList.remove('active'));
            const aiAssistant = document.getElementById('ai-assistant');
            if (aiAssistant) {
                aiAssistant.classList.add('active');
            }
        }
    }

    // Chat functionality
    const chatMessages = document.querySelector('.chat-messages');
    const chatInput = document.querySelector('.input-wrapper input');
    const sendButton = document.querySelector('.send-button');
    const suggestionChips = document.querySelectorAll('.suggestion-chips button');

    
    // Function to ensure proper layout of chat interface
    function adjustChatLayout() {
        // Get chat interface and input container heights
        const chatInterface = document.querySelector('.chat-interface');
        const inputContainer = document.querySelector('.chat-input-container');
        
        if (!chatInterface || !inputContainer) return;
        
        // Ensure input container is positioned correctly
        inputContainer.style.position = 'fixed';
        inputContainer.style.bottom = '20px';
        inputContainer.style.left = 'calc(260px + 2rem)'; // Account for sidebar width
        inputContainer.style.right = '2rem';
        
        // Calculate the input container height including padding
        const inputHeight = inputContainer.offsetHeight;
        
        // Set chat messages height to fill available space minus input height
        if (chatMessages) {
            // Give extra padding at bottom to ensure messages don't go under the input
            chatMessages.style.paddingBottom = `${inputHeight + 40}px`;
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }
    
    // Call the function on load and window resize
    adjustChatLayout();
    window.addEventListener('resize', adjustChatLayout);
    

    // API endpoints and session management
    const API_BASE_URL = 'http://localhost:5001';
    let sessionId = '1'; // Default session ID
    
    // Page navigation handling
    initPageNavigation();
    
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
    
    // Directly navigate to map page
    function navigateToMap() {
        // Use the centralized navigation system
        if (window.navigation && typeof window.navigation.navigateToPage === 'function') {
            window.navigation.navigateToPage('find-hospitals');
        } else {
            // Fallback to direct navigation
            window.location.href = 'map.html';
        }
    }
    
    // Initialize page navigation
    function initPageNavigation() {
        // Check if navigation module is available
        if (window.navigation && typeof window.navigation.navigateToPage === 'function') {
            console.log('Using centralized navigation system');
            return; // Navigation is already handled by navigation.js
        }
        
        // Fallback navigation if navigation.js is not loaded properly
        const navLinks = document.querySelectorAll('.nav-menu a');
        const mainContent = document.querySelector('.main-content');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Set this link as active
                navLinks.forEach(navLink => navLink.classList.remove('active'));
                link.classList.add('active');
                
                // Handle special links
                if (link.id === 'report-analysis') {
                    loadReportAnalysis();
                } else if (link.id === 'find-hospitals') {
                    // Option 1: Load map content inline
                    loadMapContent();
                    
                    // Option 2: Navigate to map page directly
                    // This provides a better experience with the full map page
                    // Uncomment the next line and comment out loadMapContent() to use this option
                    // navigateToMap();
                } else if (link.id === 'health-metrics') {
                    // Show health metrics panel
                    const sidePanel = document.querySelector('.side-panel');
                    if (sidePanel) {
                        sidePanel.classList.add('active');
                    }
                } else if (link.id === 'ai-assistant') {
                    // Show the chat interface
                    showChatInterface();
                } else if (link.id === 'prescription-reader') {
                    loadPrescriptionReader();
                } else {
                    // For other links without implementation yet, just show a notification
                    const featureName = link.querySelector('span').textContent;
                    showNotification(`${featureName} feature is coming soon!`, 'info');
                }
            });
        });
    }
    
    // Load map content
    function loadMapContent() {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;
        
        // Create loading spinner with inline styles to ensure it shows correctly
        mainContent.innerHTML = `
            <div class="loading-spinner" style="
                display: block;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 50px;
                height: 50px;
                border: 5px solid rgba(142, 36, 170, 0.3);
                border-top: 5px solid #8e24aa;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                z-index: 999;
            "></div>
            <style>
                @keyframes spin {
                    0% { transform: translate(-50%, -50%) rotate(0deg); }
                    100% { transform: translate(-50%, -50%) rotate(360deg); }
                }
            </style>
        `;
        
        // Cache-busting parameter to avoid caching issues
        const timestamp = new Date().getTime();
        
        // Fetch the map.html content with cache busting
        fetch(`map.html?_cache=${timestamp}`, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch map.html: ${response.status} ${response.statusText}`);
                }
                return response.text();
            })
            .then(html => {
                // Extract just the map interface part
                const parser = new DOMParser();
                const mapDoc = parser.parseFromString(html, 'text/html');
                
                // Get necessary parts from the map page
                const mapTopBar = mapDoc.querySelector('.top-bar');
                const mapInterface = mapDoc.querySelector('.map-interface');
                
                if (!mapTopBar || !mapInterface) {
                    throw new Error('Map structure not found in map.html - missing top-bar or map-interface elements');
                }
                
                // Create new content
                let newContent = '';
                newContent += '<div class="top-bar">' + mapTopBar.innerHTML + '</div>';
                newContent += '<div class="map-interface">' + mapInterface.innerHTML + '</div>';
                
                // Set the content
                mainContent.innerHTML = newContent;
                
                // Load CSS first if not already loaded
                const cssLink = document.querySelector('link[href="css/map.css"]');
                if (!cssLink) {
                    const mapCss = document.createElement('link');
                    mapCss.rel = 'stylesheet';
                    mapCss.href = 'css/map.css';
                    document.head.appendChild(mapCss);
                }
                
                // Load Google Maps API if not already loaded
                const loadGoogleMaps = new Promise((resolve, reject) => {
                    if (window.google && window.google.maps) {
                        console.log('Google Maps API already loaded');
                        resolve();
                    } else {
                        console.log('Loading Google Maps API...');
                        const script = document.createElement('script');
                        script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyDfcWsAtCQwcm5FmOMFb-H3MppvsbRI70g&libraries=places,geometry';
                        script.onload = () => {
                            console.log('Google Maps API loaded successfully');
                            resolve();
                        };
                        script.onerror = () => reject(new Error('Failed to load Google Maps API'));
                        document.head.appendChild(script);
                    }
                });
                
                // After Google Maps is loaded, load the map.js script
                return loadGoogleMaps.then(() => {
                    // Load map.js if not already loaded
                    const existingScript = document.querySelector('script[src="js/map.js"]');
                    if (existingScript) {
                        existingScript.remove(); // Remove existing script to avoid conflicts
                    }
                    
                    const mapScript = document.createElement('script');
                    mapScript.src = `js/map.js?_cache=${timestamp}`; // Add cache busting
                    document.body.appendChild(mapScript);
                    
                    console.log('Map loaded successfully');
                });
            })
            .catch(error => {
                console.error('Error loading map content:', error);
                mainContent.innerHTML = `
                    <div class="error-message" style="text-align:center;margin-top:100px;color:#fff;">
                        <i class="fas fa-exclamation-circle" style="font-size:48px;color:#e53e3e;margin-bottom:20px;display:block;"></i>
                        <h3 style="color:#e53e3e;margin-bottom:15px;">Error Loading Map</h3>
                        <p style="margin-bottom:20px;">${error.message || 'Could not load the map interface.'}</p>
                        <div style="margin-bottom:15px;">Try the following:</div>
                        <ul style="text-align:left;display:inline-block;margin-bottom:20px;">
                            <li>Check your internet connection</li>
                            <li>Ensure map.html exists in the frontend folder</li>
                            <li>Check browser console for specific errors</li>
                        </ul>
                        <button onclick="window.location.href='map.html'" style="
                            background-color: #8e24aa;
                            color: white;
                            border: none;
                            padding: 8px 15px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-weight: bold;
                            margin-right: 10px;
                        ">Open Map Directly</button>
                        <button onclick="location.reload()" style="
                            background-color: #333;
                            color: white;
                            border: none;
                            padding: 8px 15px;
                            border-radius: 4px;
                            cursor: pointer;
                        ">Reload Page</button>
                    </div>
                `;
            });
    }
    
    // Load script dynamically
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if script is already loaded
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                return resolve();
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.body.appendChild(script);
        });
    }
    
    // Initialize user menu
    function initUserMenu() {
        const userProfile = document.querySelector('.user-profile');
        if (userProfile) {
            userProfile.addEventListener('click', (e) => {
                e.stopPropagation();
                userProfile.classList.toggle('active');
            });
            
            document.addEventListener('click', (e) => {
                if (!userProfile.contains(e.target)) {
                    userProfile.classList.remove('active');
                }
            });
        }
    }
    
    // Show the chat interface
    function showChatInterface() {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;
        
        // Restore original structure if it was changed
        if (!mainContent.querySelector('.chat-interface')) {
            fetch('dashboard.html')
                .then(response => response.text())
                .then(html => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    
                    // Get necessary parts
                    const topBar = doc.querySelector('.top-bar');
                    const chatInterface = doc.querySelector('.chat-interface');
                    
                    if (!topBar || !chatInterface) {
                        throw new Error('Dashboard content not found');
                    }
                    
                    // Create new content
                    mainContent.innerHTML = '';
                    mainContent.innerHTML += '<div class="top-bar">' + topBar.innerHTML + '</div>';
                    mainContent.innerHTML += '<div class="chat-interface">' + chatInterface.innerHTML + '</div>';
                    
                    // Re-initialize
                    initialize();
                    initUserMenu();
                })
                .catch(error => {
                    console.error('Error restoring chat interface:', error);
                });
        }
    }
    
    // Load report analysis content
    function loadReportAnalysis() {
        console.log('Loading report analysis content...');
        
        // Check if we have the report_analysis.js file loaded and its function available
        if (typeof window.loadReportAnalysisContent === 'function') {
            // Call the function from report_analysis.js
            window.loadReportAnalysisContent();
            return;
        }
        
        // If the function is not available, we need to load report-analysis.html
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;
        
        // Create loading spinner with inline styles
        mainContent.innerHTML = `
            <div class="loading-spinner" style="
                display: block;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 50px;
                height: 50px;
                border: 5px solid rgba(142, 36, 170, 0.3);
                border-top: 5px solid #8e24aa;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                z-index: 999;
            "></div>
            <style>
                @keyframes spin {
                    0% { transform: translate(-50%, -50%) rotate(0deg); }
                    100% { transform: translate(-50%, -50%) rotate(360deg); }
                }
            </style>
        `;
        
        // Cache-busting parameter to avoid caching issues
        const timestamp = new Date().getTime();
        
        // Fetch the report-analysis.html content
        fetch(`report-analysis.html?_cache=${timestamp}`, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch report-analysis.html: ${response.status} ${response.statusText}`);
                }
                return response.text();
            })
            .then(html => {
                // Extract just the report analysis content part
                const parser = new DOMParser();
                const reportDoc = parser.parseFromString(html, 'text/html');
                
                // Get necessary parts from the report analysis page
                const reportTopBar = reportDoc.querySelector('.top-bar');
                const reportContent = reportDoc.querySelector('.report-analysis-content');
                
                if (!reportTopBar || !reportContent) {
                    throw new Error('Report analysis structure not found in report-analysis.html');
                }
                
                // Create new content
                let newContent = '';
                newContent += '<div class="top-bar">' + reportTopBar.innerHTML + '</div>';
                newContent += '<div class="report-analysis-content">' + reportContent.innerHTML + '</div>';
                
                // Set the content
                mainContent.innerHTML = newContent;
                
                // Load CSS if not already loaded
                const cssLink = document.querySelector('link[href="css/report-analysis.css"]');
                if (!cssLink) {
                    const reportCss = document.createElement('link');
                    reportCss.rel = 'stylesheet';
                    reportCss.href = 'css/report-analysis.css';
                    document.head.appendChild(reportCss);
                }
                
                // Load report_analysis.js if not already loaded
                const reportScriptSrc = 'js/dashboard_pages/report_analysis.js';
                const existingScript = document.querySelector(`script[src="${reportScriptSrc}"]`);
                
                if (!existingScript) {
                    const reportScript = document.createElement('script');
                    reportScript.src = `${reportScriptSrc}?_cache=${timestamp}`;
                    reportScript.onload = () => {
                        // Initialize upload functionality after script is loaded
                        if (typeof window.initUploadFunctionality === 'function') {
                            window.initUploadFunctionality();
                        }
                        console.log('Report analysis loaded successfully');
                    };
                    document.body.appendChild(reportScript);
                } else {
                    // If already loaded, just initialize
                    if (typeof window.initUploadFunctionality === 'function') {
                        window.initUploadFunctionality();
                    }
                }
                
                // Update active menu item
                if (window.navigation && typeof window.navigation.setActiveMenuItem === 'function') {
                    window.navigation.setActiveMenuItem('report-analysis');
                } else {
                    const menuLinks = document.querySelectorAll('.nav-menu a');
                    menuLinks.forEach(link => link.classList.remove('active'));
                    const reportLink = document.getElementById('report-analysis');
                    if (reportLink) reportLink.classList.add('active');
                }
            })
            .catch(error => {
                console.error('Error loading report analysis content:', error);
                mainContent.innerHTML = `
                    <div class="error-message" style="text-align:center;margin-top:100px;color:#fff;">
                        <i class="fas fa-exclamation-circle" style="font-size:48px;color:#e53e3e;margin-bottom:20px;display:block;"></i>
                        <h3 style="color:#e53e3e;margin-bottom:15px;">Error Loading Report Analysis</h3>
                        <p style="margin-bottom:20px;">${error.message || 'Could not load the report analysis interface.'}</p>
                        <div style="margin-bottom:15px;">Try the following:</div>
                        <ul style="text-align:left;display:inline-block;margin-bottom:20px;">
                            <li>Check your internet connection</li>
                            <li>Ensure report-analysis.html exists in the frontend folder</li>
                            <li>Check browser console for specific errors</li>
                        </ul>
                        <button onclick="window.location.href='report-analysis.html'" style="
                            background-color: #8e24aa;
                            color: white;
                            border: none;
                            padding: 8px 15px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-weight: bold;
                            margin-right: 10px;
                        ">Open Report Analysis Directly</button>
                        <button onclick="location.reload()" style="
                            background-color: #333;
                            color: white;
                            border: none;
                            padding: 8px 15px;
                            border-radius: 4px;
                            cursor: pointer;
                        ">Reload Page</button>
                    </div>
                `;
            });
    }
    
    // Sample responses for demo/fallback
    const sampleResponses = {
        'Schedule an appointment': 'I can help you schedule an appointment. Please provide the following details:\n1. Preferred date and time\n2. Type of consultation\n3. Any specific doctor preference',
        'Check my medications': 'Here are your current medications:\n1. Metformin (500mg) - Twice daily\n2. Lisinopril (10mg) - Once daily\n3. Atorvastatin (20mg) - Once at bedtime',
        'View my health metrics': 'Your recent health metrics:\n- Heart Rate: 72 bpm (Normal)\n- Blood Pressure: 120/80 mmHg (Normal)\n- Weight: 70 kg (Stable)\n- Temperature: 98.6°F (Normal)',
        'Get mental health support': "I'm here to help with mental health support. Would you like to:\n1. Schedule a therapy session\n2. Access guided meditation\n3. Get emergency support\n4. Learn coping strategies"
    };

    // Helper function to scroll chat to the bottom
    function scrollToBottom() {
        // Use a small timeout to ensure DOM has updated
        setTimeout(() => {
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }, 10);
    }

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
        
        // Ensure we scroll to the new message
        scrollToBottom();
        
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
        
        // Add ResizeObserver to automatically adjust the height if needed and scroll to bottom
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
                    
                    // Always scroll to bottom when content changes
                    scrollToBottom();
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
            
            // Adjust chat layout to account for collapsed welcome message
            setTimeout(() => {
                adjustChatLayout();
                // Scroll to the bottom of the chat
                scrollToBottom();
            }, 100);
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
            console.log(`Sending message to API: ${message} with session ID: ${sessionId}`);
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    session_id: sessionId
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('API Error Response:', errorData);
                throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('API Response:', data);
            return data.response;
        } catch (error) {
            console.error('Error sending message:', error);
            // Fall back to local responses if API fails
            return generateLocalResponse(message);
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
            
            // Scroll to bottom after user message
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Show loading indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message bot-message';
            loadingDiv.innerHTML = '<div class="message-content" style="margin-left: auto;"><div class="text-content">...</div></div>';
            chatMessages.appendChild(loadingDiv);
            
            // Scroll to bottom to show loading indicator
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Send to API and get response
            const aiResponse = await sendToAPI(message);
            
            // Remove loading indicator
            chatMessages.removeChild(loadingDiv);
            
            // Show AI response
            addMessage(aiResponse);
            
            // Ensure scroll to bottom after AI response with a slight delay
            // to account for any rendering delays or content expansion
            setTimeout(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 100);
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
        
        // Create a FormData object
        const formData = new FormData();
        formData.append('file', file);
        formData.append('session_id', sessionId);
        
        // Show loading message
        addMessage("Processing your medical file...", false);
        
        // Call analyzeFile function
        analyzeFile(formData);
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
            
            // Scroll to bottom after user message
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Show loading indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message bot-message';
            loadingDiv.innerHTML = '<div class="message-content" style="margin-left: auto;"><div class="text-content">...</div></div>';
            chatMessages.appendChild(loadingDiv);
            
            // Scroll to bottom to show loading indicator
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Send to API and get response
            const aiResponse = await sendToAPI(message);
            
            // Remove loading indicator
            chatMessages.removeChild(loadingDiv);
            
            // Show AI response
            addMessage(aiResponse);
            
            // Ensure scroll to bottom after AI response
            setTimeout(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 100);
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
            userProfile.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!userProfile.contains(e.target)) {
                userProfile.classList.remove('active');
            }
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

    // Model selector
    const modelSelector = document.querySelector('.model-selector');
    
    if (modelSelector) {
    modelSelector.addEventListener('click', () => {
        // In a real app, this would show a model selection dropdown
        console.log('Model selector clicked');
    });
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

    // Analyze uploaded file
    function analyzeFile(formData) {
        // Call the Flask API endpoint (try the API_BASE_URL first, fall back to localhost:5000)
        const analyzeUrl = `${API_BASE_URL}/analyze`;
        
        fetch(analyzeUrl, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                // Try the original endpoint as fallback
                return fetch('http://localhost:5000/analyze', {
                    method: 'POST',
                    body: formData
                });
            }
            return response;
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('API Response:', data); // For debugging
            
            if (!data.success) {
                throw new Error(data.message || 'Analysis failed');
            }
            
            // Extract the analysis data
            const analysis = data.analysis;
            
            if (!analysis) {
                throw new Error('No analysis data returned');
            }
            
            // Format the raw analysis into a structured message
            let formattedResponse = '';
            
            // Use the raw analysis if available
            if (analysis.raw_analysis) {
                formattedResponse = formatMedicalContent(analysis.raw_analysis);
            } 
            // Otherwise, build it from sections
            else if (analysis.sections && Object.keys(analysis.sections).length > 0) {
                Object.entries(analysis.sections).forEach(([title, content]) => {
                    if (title && content) {
                        formattedResponse += `**${title}**\n\n${formatMedicalContent(content)}\n\n`;
                    }
                });
            } 
            // Fallback to a structured format for other response types
            else {
                formattedResponse = '**Medical Report Analysis**\n\n';
                
                // Add timestamp if available
                if (analysis.timestamp) {
                    const date = new Date(analysis.timestamp);
                    formattedResponse += `Analysis Date: ${date.toLocaleString()}\n\n`;
                }
                
                // Handle various possible response formats
                if (analysis.patient_info) {
                    formattedResponse += `**Patient Information**\n\n`;
                    Object.entries(analysis.patient_info).forEach(([key, value]) => {
                        formattedResponse += `${key}: ${value || 'N/A'}\n`;
                    });
                    formattedResponse += '\n';
                }
                
                if (analysis.key_diagnoses) {
                    formattedResponse += `**Key Diagnoses & Disease Detection**\n\n${formatMedicalContent(analysis.key_diagnoses)}\n\n`;
                }
                
                if (analysis.vital_signs) {
                    formattedResponse += `**Vital Signs**\n\n`;
                    Object.entries(analysis.vital_signs).forEach(([key, value]) => {
                        formattedResponse += `- ${key}: ${value}\n`;
                    });
                    formattedResponse += '\n';
                }
                
                if (analysis.test_results) {
                    formattedResponse += `**Test Results**\n\n`;
                    Object.entries(analysis.test_results).forEach(([key, value]) => {
                        formattedResponse += `- ${key}: ${value}\n`;
                    });
                    formattedResponse += '\n';
                }
                
                if (analysis.patient_summary) {
                    formattedResponse += `**Patient Summary**\n\n${formatMedicalContent(analysis.patient_summary)}\n\n`;
                }
                
                if (analysis.treatment_recommendations) {
                    formattedResponse += `**Treatment Recommendations**\n\n${formatMedicalContent(analysis.treatment_recommendations)}\n\n`;
                }
                
                if (analysis.specialist_referral) {
                    formattedResponse += `**Specialist Referral & Next Steps**\n\n${formatMedicalContent(analysis.specialist_referral)}\n\n`;
                }
                
                if (analysis.anomalies) {
                    formattedResponse += `**Anomalies & Urgent Concerns**\n\n${formatMedicalContent(analysis.anomalies)}\n\n`;
                }
            }
            
            // Display the analysis result
            addMessage(formattedResponse);
        })
        .catch(error => {
            console.error('Error:', error);
            addMessage("I'm sorry, there was an error processing your medical file: " + error.message);
        });
    }

    // Helper function to format medical content for better display
    function formatMedicalContent(content) {
        if (!content) return '';
        
        // Break long words to prevent overflow
        let formatted = content.replace(/(\S{30,})/g, function(match) {
            // Don't break URLs
            if (match.startsWith('http') || match.includes('@')) {
                return match;
            }
            return match.replace(/(.{15})/g, "$1\u200B"); // Add zero-width space every 15 chars
        });
        
        // Convert tabular data to more readable format
        // Look for patterns that might be tables (several lines with similar structure)
        const lines = formatted.split('\n');
        const tableStarts = [];
        const tableEnds = [];
        
        // Detect potential tables by looking for consecutive lines with similar patterns
        let inPotentialTable = false;
        let tableStartIndex = -1;
        let simpleFormat = true;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check if line could be part of a table (contains multiple ':' or '|' or multiple spaces as separators)
            const hasTableIndicators = 
                (line.split(':').length > 2) || 
                (line.split('|').length > 2) || 
                (line.match(/\s{2,}/g)?.length > 2);
            
            if (hasTableIndicators && !inPotentialTable) {
                inPotentialTable = true;
                tableStartIndex = i;
            } else if ((!hasTableIndicators || i === lines.length - 1) && inPotentialTable) {
                // We've reached the end of a potential table
                inPotentialTable = false;
                if (i - tableStartIndex > 2) { // Minimum 3 lines to be considered a table
                    tableStarts.push(tableStartIndex);
                    tableEnds.push(i - 1);
                }
            }
        }
        
        // Process detected tables
        if (tableStarts.length > 0) {
            let result = '';
            let lastEnd = 0;
            
            for (let t = 0; t < tableStarts.length; t++) {
                // Add text before table
                result += lines.slice(lastEnd, tableStarts[t]).join('\n') + '\n';
                
                // Create a cleanly formatted list instead of trying to preserve table structure
                const tableLines = lines.slice(tableStarts[t], tableEnds[t] + 1);
                
                for (let i = 0; i < tableLines.length; i++) {
                    // Convert each table row to a list item with breaks between parts
                    let line = tableLines[i].trim();
                    line = line.replace(/\s*\|\s*/g, ' • '); // Replace pipe separators
                    line = line.replace(/\s*:\s*/g, ': '); // Clean up colons
                    line = line.replace(/\s{3,}/g, ' • '); // Replace multiple spaces with bullets
                    
                    result += `- ${line}\n`;
                }
                
                lastEnd = tableEnds[t] + 1;
            }
            
            // Add text after last table
            result += lines.slice(lastEnd).join('\n');
            formatted = result;
        }
        
        return formatted;
    }

    // Function to show notifications (similar to map.js)
    function showNotification(message, type = 'success') {
        // Create notification element if it doesn't exist
        let notification = document.querySelector('.notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.className = `notification ${type}`;
            document.body.appendChild(notification);
        } else {
            // Reset classes and update type
            notification.className = `notification ${type}`;
        }
        
        // Set message
        notification.textContent = message;
        
        // Show the notification
        notification.style.display = 'block';
        
        // Add animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
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
            } else {
                // If history exists, scroll to the bottom to show latest messages
                scrollToBottom();
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


    // Add input focus effects
    if (chatInput) {
        chatInput.addEventListener('focus', () => {
            const inputWrapper = document.querySelector('.input-wrapper');
            if (inputWrapper) {
                inputWrapper.classList.add('focused');
                
                // Scroll to ensure input is visible when focused
                setTimeout(() => {
                    const chatInputContainer = document.querySelector('.chat-input-container');
                    if (chatInputContainer) {
                        chatInputContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }
                }, 100);
            }
        });
        
        chatInput.addEventListener('blur', () => {
            const inputWrapper = document.querySelector('.input-wrapper');
            if (inputWrapper) {
                inputWrapper.classList.remove('focused');
            }
        });
    }

    /**
     * Load the prescription reader content
     */
    function loadPrescriptionReader() {
        // Hide chat interface
        const chatInterface = document.querySelector('.chat-interface');
        if (chatInterface) {
            chatInterface.style.display = 'none';
        }

        // Ensure the CSS is loaded
        if (!document.querySelector('link[href="css/prescription-reader.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'css/prescription-reader.css';
            document.head.appendChild(link);
        }

        // Load the prescription reader script if not already loaded
        if (typeof window.loadPrescriptionReaderContent !== 'function') {
            // Load the necessary script
            loadScript('js/dashboard_pages/prescription_reader.js')
                .then(() => {
                    if (typeof window.loadPrescriptionReaderContent === 'function') {
                        window.loadPrescriptionReaderContent();
                    } else {
                        console.error('Failed to load prescription reader functions');
                        // Fallback to direct page navigation
                        window.location.href = 'prescription-reader.html';
                    }
                })
                .catch(error => {
                    console.error('Error loading prescription reader script:', error);
                    window.location.href = 'prescription-reader.html';
                });
        } else {
            // Script already loaded, call the function directly
            window.loadPrescriptionReaderContent();
        }
        
        // Update navigation state
        if (window.navigation && typeof window.navigation.setActiveMenuItem === 'function') {
            window.navigation.setActiveMenuItem('prescription-reader');
        }
    }
});

