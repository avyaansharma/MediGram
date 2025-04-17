/**
 * Navigation Module
 * Centralized navigation system for handling page transitions and sidebar navigation
 */

// Store navigation state
const navigationState = {
    currentPage: '',
    previousPage: '',
    pageTransitioning: false
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize navigation elements
    initNavigation();
});

/**
 * Initialize navigation elements and event handlers
 */
function initNavigation() {
    // Get current page from URL
    navigationState.currentPage = getCurrentPageFromURL();
    
    // Make the sidebar unscrollable
    fixSidebarLayout();
    
    // Set up active menu item based on current page
    setActiveMenuItem();
    
    // Set up navigation click handlers
    setupNavigationHandlers();
    
    // Handle notifications
    setupNotifications();
    
    // Handle user profile dropdown
    setupUserProfileDropdown();
    
    // Extra check to ensure active menu item is correctly set for dashboard
    if (navigationState.currentPage === 'dashboard' || !navigationState.currentPage) {
        const aiAssistant = document.getElementById('ai-assistant');
        if (aiAssistant) {
            // Reset all menu items first
            const menuItems = document.querySelectorAll('.nav-menu a');
            menuItems.forEach(item => item.classList.remove('active'));
            
            // Set AI Assistant as active
            aiAssistant.classList.add('active');
        }
    }
    
    console.log('Navigation initialized for page:', navigationState.currentPage);
}

/**
 * Fix sidebar layout and positioning
 */
function fixSidebarLayout() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.style.position = 'fixed';
        sidebar.style.top = '0';
        sidebar.style.left = '0';
        sidebar.style.bottom = '0';
        sidebar.style.overflowY = 'auto';
        sidebar.style.zIndex = '1000';
        
        // Adjust main content to account for fixed sidebar
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.marginLeft = '260px'; // Match sidebar width
        }
    }
}

/**
 * Get current page name from URL
 * @returns {string} - Page name (dashboard, report-analysis, map, or empty string for index/dashboard)
 */
function getCurrentPageFromURL() {
    const path = window.location.pathname;
    const pageName = path.split('/').pop().split('.')[0];
    
    // Handle case where URL might end with / (index)
    if (!pageName) return 'dashboard';
    
    return pageName;
}

/**
 * Set up navigation click handlers for menu items
 */
function setupNavigationHandlers() {
    const menuItems = document.querySelectorAll('.nav-menu a');
    
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Don't do anything if link is already active
            if (item.classList.contains('active')) return;
            
            // Get the target page ID
            const targetPageId = item.id;
            
            // Navigate to the appropriate page
            navigateToPage(targetPageId);
        });
    });
}

/**
 * Navigate to a specific page
 * @param {string} targetPageId - ID of the target page/menu item
 * @param {boolean} forceReload - Whether to force a full page reload
 */
