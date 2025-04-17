// Utility functions for the HealthAI application

// Check authentication status and redirect if not logged in
async function requireAuth() {
    try {
        const { user, error } = await window.supabaseAuth.getCurrentUser();
        if (error || !user) {
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
            return null;
        }
        
        // Check if current page matches user type
        const userType = getUserType();
        const currentPage = window.location.pathname.split('/').pop();
        
        // Redirect if on wrong dashboard
        if (userType === 'doctor' && currentPage === 'dashboard.html') {
            window.location.href = 'doctor-dashboard.html';
            return null;
        } else if (userType === 'patient' && currentPage === 'doctor-dashboard.html') {
            window.location.href = 'dashboard.html';
            return null;
        }
        
        return user;
    } catch (error) {
        console.error('Error checking authentication:', error);
        window.location.href = 'login.html';
        return null;
    }
}

// Get user type (doctor or patient)
function getUserType() {
    // First try session storage, then local storage
    return sessionStorage.getItem('userType') || 
           localStorage.getItem('userType') || 
           'patient'; // Default to patient if not set
}

// Set user type in storage
function setUserType(type, remember = false) {
    if (remember) {
        localStorage.setItem('userType', type);
    } else {
        sessionStorage.setItem('userType', type);
    }
}

// Format date to readable format
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Handle logout
async function logout() {
    try {
        showNotification('Logging out...', 'info');
        
        // Get current user before signing out to clear their specific session
        const { user } = await window.supabaseAuth.getCurrentUser();
        
        const { error } = await window.supabaseAuth.signOut();
        
        if (error) {
            throw error;
        }
        
        // Clear all auth-related data
        sessionStorage.clear();
        localStorage.removeItem('userType');
        
        // Clear user-specific chat session
        if (user && user.id) {
            localStorage.removeItem(`chatSessionId_${user.id}`);
        }
        
        // Clear temporary chat session if it exists
        localStorage.removeItem('tempChatSessionId');
        
        // Redirect to login page
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error logging out:', error);
        showNotification('Error logging out. Please try again.', 'error');
    }
}

// Show notification
function showNotification(message, type = 'success') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    // Set notification content and style
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}

// Handle OAuth redirects
function handleOAuthRedirect() {
    // Check if we're returning from an OAuth redirect
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
        // Get the stored OAuth user type if present
        const oauthUserType = localStorage.getItem('oauth_userType');
        if (oauthUserType) {
            // Set the user type from the stored OAuth selection
            setUserType(oauthUserType, true);
            // Clear the temporary OAuth user type
            localStorage.removeItem('oauth_userType');
            
            // Redirect to appropriate dashboard after a short delay
            setTimeout(() => {
                if (oauthUserType === 'doctor') {
                    window.location.href = 'doctor-dashboard.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }, 500);
            
            return true;
        }
    }
    return false;
}

// Export functions to global scope for easy access from other scripts
window.utils = {
    requireAuth,
    getUserType,
    setUserType,
    formatDate,
    logout,
    showNotification,
    handleOAuthRedirect
}; 