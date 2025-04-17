// Supabase client initialization
const supabaseUrl = 'https://ipotykwrcmzgfknuxwal.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlwb3R5a3dyY216Z2ZrbnV4d2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1NzE3OTMsImV4cCI6MjA2MDE0Nzc5M30.XZUU7H5NadiiiNvmEwanRKYxqe2_ufmyZFq_DYiLJBA';

// Initialize the Supabase client
const _supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

// Helper functions for auth
const auth = {
    // Sign up new user
    async signUp(email, password, userData = {}) {
        try {
            const { data, error } = await _supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        ...userData
                    }
                }
            });
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error signing up:', error);
            return { data: null, error };
        }
    },
    
    // Sign in existing user
    async signIn(email, password) {
        try {
            const { data, error } = await _supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error signing in:', error);
            return { data: null, error };
        }
    },
    
    // Sign in with OAuth provider
    async signInWithProvider(provider) {
        try {
            // Get selected user type before redirect
            const userType = localStorage.getItem('oauth_userType') || 'patient';
            const redirectUrl = userType === 'doctor' ? 
                `${window.location.origin}/doctor-dashboard.html` : 
                `${window.location.origin}/dashboard.html`;
            
            const { data, error } = await _supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: redirectUrl
                }
            });
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error(`Error signing in with ${provider}:`, error);
            return { data: null, error };
        }
    },
    
    // Sign out
    async signOut() {
        try {
            const { error } = await _supabase.auth.signOut();
            if (error) throw error;
            return { error: null };
        } catch (error) {
            console.error('Error signing out:', error);
            return { error };
        }
    },
    
    // Get current user
    async getCurrentUser() {
        try {
            const { data: { user }, error } = await _supabase.auth.getUser();
            if (error) throw error;
            return { user, error: null };
        } catch (error) {
            console.error('Error getting current user:', error);
            return { user: null, error };
        }
    },
    
    // Reset password
    async resetPassword(email) {
        try {
            const { data, error } = await _supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error resetting password:', error);
            return { data: null, error };
        }
    }
};

// Export for use in other files
window.supabaseAuth = auth; 