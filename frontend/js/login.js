document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    checkAuthStatus();

    // Toggle password visibility
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.querySelector('#password');

    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.querySelector('i').classList.toggle('fa-eye');
        togglePassword.querySelector('i').classList.toggle('fa-eye-slash');
    });

    // User type selection
    const userTypes = document.querySelectorAll('.user-type');
    let selectedUserType = 'patient';
    
    userTypes.forEach(type => {
        type.addEventListener('click', () => {
            userTypes.forEach(t => t.classList.remove('active'));
            type.classList.add('active');
            selectedUserType = type.dataset.type;
        });
    });

    // Show error message
    function showError(message) {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    // Show loading state
    function setLoading(isLoading) {
        const loginButton = document.querySelector('.login-button');
        if (isLoading) {
            loginButton.classList.add('loading-button');
            loginButton.disabled = true;
        } else {
            loginButton.classList.remove('loading-button');
            loginButton.disabled = false;
        }
    }

    // Check if user is already logged in
    async function checkAuthStatus() {
        try {
            const { user, error } = await window.supabaseAuth.getCurrentUser();
            if (user) {
                // User is already logged in, check user type and redirect accordingly
                const userType = localStorage.getItem('userType') || sessionStorage.getItem('userType') || 'patient';
                if (userType === 'doctor') {
                    window.location.href = 'doctor-dashboard.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
        }
    }

    // Form submission
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember').checked;

        // Validate inputs
        if (!email || !password) {
            showError('Please enter both email and password');
            return;
        }

        setLoading(true);

        try {
            // Sign in with Supabase
            const { data, error } = await window.supabaseAuth.signIn(email, password);
            
            if (error) {
                throw error;
            }

            // Store user type in localStorage if remember me is checked
            if (rememberMe) {
                localStorage.setItem('userType', selectedUserType);
            } else {
                sessionStorage.setItem('userType', selectedUserType);
            }
            
            // Clear any temporary chat session 
            localStorage.removeItem('tempChatSessionId');

            // Redirect based on selected user type
            if (selectedUserType === 'doctor') {
                window.location.href = 'doctor-dashboard.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            console.error('Login error:', error);
            showError(error.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    });

    // Social login buttons
    document.getElementById('google-login').addEventListener('click', async () => {
        try {
            setLoading(true);
            
            // Store selected user type before OAuth redirect
            localStorage.setItem('oauth_userType', selectedUserType);
            
            // Clear any temporary chat session before OAuth redirect
            localStorage.removeItem('tempChatSessionId');
            
            await window.supabaseAuth.signInWithProvider('google');
            // The redirect will happen automatically
        } catch (error) {
            console.error('Google login error:', error);
            showError('Failed to login with Google. Please try again.');
            setLoading(false);
        }
    });

    document.getElementById('microsoft-login').addEventListener('click', async () => {
        try {
            setLoading(true);
            
            // Store selected user type before OAuth redirect
            localStorage.setItem('oauth_userType', selectedUserType);
            
            // Clear any temporary chat session before OAuth redirect
            localStorage.removeItem('tempChatSessionId');
            
            await window.supabaseAuth.signInWithProvider('azure');
            // The redirect will happen automatically
        } catch (error) {
            console.error('Microsoft login error:', error);
            showError('Failed to login with Microsoft. Please try again.');
            setLoading(false);
        }
    });

    // Forgot password
    document.getElementById('forgot-password').addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        if (!email) {
            showError('Please enter your email address to reset your password');
            return;
        }

        try {
            setLoading(true);
            const { error } = await window.supabaseAuth.resetPassword(email);
            
            if (error) {
                throw error;
            }

            // Show success message
            document.getElementById('error-message').textContent = 'Password reset email sent. Please check your inbox.';
            document.getElementById('error-message').style.display = 'block';
            document.getElementById('error-message').style.color = 'var(--success-color)';
            document.getElementById('error-message').style.backgroundColor = 'rgba(72, 187, 120, 0.1)';
            document.getElementById('error-message').style.border = '1px solid rgba(72, 187, 120, 0.3)';
        } catch (error) {
            console.error('Password reset error:', error);
            showError(error.message || 'Failed to send password reset email. Please try again.');
        } finally {
            setLoading(false);
        }
    });

    // Sign up link
    document.getElementById('signup-link').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'signup.html';
    });
}); 