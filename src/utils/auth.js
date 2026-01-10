/**
 * Authentication Utilities Module
 * Consolidates all authentication and authorization functions
 * Used across: app.js, admin.js, market-detail.js, voting.js, profile.js
 */

/**
 * Check if user is authenticated
 * @returns {Promise<Object|null>} User object if authenticated, null otherwise
 */
export async function checkAuth() {
    try {
        if (!window.supabaseClient) {
            console.error('Supabase client not initialized');
            return null;
        }

        const { data: { user }, error } = await window.supabaseClient.auth.getUser();

        if (error) {
            console.error('Auth check error:', error);
            return null;
        }

        return user;
    } catch (error) {
        console.error('Auth check error:', error);
        return null;
    }
}

/**
 * Get user profile from database
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Profile object or null
 */
export async function getUserProfile(userId) {
    try {
        if (!window.supabaseClient) {
            console.error('Supabase client not initialized');
            return null;
        }

        const { data, error } = await window.supabaseClient
            .from('profiles')
            .select('id, username, email, role, balance, created_at, updated_at')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Profile fetch error:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Profile fetch error:', error);
        return null;
    }
}

/**
 * Get current authenticated user with profile
 * @returns {Promise<Object|null>} Object with { user, profile } or null
 */
export async function getCurrentUserWithProfile() {
    const user = await checkAuth();

    if (!user) {
        return null;
    }

    const profile = await getUserProfile(user.id);

    if (!profile) {
        console.error('Profile not found for user');
        return null;
    }

    return { user, profile };
}

/**
 * Require authentication - redirect to login if not authenticated
 * @param {string} redirectPath - Path to redirect to after login (optional)
 * @returns {Promise<Object|null>} Auth object with user and profile, or null if redirected
 */
export async function requireAuth(redirectPath = null) {
    const user = await checkAuth();

    if (!user) {
        redirectToLogin(redirectPath);
        return null;
    }

    const profile = await getUserProfile(user.id);

    if (!profile) {
        console.error('Profile not found for user');
        redirectToLogin(redirectPath);
        return null;
    }

    return { user, profile };
}

/**
 * Require admin role - redirect if not admin
 * @returns {Promise<Object|null>} Auth object with user and profile, or null if redirected
 */
export async function requireAdmin() {
    const auth = await requireAuth();

    if (!auth) return null;

    if (auth.profile.role !== 'admin') {
        alert('Access denied. Admin privileges required.');
        redirectToApp();
        return null;
    }

    return auth;
}

/**
 * Check if current user has admin role
 * @returns {Promise<boolean>} True if user is admin
 */
export async function isAdmin() {
    const auth = await getCurrentUserWithProfile();
    if (!auth) return false;
    return auth.profile.role === 'admin';
}

/**
 * Check if current user has specific role
 * @param {string} role - Role to check (e.g., 'admin', 'moderator')
 * @returns {Promise<boolean>} True if user has the role
 */
export async function hasRole(role) {
    const auth = await getCurrentUserWithProfile();
    if (!auth) return false;
    return auth.profile.role === role;
}

/**
 * Sign out the current user
 * @returns {Promise<boolean>} True if sign out was successful
 */
export async function signOut() {
    try {
        if (!window.supabaseClient) {
            console.error('Supabase client not initialized');
            return false;
        }

        const { error } = await window.supabaseClient.auth.signOut();

        if (error) {
            console.error('Sign out error:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Sign out error:', error);
        return false;
    }
}

/**
 * Sign in with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object|null>} Auth object with user and profile, or null if failed
 */
export async function signIn(email, password) {
    try {
        if (!window.supabaseClient) {
            console.error('Supabase client not initialized');
            return null;
        }

        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('Sign in error:', error);
            return null;
        }

        const profile = await getUserProfile(data.user.id);

        return { user: data.user, profile };
    } catch (error) {
        console.error('Sign in error:', error);
        return null;
    }
}

/**
 * Sign up with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {Object} metadata - Additional user metadata (optional)
 * @returns {Promise<Object|null>} Auth object with user, or null if failed
 */
export async function signUp(email, password, metadata = {}) {
    try {
        if (!window.supabaseClient) {
            console.error('Supabase client not initialized');
            return null;
        }

        const { data, error } = await window.supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: metadata
            }
        });

        if (error) {
            console.error('Sign up error:', error);
            return null;
        }

        return { user: data.user };
    } catch (error) {
        console.error('Sign up error:', error);
        return null;
    }
}

/**
 * Redirect to login page
 * @param {string} returnPath - Path to return to after login (optional)
 */
export function redirectToLogin(returnPath = null) {
    if (window.location.pathname !== '/login.html') {
        const returnUrl = returnPath || window.location.pathname + window.location.search + window.location.hash;
        window.location.href = `/login.html?return=${encodeURIComponent(returnUrl)}`;
    }
}

/**
 * Redirect to main app
 */
export function redirectToApp() {
    window.location.href = '/index.html';
}

/**
 * Redirect to admin panel
 */
export function redirectToAdmin() {
    window.location.href = '/admin.html';
}

/**
 * Redirect to profile page
 */
export function redirectToProfile() {
    window.location.href = '/profile.html';
}

/**
 * Redirect based on user role
 * @param {Object} profile - User profile object
 */
export function redirectByRole(profile) {
    if (!profile) {
        redirectToLogin();
        return;
    }

    if (profile.role === 'admin') {
        redirectToAdmin();
    } else {
        redirectToApp();
    }
}

/**
 * Listen to auth state changes
 * @param {Function} callback - Callback function(event, session)
 * @returns {Object} Subscription object with unsubscribe method
 */
export function onAuthStateChange(callback) {
    if (!window.supabaseClient) {
        console.error('Supabase client not initialized');
        return { data: { subscription: { unsubscribe: () => {} } } };
    }

    return window.supabaseClient.auth.onAuthStateChange(callback);
}

/**
 * Get session data
 * @returns {Promise<Object|null>} Session object or null
 */
export async function getSession() {
    try {
        if (!window.supabaseClient) {
            console.error('Supabase client not initialized');
            return null;
        }

        const { data: { session }, error } = await window.supabaseClient.auth.getSession();

        if (error) {
            console.error('Get session error:', error);
            return null;
        }

        return session;
    } catch (error) {
        console.error('Get session error:', error);
        return null;
    }
}

// Default export with all functions
export default {
    checkAuth,
    getUserProfile,
    getCurrentUserWithProfile,
    requireAuth,
    requireAdmin,
    isAdmin,
    hasRole,
    signOut,
    signIn,
    signUp,
    redirectToLogin,
    redirectToApp,
    redirectToAdmin,
    redirectToProfile,
    redirectByRole,
    onAuthStateChange,
    getSession
};
