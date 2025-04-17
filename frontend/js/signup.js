document.addEventListener('DOMContentLoaded', () => {
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
        const signupButton = document.querySelector('.login-button');
        if (isLoading) {
            signupButton.classList.add('loading-button');
            signupButton.disabled = true;
        } else {
            signupButton.classList.remove('loading-button');
            signupButton.disabled = false;
        }
    }

    // Form submission
    const signupForm = document.getElementById('signupForm');
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const termsAgreement = document.getElementById('termsAgreement').checked;

        // Validate inputs
        if (!fullName || !email || !password || !confirmPassword) {
            showError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            showError('Password must be at least 8 characters long');
            return;
        }

        if (!termsAgreement) {
            showError('You must agree to the terms of service');
            return;
        }

        setLoading(true);

        try {
            // Sign up with Supabase
            const { data, error } = await window.supabaseAuth.signUp(email, password, {
                full_name: fullName,
                user_type: selectedUserType
            });
            
            if (error) {
                throw error;
            }

            // Store user type in localStorage
            localStorage.setItem('userType', selectedUserType);
            
            // Clear any temporary chat session
            localStorage.removeItem('tempChatSessionId');

            // Show success message
            showError('Account created successfully! Redirecting to dashboard...');
            document.getElementById('error-message').style.color = 'var(--success-color)';
            document.getElementById('error-message').style.backgroundColor = 'rgba(72, 187, 120, 0.1)';
            document.getElementById('error-message').style.border = '1px solid rgba(72, 187, 120, 0.3)';

            // Redirect to appropriate dashboard after delay
            setTimeout(() => {
                if (selectedUserType === 'doctor') {
                    window.location.href = 'doctor-dashboard.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }, 2000);
        } catch (error) {
            console.error('Signup error:', error);
            showError(error.message || 'Sign up failed. Please try again.');
        } finally {
            setLoading(false);
        }
    });

    // Social signup buttons
    document.getElementById('google-signup').addEventListener('click', async () => {
        try {
            setLoading(true);
            
            // Store selected user type for OAuth redirect
            localStorage.setItem('oauth_userType', selectedUserType);
            
            // Clear any temporary chat session before OAuth redirect
            localStorage.removeItem('tempChatSessionId');
            
            await window.supabaseAuth.signInWithProvider('google');
            // The redirect will happen automatically
        } catch (error) {
            console.error('Google signup error:', error);
            showError('Failed to sign up with Google. Please try again.');
            setLoading(false);
        }
    });

    document.getElementById('microsoft-signup').addEventListener('click', async () => {
        try {
            setLoading(true);
            
            // Store selected user type for OAuth redirect
            localStorage.setItem('oauth_userType', selectedUserType);
            
            // Clear any temporary chat session before OAuth redirect
            localStorage.removeItem('tempChatSessionId');
            
            await window.supabaseAuth.signInWithProvider('azure');
            // The redirect will happen automatically
        } catch (error) {
            console.error('Microsoft signup error:', error);
            showError('Failed to sign up with Microsoft. Please try again.');
            setLoading(false);
        }
    });
}); 