/**
 * Report Analysis Module
 * Handles the display and functionality of the report analysis page, including PDF uploads
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the report-analysis page or loading content in dashboard
    const isReportAnalysisPage = window.location.pathname.includes('report-analysis.html');
    
    // Initialize the upload functionality directly if we're on the report page
    if (isReportAnalysisPage) {
        initUploadFunctionality();
        
        // Initialize event listeners specific to this page
        initReportPage();
        
        // Fix scrolling issues
        fixScrollingIssues();
        
        // Hide scrollbars
        hideScrollbars();
    }

    // Make sure navigation is properly initialized on this page
    if (window.navigation && typeof window.navigation.setActiveMenuItem === 'function') {
        // Set the active menu item ONLY if we're on the report analysis page
        if (isReportAnalysisPage) {
            window.navigation.setActiveMenuItem('report-analysis');
        }
    } else if (isReportAnalysisPage) {
        console.warn('Navigation module not available, fallback to basic navigation');
        // Basic fallback for navigation if the navigation.js isn't loaded properly
        const reportAnalysisLink = document.getElementById('report-analysis');
        const aiAssistantLink = document.getElementById('ai-assistant');
        const findHospitalsLink = document.getElementById('find-hospitals');
        
        if (reportAnalysisLink) {
            reportAnalysisLink.classList.add('active');
        }
        
        // Setup click handlers with fallback navigation
        if (aiAssistantLink) {
            aiAssistantLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'dashboard.html';
            });
        }
        
        if (findHospitalsLink) {
            findHospitalsLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'map.html';
            });
        }
    }
});

// API endpoints
const API_BASE_URL = 'http://localhost:5001';
const FALLBACK_API_URL = 'http://localhost:5000';

// API endpoints for the backend
const API_ENDPOINTS = {
    analyze: 'http://localhost:5000/analyze'
};

/**
 * Fix scrolling issues across the page
 */
function fixScrollingIssues() {
    // Make only the main content scrollable and fix nested scrollbar issues
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        // Configure main content to be scrollable
        mainContent.style.height = '100vh';
        mainContent.style.overflow = 'auto';
        mainContent.style.position = 'relative';
        mainContent.style.marginLeft = '260px'; // Maintain sidebar margin
    }
    
    // Make sure the report analysis content doesn't have its own scrollbar
    const reportAnalysisContent = document.querySelector('.report-analysis-content');
    if (reportAnalysisContent) {
        reportAnalysisContent.style.overflowY = 'visible';
        reportAnalysisContent.style.height = 'auto';
        reportAnalysisContent.style.minHeight = '100%';
        reportAnalysisContent.style.paddingBottom = '50px'; // Add padding to bottom for better spacing
    }
    
    // Make sure analysis results container doesn't have its own scrollbar
    const analysisResults = document.getElementById('analysis-results');
    if (analysisResults) {
        analysisResults.style.overflowY = 'visible';
    }
    
    // Make sure analysis content doesn't have its own scrollbar
    const analysisContent = document.getElementById('analysis-content');
    if (analysisContent) {
        analysisContent.style.overflowY = 'visible';
        analysisContent.style.maxHeight = 'none';
    }
}

/**
 * Initialize the report analysis page specific elements
 */
function initReportPage() {
    // Any additional report page specific initialization can go here
    console.log('Report analysis page initialized');
    
    // Initialize analysis results container
    const analysisResults = document.getElementById('analysis-results');
    if (analysisResults) {
        // Make sure it's hidden initially
        analysisResults.style.display = 'none';
    }
}

/**
 * Initialize the upload functionality
 */
function initUploadFunctionality() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const browseButton = document.querySelector('.browse-button');
    
    if (!uploadArea || !fileInput || !browseButton) return;
    
    // Open file dialog when browse button is clicked
    browseButton.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Handle file selection
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            // Only handle the first file
            handleFileUpload(files[0]);
        }
    });
    
    // Handle drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            // Only handle the first file
            handleFileUpload(files[0]);
        }
    });
}

/**
 * Switch back to the chat interface
 */
