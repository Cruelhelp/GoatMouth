/**
 * Storage Utilities Module
 * Safe localStorage and sessionStorage wrappers with error handling
 * Used across: app.js, admin.js, shared-components.js, mobile-search.js
 */

/**
 * Check if storage is available
 * @param {string} type - 'localStorage' or 'sessionStorage'
 * @returns {boolean} True if storage is available
 */
function isStorageAvailable(type) {
    try {
        const storage = window[type];
        const testKey = '__storage_test__';
        storage.setItem(testKey, 'test');
        storage.removeItem(testKey);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Get item from localStorage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist or error occurs
 * @returns {*} Stored value or default value
 */
export function getLocal(key, defaultValue = null) {
    try {
        if (!isStorageAvailable('localStorage')) {
            console.warn('localStorage is not available');
            return defaultValue;
        }

        const item = localStorage.getItem(key);

        if (item === null) {
            return defaultValue;
        }

        // Try to parse as JSON
        try {
            return JSON.parse(item);
        } catch {
            // Return as string if not JSON
            return item;
        }
    } catch (error) {
        console.error(`Error getting localStorage item "${key}":`, error);
        return defaultValue;
    }
}

/**
 * Set item in localStorage
 * @param {string} key - Storage key
 * @param {*} value - Value to store (will be JSON stringified if object)
 * @returns {boolean} True if successful
 */
export function setLocal(key, value) {
    try {
        if (!isStorageAvailable('localStorage')) {
            console.warn('localStorage is not available');
            return false;
        }

        const stringValue = typeof value === 'string'
            ? value
            : JSON.stringify(value);

        localStorage.setItem(key, stringValue);
        return true;
    } catch (error) {
        console.error(`Error setting localStorage item "${key}":`, error);
        return false;
    }
}

/**
 * Remove item from localStorage
 * @param {string} key - Storage key
 * @returns {boolean} True if successful
 */
export function removeLocal(key) {
    try {
        if (!isStorageAvailable('localStorage')) {
            console.warn('localStorage is not available');
            return false;
        }

        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error(`Error removing localStorage item "${key}":`, error);
        return false;
    }
}

/**
 * Clear all localStorage items
 * @returns {boolean} True if successful
 */
export function clearLocal() {
    try {
        if (!isStorageAvailable('localStorage')) {
            console.warn('localStorage is not available');
            return false;
        }

        localStorage.clear();
        return true;
    } catch (error) {
        console.error('Error clearing localStorage:', error);
        return false;
    }
}

/**
 * Get all localStorage keys
 * @returns {string[]} Array of keys
 */
export function getLocalKeys() {
    try {
        if (!isStorageAvailable('localStorage')) {
            console.warn('localStorage is not available');
            return [];
        }

        return Object.keys(localStorage);
    } catch (error) {
        console.error('Error getting localStorage keys:', error);
        return [];
    }
}

/**
 * Get item from sessionStorage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist or error occurs
 * @returns {*} Stored value or default value
 */
export function getSession(key, defaultValue = null) {
    try {
        if (!isStorageAvailable('sessionStorage')) {
            console.warn('sessionStorage is not available');
            return defaultValue;
        }

        const item = sessionStorage.getItem(key);

        if (item === null) {
            return defaultValue;
        }

        // Try to parse as JSON
        try {
            return JSON.parse(item);
        } catch {
            // Return as string if not JSON
            return item;
        }
    } catch (error) {
        console.error(`Error getting sessionStorage item "${key}":`, error);
        return defaultValue;
    }
}

/**
 * Set item in sessionStorage
 * @param {string} key - Storage key
 * @param {*} value - Value to store (will be JSON stringified if object)
 * @returns {boolean} True if successful
 */
export function setSession(key, value) {
    try {
        if (!isStorageAvailable('sessionStorage')) {
            console.warn('sessionStorage is not available');
            return false;
        }

        const stringValue = typeof value === 'string'
            ? value
            : JSON.stringify(value);

        sessionStorage.setItem(key, stringValue);
        return true;
    } catch (error) {
        console.error(`Error setting sessionStorage item "${key}":`, error);
        return false;
    }
}

/**
 * Remove item from sessionStorage
 * @param {string} key - Storage key
 * @returns {boolean} True if successful
 */
export function removeSession(key) {
    try {
        if (!isStorageAvailable('sessionStorage')) {
            console.warn('sessionStorage is not available');
            return false;
        }

        sessionStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error(`Error removing sessionStorage item "${key}":`, error);
        return false;
    }
}

/**
 * Clear all sessionStorage items
 * @returns {boolean} True if successful
 */
export function clearSession() {
    try {
        if (!isStorageAvailable('sessionStorage')) {
            console.warn('sessionStorage is not available');
            return false;
        }

        sessionStorage.clear();
        return true;
    } catch (error) {
        console.error('Error clearing sessionStorage:', error);
        return false;
    }
}

/**
 * Get all sessionStorage keys
 * @returns {string[]} Array of keys
 */
export function getSessionKeys() {
    try {
        if (!isStorageAvailable('sessionStorage')) {
            console.warn('sessionStorage is not available');
            return [];
        }

        return Object.keys(sessionStorage);
    } catch (error) {
        console.error('Error getting sessionStorage keys:', error);
        return [];
    }
}

/**
 * Clear all storage (both localStorage and sessionStorage)
 * @returns {boolean} True if successful
 */
export function clearAllStorage() {
    const localCleared = clearLocal();
    const sessionCleared = clearSession();
    return localCleared && sessionCleared;
}

/**
 * Get item with expiration support
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist or expired
 * @param {boolean} useSession - Use sessionStorage instead of localStorage (default: false)
 * @returns {*} Stored value or default value
 */
export function getWithExpiration(key, defaultValue = null, useSession = false) {
    try {
        const getter = useSession ? getSession : getLocal;
        const remover = useSession ? removeSession : removeLocal;

        const item = getter(key);

        if (!item) {
            return defaultValue;
        }

        // Check if item has expiration
        if (typeof item === 'object' && item.__expires) {
            const now = Date.now();
            if (now > item.__expires) {
                // Expired - remove and return default
                remover(key);
                return defaultValue;
            }
            // Return value without expiration metadata
            return item.value;
        }

        return item;
    } catch (error) {
        console.error(`Error getting item with expiration "${key}":`, error);
        return defaultValue;
    }
}

/**
 * Set item with expiration support
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @param {number} ttl - Time to live in milliseconds
 * @param {boolean} useSession - Use sessionStorage instead of localStorage (default: false)
 * @returns {boolean} True if successful
 */
export function setWithExpiration(key, value, ttl, useSession = false) {
    try {
        const setter = useSession ? setSession : setLocal;

        const expirationData = {
            value: value,
            __expires: Date.now() + ttl
        };

        return setter(key, expirationData);
    } catch (error) {
        console.error(`Error setting item with expiration "${key}":`, error);
        return false;
    }
}

// Commonly used storage keys (for reference and type safety)
export const StorageKeys = {
    MARKET_VIEW_MODE: 'marketViewMode',
    BANNER_CLOSED: 'bannerClosed',
    ML_CONFIG: 'ml_config',
    OAUTH_APP: 'oauth_app',
    OAUTH_REDIRECT: 'oauth_redirect',
    RECENT_SEARCHES: 'goatmouth_recent_searches',
    SHOW_BOOKMARKS_ON_LOAD: 'showBookmarksOnLoad',
    ODDS_API_HEALTH_CHECKED: 'oddsApiHealthChecked',
    BANNER_UPDATE_TRIGGER: 'bannerUpdateTrigger'
};

// Default export with all functions
export default {
    // localStorage functions
    getLocal,
    setLocal,
    removeLocal,
    clearLocal,
    getLocalKeys,

    // sessionStorage functions
    getSession,
    setSession,
    removeSession,
    clearSession,
    getSessionKeys,

    // Combined functions
    clearAllStorage,

    // Expiration support
    getWithExpiration,
    setWithExpiration,

    // Constants
    StorageKeys
};