function navigateToPage(targetPageId, forceReload = false) {
    // Record previous page before changing
    navigationState.previousPage = navigationState.currentPage;
    
    // Prevent multiple navigation attempts
    if (navigationState.pageTransitioning) return;
    navigationState.pageTransitioning = true;
    
    console.log(`Navigating from ${navigationState.previousPage} to ${targetPageId}`);
    
    // Clear any active navigation timers
    if (window.navigationTimer) {
        clearTimeout(window.navigationTimer);
    }
    
    // Set transition state with a timeout to prevent rapid clicking
    window.navigationTimer = setTimeout(() => {
        navigationState.pageTransitioning = false;
    }, 500);
    
    // Handle navigation based on target page
    switch (targetPageId) {
        case 'ai-assistant':
            // For dashboard, we either load dashboard.html or show chat interface if already on dashboard
            if (navigationState.currentPage === 'dashboard' && !forceReload) {
                // If already on dashboard page, just show chat interface
                if (typeof window.showChatInterface === 'function') {
                    window.showChatInterface();
                }
            } else {
                // Navigate to dashboard.html
                window.location.href = 'dashboard.html';
            }
            navigationState.currentPage = 'dashboard';
            break;
            
        case 'report-analysis':
            // For report analysis, load report-analysis.html
            window.location.href = 'report-analysis.html';
            navigationState.currentPage = 'report-analysis';
            break;
            
        case 'find-hospitals':
            // For map, load map.html
            window.location.href = 'map.html';
            navigationState.currentPage = 'map';
            break;
            
        case 'prescription-reader':
            // For prescription reader, load prescription-reader.html
            window.location.href = 'prescription-reader.html';
            navigationState.currentPage = 'prescription-reader';
            break;
            
        default:
            // For other links, show notification that they're coming soon
            const linkElement = document.getElementById(targetPageId);
            if (linkElement) {
                const featureName = linkElement.querySelector('span')?.textContent || targetPageId;
                if (window.showNotification) {
                    window.showNotification(`${featureName} feature is coming soon!`, 'info');
                } else {
                    alert(`${featureName} feature is coming soon!`);
                }
            }
            // Don't update current page in this case
            navigationState.pageTransitioning = false;
            return;
    }
    
    // Update active menu item
    setActiveMenuItem(targetPageId);
}

/**
 * Set the active menu item based on the current page or specified item
 * @param {string} activeId - Optional ID to force as active
 */
function setActiveMenuItem(activeId = null) {
    // Find all menu items
    const menuItems = document.querySelectorAll('.nav-menu a');
    
    // Reset active state
    menuItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // If activeId is provided, set that item as active
    if (activeId) {
        const activeItem = document.getElementById(activeId);
        if (activeItem) {
            activeItem.classList.add('active');
            return;
        }
    }
    
    // Set active based on current page
    const currentPage = navigationState.currentPage || getCurrentPageFromURL();
    
    if (currentPage === 'dashboard' || currentPage === '') {
        const aiAssistant = document.getElementById('ai-assistant');
        if (aiAssistant) {
            aiAssistant.classList.add('active');
        }
    } else if (currentPage === 'report-analysis') {
        const reportAnalysis = document.getElementById('report-analysis');
        if (reportAnalysis) {
            reportAnalysis.classList.add('active');
        }
    } else if (currentPage === 'map') {
        const findHospitals = document.getElementById('find-hospitals');
        if (findHospitals) {
            findHospitals.classList.add('active');
        }
    } else if (currentPage === 'prescription-reader') {
        const prescriptionReader = document.getElementById('prescription-reader');
        if (prescriptionReader) {
            prescriptionReader.classList.add('active');
        }
    }
}

/**
 * Set up notifications functionality
 */
function setupNotifications() {
    const notifications = document.querySelector('.notifications');
    const badge = document.querySelector('.badge');

    if (notifications && badge) {
        notifications.addEventListener('click', () => {
            // In a real app, this would show a notifications panel
            badge.textContent = '0';
            badge.style.display = 'none';
        });
    }
}

/**
 * Set up user profile dropdown functionality
 */
function setupUserProfileDropdown() {
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
        
        // Setup logout button
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', async (e) => {
                e.preventDefault();
                if (window.utils && typeof window.utils.logout === 'function') {
                    await window.utils.logout();
                } else {
                    // Fallback to redirect to login page
                    window.location.href = 'login.html';
                }
            });
        }
    }
}

/**
 * Go back to previous page
 */
function goBack() {
    if (navigationState.previousPage) {
        navigateToPage(navigationState.previousPage);
    } else {
        // Default to dashboard if no previous page
        navigateToPage('ai-assistant');
    }
}

// Make functions available globally
window.navigation = {
    navigateToPage,
    setActiveMenuItem,
    goBack,
    setupNotifications,
    setupUserProfileDropdown,
    getCurrentPage: () => navigationState.currentPage,
    getPreviousPage: () => navigationState.previousPage,
}; 