function switchToChatInterface() {
    console.log('Switching to chat interface');
    // Get the chat interface and report analysis content
    const chatInterface = document.querySelector('.chat-interface');
    const reportAnalysisContent = document.querySelector('.report-analysis-content');
    const inputContainer = document.querySelector('.chat-input-container');
    
    if (reportAnalysisContent) {
        reportAnalysisContent.style.display = 'none';
    }
    
    if (chatInterface) {
        chatInterface.style.display = 'flex';
        
        // Reset chat interface styles to prevent position issues
        chatInterface.style.height = '100%';
        
        // Ensure input container is fixed at the bottom
        if (inputContainer) {
            inputContainer.style.position = 'fixed';
            inputContainer.style.bottom = '20px';
            inputContainer.style.left = 'calc(260px + 2rem)'; // Account for sidebar width
            inputContainer.style.right = '2rem';
            inputContainer.style.zIndex = '100';
        }
        
        // Call the dedicated reset function if available
        if (typeof window.resetChatLayout === 'function') {
            window.resetChatLayout();
        } else {
            // Fallback to manual reset
            const inputWrapper = document.querySelector('.input-wrapper');
            if (inputWrapper) {
                inputWrapper.style.position = 'relative';
                inputWrapper.style.bottom = 'auto';
                inputWrapper.style.transform = 'none';
                inputWrapper.style.marginTop = '0';
            }
            
            const chatMessages = document.querySelector('.chat-messages');
            if (chatMessages) {
                // If we have an input container, make sure messages don't go under it
                if (inputContainer) {
                    const inputHeight = inputContainer.offsetHeight;
                    chatMessages.style.paddingBottom = `${inputHeight + 40}px`;
                }
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }
    } else {
        console.error('Chat interface not found');
    }
    
    // Update active menu item - try different possible selectors
    updateActiveMenuItem('ai-assistant');
    
    // Reset the main content area scrolling and styles
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.overflowY = 'auto';
        mainContent.style.height = '100%';
        mainContent.style.position = 'relative';
        // Reset any accumulated transforms or margins
        mainContent.style.transform = 'none';
        mainContent.style.margin = '0';
        mainContent.style.marginLeft = '260px'; // Maintain sidebar margin
    }
    
    // Force reload if needed
    if (!chatInterface) {
        console.log('Chat interface not found, reloading dashboard');
        window.location.href = 'dashboard.html';
    }
}

/**
 * Load the report analysis content into the main content area
 */
function loadReportAnalysisContent() {
    // Get the chat interface container
    const chatInterface = document.querySelector('.chat-interface');
    
    if (!chatInterface) return;
    
    // Hide the chat interface and show report analysis content
    chatInterface.style.display = 'none';
    
    // Reset chat styling completely to prevent style inheritance
    chatInterface.style.position = '';
    chatInterface.style.transform = '';
    chatInterface.style.height = '';
    
    // Reset any chat-related positioning that may affect layout
    const inputWrapper = document.querySelector('.input-wrapper');
    if (inputWrapper) {
        inputWrapper.style.position = '';
        inputWrapper.style.bottom = '';
        inputWrapper.style.transform = '';
        inputWrapper.style.marginTop = '';
    }
    
    // Create the report analysis content if it doesn't exist
    let reportAnalysisContent = document.querySelector('.report-analysis-content');
    
    if (!reportAnalysisContent) {
        reportAnalysisContent = document.createElement('div');
        reportAnalysisContent.className = 'report-analysis-content';
        
        // Add specific styles to ensure scrolling works
        reportAnalysisContent.style.height = '100%';
        reportAnalysisContent.style.overflowY = 'auto';
        reportAnalysisContent.style.display = 'flex';
        reportAnalysisContent.style.flexDirection = 'column';
        reportAnalysisContent.style.padding = '24px';
        reportAnalysisContent.style.position = 'relative'; // Ensure positioning context is clear
        
        // Create the content structure
        reportAnalysisContent.innerHTML = `
            <div class="report-analysis-header">
                <h1>Report Analysis</h1>
                <p class="subtitle">Upload your medical reports and our AI will analyze them for you.</p>
            </div>
            
            <div class="report-upload-container">
                <div class="upload-area" id="upload-area">
                    <div class="upload-icon">
                        <i class="fas fa-cloud-upload-alt"></i>
                    </div>
                    <h3>Upload Medical Reports</h3>
                    <p>Drag and drop your PDF report here</p>
                    <p class="or-divider">or</p>
                    <button class="browse-button">Browse Files</button>
                    <input type="file" id="file-input" accept=".pdf" style="display: none;">
                </div>
                
                <div class="upload-tips">
                    <p><i class="fas fa-info-circle"></i> Uploading a new file will replace the previous one.</p>
                    <p><i class="fas fa-lock"></i> Your files are securely processed and encrypted.</p>
                </div>
            </div>
            
            <div class="uploaded-reports-container">
                <h2>Your Uploaded Report</h2>
                <div class="reports-list" id="reports-list">
                    <!-- Report will be dynamically added here -->
                    <div class="empty-reports-message">
                        <i class="fas fa-file-medical-alt"></i>
                        <p>No report uploaded yet. Upload your medical report to get started.</p>
                    </div>
                </div>
            </div>
            
            <!-- This is always included in the HTML structure -->
            <div class="analysis-results-container" id="analysis-results" style="display: none; margin-top: 30px; margin-bottom: 30px; background-color: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 20px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);">
                <h2 style="color: #fff; margin-bottom: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 10px;">Analysis Results</h2>
                <div id="analysis-content" style="color: #e2e8f0; line-height: 1.6; overflow-y: auto; max-height: 600px;">
                    <!-- Analysis content will be added here -->
                </div>
            </div>
        `;
        
        // Add the report analysis content to the main content area
        const mainContent = document.querySelector('.main-content');
        
        // Ensure the main content has proper styling for scrolling
        if (mainContent) {
            mainContent.style.height = '100%';
            mainContent.style.display = 'flex';
            mainContent.style.flexDirection = 'column';
            mainContent.style.overflow = 'auto';
            mainContent.appendChild(reportAnalysisContent);
            
            // Reset any position-related styles to prevent input shifting, but maintain sidebar margin
            mainContent.style.position = 'relative';
            mainContent.style.transform = 'none';
            mainContent.style.margin = '0';
            mainContent.style.marginLeft = '260px'; // Maintain proper margin for fixed sidebar
        }
        
        // Initialize the upload functionality
        initUploadFunctionality();
    } else {
        // If it exists, just show it
        reportAnalysisContent.style.display = 'flex';
        
        // Ensure it has proper overflow settings
        reportAnalysisContent.style.overflowY = 'auto';
        reportAnalysisContent.style.height = '100%';
        reportAnalysisContent.style.position = 'relative'; // Maintain consistent positioning
    }
    
    // Update active menu item
    updateActiveMenuItem('report-analysis');
    
    // Ensure the main content area takes up the full height of its container
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.height = '100%';
        mainContent.style.overflow = 'auto';
        mainContent.style.position = 'relative';
        mainContent.style.transform = 'none';
        mainContent.style.margin = '0';
        mainContent.style.marginLeft = '260px';
    }
}

