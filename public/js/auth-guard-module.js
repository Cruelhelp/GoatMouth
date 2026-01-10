// Authentication Guard Utility - ES Module Version
// This is now a thin wrapper around src/utils/auth.js

import {
    checkAuth,
    getUserProfile,
    requireAuth,
    requireAdmin,
    isAdmin,
    redirectToLogin,
    redirectToApp,
    redirectToAdmin,
    redirectByRole
} from '../../src/utils/auth.js';

// Re-export as AuthGuard class for backward compatibility
class AuthGuard {
    static async checkAuth() {
        return await checkAuth();
    }

    static async getProfile(userId) {
        return await getUserProfile(userId);
    }

    static async requireAuth() {
        return await requireAuth();
    }

    static async requireAdmin() {
        return await requireAdmin();
    }

    static async isAdmin() {
        return await isAdmin();
    }

    static redirectToLogin() {
        redirectToLogin();
    }

    static redirectToApp() {
        redirectToApp();
    }

    static redirectToAdmin() {
        redirectToAdmin();
    }

    static redirectByRole(profile) {
        redirectByRole(profile);
    }
}

// Export for ES modules
export default AuthGuard;

// Also expose globally for backward compatibility
if (typeof window !== 'undefined') {
    window.AuthGuard = AuthGuard;
}
