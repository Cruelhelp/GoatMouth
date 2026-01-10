// Authentication Guard Utility
// Shared authentication helpers for protecting routes and checking permissions

class AuthGuard {
    /**
     * Check if user is authenticated
     * @returns {Object|null} User object if authenticated, null otherwise
     */
    static async checkAuth() {
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            return user;
        } catch (error) {
            console.error('Auth check error:', error);
            return null;
        }
    }

    /**
     * Get user profile from database
     * @param {string} userId - User ID
     * @returns {Object|null} Profile object or null
     */
    static async getProfile(userId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('profiles')
                .select('id, username, email, role, balance, created_at, updated_at')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Profile fetch error:', error);
            return null;
        }
    }

    /**
     * Require authentication - redirect to login if not authenticated
     * @returns {Object|null} Auth object with user and profile, or null if redirected
     */
    static async requireAuth() {
        const user = await this.checkAuth();

        if (!user) {
            this.redirectToLogin();
            return null;
        }

        const profile = await this.getProfile(user.id);

        if (!profile) {
            console.error('Profile not found for user');
            this.redirectToLogin();
            return null;
        }

        return { user, profile };
    }

    /**
     * Require admin role - redirect if not admin
     * @returns {Object|null} Auth object with user and profile, or null if redirected
     */
    static async requireAdmin() {
        const auth = await this.requireAuth();

        if (!auth) return null;

        if (auth.profile.role !== 'admin') {
            alert('Access denied. Admin privileges required.');
            this.redirectToApp();
            return null;
        }

        return auth;
    }

    /**
     * Check if current user is admin
     * @returns {boolean} True if user is admin
     */
    static async isAdmin() {
        const auth = await this.requireAuth();
        if (!auth) return false;
        return auth.profile.role === 'admin';
    }

    /**
     * Redirect to login page
     */
    static redirectToLogin() {
        if (window.location.pathname !== '/login.html') {
            window.location.href = '/login.html';
        }
    }

    /**
     * Redirect to main app
     */
    static redirectToApp() {
        window.location.href = '/index.html';
    }

    /**
     * Redirect to admin panel
     */
    static redirectToAdmin() {
        window.location.href = '/admin.html';
    }

    /**
     * Redirect based on user role
     * @param {Object} profile - User profile object
     */
    static redirectByRole(profile) {
        if (profile.role === 'admin') {
            this.redirectToAdmin();
        } else {
            this.redirectToApp();
        }
    }
}

// Export to window
window.AuthGuard = AuthGuard;