/**
 * Handle file upload
 * @param {File} file - The file to upload
 */
function handleFileUpload(file) {
    // Get the reports list element
    const reportsList = document.getElementById('reports-list');
    if (!reportsList) return;
    
    // Clear any existing reports
    const existingReports = reportsList.querySelectorAll('.report-item');
    existingReports.forEach(item => item.remove());
    
    // Hide the analysis if it's showing
    const analysisContainer = document.getElementById('analysis-results');
    if (analysisContainer) {
        analysisContainer.style.display = 'none';
    }
    
    // Get the empty message
    const emptyMessage = reportsList.querySelector('.empty-reports-message');
    
    // Hide the empty message if it exists
    if (emptyMessage) {
        emptyMessage.style.display = 'none';
    }
    
    // Validate file type (PDF only)
    if (file.type !== 'application/pdf') {
        // Show error for non-PDF files
        alert(`${file.name} is not a PDF file. Only PDF files are supported.`);
        
        // Show empty message if no valid file
        if (emptyMessage) {
            emptyMessage.style.display = 'block';
        }
        
        return;
    }
    
    // Create report item with "Uploading" status
    const reportItem = document.createElement('div');
    reportItem.className = 'report-item';
    reportItem.innerHTML = `
        <div class="report-icon">
            <i class="fas fa-file-pdf"></i>
        </div>
        <div class="report-details">
            <div class="report-name">${file.name}</div>
            <div class="report-size">${formatFileSize(file.size)}</div>
            <div class="report-status">
                <span class="status-uploading">Uploading...</span>
            </div>
        </div>
        <div class="report-actions">
            <button class="view-report-btn" onclick="viewReport('${file.name}')" disabled>
                <i class="fas fa-eye"></i>
            </button>
            <button class="delete-report-btn" onclick="deleteReportItem(this)">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    // Add the report item to the list
    reportsList.appendChild(reportItem);
    
    // Upload file to server for analysis
    uploadAndAnalyzeFile(file, reportItem);
}

/**
 * Upload and analyze the file using the backend API
 * @param {File} file - The file to analyze
 * @param {HTMLElement} reportItem - The report item element
 */
function uploadAndAnalyzeFile(file, reportItem) {
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
    // Get status element
    const statusEl = reportItem.querySelector('.report-status span');
    const viewBtn = reportItem.querySelector('.view-report-btn');
    
    // Make API request
    fetch(API_ENDPOINTS.analyze, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Analysis response:', data);
        
        if (!data.success) {
            throw new Error(data.message || 'Analysis failed');
        }
        
        // Store the analysis data as a data attribute
        reportItem.dataset.analysis = JSON.stringify(data.analysis);
        
        // Update status to ready
        statusEl.className = 'status-ready';
        statusEl.textContent = 'Ready';
        
        // Enable view button
        viewBtn.disabled = false;
        
        // Show analysis results
        viewReport(file.name, data.analysis);
    })
    .catch(error => {
        console.error('Error analyzing file:', error);
        
        // Update status to error
        statusEl.className = 'status-error';
        statusEl.textContent = 'Error';
        
        // Show error message
        alert(`Error analyzing file: ${error.message}`);
    });
}

/**
 * View a report analysis
 * @param {string} fileName - The name of the file
 * @param {Object} analysisData - Optional analysis data (if already available)
 */
function viewReport(fileName, analysisData) {
    // If no analysis data provided, try to get it from the report item
    if (!analysisData) {
        const reportItem = document.querySelector(`.report-item .report-name:contains('${fileName}')`).closest('.report-item');
        if (reportItem && reportItem.dataset.analysis) {
            try {
                analysisData = JSON.parse(reportItem.dataset.analysis);
            } catch (error) {
                console.error('Error parsing analysis data:', error);
                alert('Error displaying analysis results.');
                return;
            }
        } else {
            alert('Analysis data not found.');
            return;
        }
    }
    
    showAnalysisForFile(fileName, analysisData);
}

/**
 * Show analysis for a specific file
 * @param {string} fileName - The name of the file
 * @param {Object} analysisData - The analysis data from the API
 */
function showAnalysisForFile(fileName, analysisData) {
    console.log('Showing analysis for:', fileName);
    
    // Get the analysis container
    const analysisContainer = document.getElementById('analysis-results');
    const analysisContent = document.getElementById('analysis-content');
    
    if (!analysisContainer || !analysisContent) {
        console.error('Analysis container not found');
        return;
    }
    
    // Show the analysis container
    analysisContainer.style.display = 'block';
    
    // Clear previous content
    analysisContent.innerHTML = `
        <div style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
            <h3 style="margin: 0 0 8px; color: #fff;">${fileName} Analysis</h3>
            <p style="margin: 0; color: #a0aec0; font-size: 14px;">Analyzed on ${new Date().toLocaleString()}</p>
        </div>
    `;
    
    // Ensure the analysis content has proper styling for scrolling
    analysisContent.style.overflowY = 'auto';
    analysisContent.style.maxHeight = '60vh';
    analysisContent.style.paddingRight = '10px';
    
    // Get the raw analysis text from the analysis data
    let analysisText = '';
    
    if (analysisData.raw_analysis) {
        analysisText = analysisData.raw_analysis;
    } else if (analysisData.sections && Object.keys(analysisData.sections).length > 0) {
        // Build formatted text from sections
        Object.entries(analysisData.sections).forEach(([title, content]) => {
            if (title && content) {
                analysisText += `**${title}**\n\n${content}\n\n`;
            }
        });
    }
    
    if (!analysisText) {
        analysisContent.innerHTML += '<p style="color: #e53e3e;">No analysis data available.</p>';
        return;
    }
    
    // Format the content
    const sections = analysisText.split(/\*\*(.*?)\*\*/g);
    
    for (let i = 0; i < sections.length; i++) {
        if (i % 2 === 1) { // Section title
            const sectionTitle = document.createElement('h3');
            sectionTitle.style.color = '#805ad5';
            sectionTitle.style.marginTop = '24px';
            sectionTitle.style.marginBottom = '12px';
            sectionTitle.style.paddingBottom = '8px';
            sectionTitle.style.borderBottom = '1px solid rgba(128, 90, 213, 0.3)';
            sectionTitle.textContent = sections[i];
            analysisContent.appendChild(sectionTitle);
        } else if (sections[i].trim()) { // Section content
            const sectionContent = document.createElement('div');
            sectionContent.style.marginBottom = '20px';
            
            // Format lists and content
            let content = sections[i]
                .replace(/\n\n/g, '<br><br>')
                .replace(/\n-\s+(.*?)(?=\n-|\n\n|$)/g, '<li>$1</li>')
                .replace(/\n\d+\.\s+(.*?)(?=\n\d+\.|\n\n|$)/g, '<li>$1</li>');
            
            // Wrap lists
            if (content.includes('<li>')) {
                content = content.replace(/(<li>.*?<\/li>)+/g, '<ul style="padding-left: 24px; margin: 12px 0;">$&</ul>');
            }
            
            // Highlight abnormal values
            content = content.replace(/(\d+(\.\d+)?\s*(g\/dL|mg\/dL|U\/L|cells\/mm3|%|mmol\/L|ng\/mL)?\s*\(Low\s*[^)]*\))/gi, 
                '<span style="color: #fc8181; font-weight: 600;">$1</span>');
            
            content = content.replace(/(\d+(\.\d+)?\s*(g\/dL|mg\/dL|U\/L|cells\/mm3|%|mmol\/L|ng\/mL)?\s*\(High\s*[^)]*\))/gi,
                '<span style="color: #fc8181; font-weight: 600;">$1</span>');
            
            content = content.replace(/(\d+(\.\d+)?\s*(g\/dL|mg\/dL|U\/L|cells\/mm3|%|mmol\/L|ng\/mL)?\s*\(Normal\s*[^)]*\))/gi,
                '<span style="color: #68d391;">$1</span>');
                
            // Highlight diagnoses and important terms
            content = content.replace(/(diagnosed with|positive for|evidence of|abnormal|urgent|critical|referral)\s+([^.,]+)/gi,
                '$1 <span style="color: #fbd38d; font-weight: 600;">$2</span>');
            
            sectionContent.innerHTML = content;
            analysisContent.appendChild(sectionContent);
        }
    }
    
    // Scroll to the analysis with a small delay to ensure everything is rendered
    setTimeout(() => {
        analysisContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

/**
 * Delete a report item
 * @param {HTMLElement} button - The delete button element
 */
function deleteReportItem(button) {
    // Get the report item
    const reportItem = button.closest('.report-item');
    
    if (reportItem) {
        reportItem.remove();
        
        // Show empty message if no reports left
        const reportsList = document.getElementById('reports-list');
        if (reportsList && reportsList.querySelectorAll('.report-item').length === 0) {
            const emptyMessage = reportsList.querySelector('.empty-reports-message');
            if (emptyMessage) {
                emptyMessage.style.display = 'block';
            }
            
            // Hide analysis when all reports are deleted
            const analysisContainer = document.getElementById('analysis-results');
            if (analysisContainer) {
                analysisContainer.style.display = 'none';
            }
        }
    }
}

/**
 * Format file size in a human-readable format
 * @param {number} bytes - The size in bytes
 * @returns {string} - Formatted size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Update the active menu item
 * @param {string} activeId - The ID of the active menu item
 */
function updateActiveMenuItem(activeId) {
    const menuItems = document.querySelectorAll('.nav-menu a');
    
    menuItems.forEach(item => {
        if (item.id === activeId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Add jQuery-like contains selector
Element.prototype.matches = Element.prototype.matches || Element.prototype.msMatchesSelector;
Element.prototype.closest = Element.prototype.closest || function(selector) {
    let el = this;
    while (el) {
        if (el.matches(selector)) {
            return el;
        }
        el = el.parentElement;
    }
    return null;
};

// Make global functions accessible
window.viewReport = viewReport;
window.deleteReportItem = deleteReportItem;
window.switchToChatInterface = switchToChatInterface;
window.loadReportAnalysisContent = loadReportAnalysisContent;
window.initUploadFunctionality = initUploadFunctionality;
window.fixScrollingIssues = fixScrollingIssues;

/**
 * Hide scrollbars on all scrollable elements
 */
function hideScrollbars() {
    // Main scrollable container
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.msOverflowStyle = 'none'; // IE and Edge
        mainContent.style.scrollbarWidth = 'none'; // Firefox
        
        // Make sure scrolling still works
        mainContent.style.overflow = 'auto';
    }
    
    // Apply to html and body as well
    document.documentElement.style.msOverflowStyle = 'none';
    document.documentElement.style.scrollbarWidth = 'none';
    document.body.style.msOverflowStyle = 'none';
    document.body.style.scrollbarWidth = 'none';
    
    // For dynamically loaded content
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                const scrollableElements = document.querySelectorAll('.main-content, .report-analysis-content, .analysis-results-container, #analysis-content');
                scrollableElements.forEach(el => {
                    el.style.msOverflowStyle = 'none';
                    el.style.scrollbarWidth = 'none';
                });
            }
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
} 