/**
 * Time Utilities Module
 * Consolidates all time formatting and manipulation functions
 * Used across: market-page.js, market-detail.js, admin.js, voting.js, app.js
 */

/**
 * Convert a timestamp to relative time (e.g., "2h ago", "5d ago")
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} - Formatted relative time
 */
export function getTimeAgo(dateString) {
    if (!dateString) return 'Unknown';

    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;

        // Handle invalid dates
        if (isNaN(diffMs)) return 'Invalid date';

        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        const diffWeek = Math.floor(diffDay / 7);
        const diffMonth = Math.floor(diffDay / 30);
        const diffYear = Math.floor(diffDay / 365);

        if (diffYear > 0) return `${diffYear}y ago`;
        if (diffMonth > 0) return `${diffMonth}mo ago`;
        if (diffWeek > 0) return `${diffWeek}w ago`;
        if (diffDay > 0) return `${diffDay}d ago`;
        if (diffHour > 0) return `${diffHour}h ago`;
        if (diffMin > 0) return `${diffMin}m ago`;
        if (diffSec > 10) return `${diffSec}s ago`;
        return 'Just now';
    } catch (error) {
        console.error('Error parsing date in getTimeAgo:', error);
        return 'Unknown';
    }
}

/**
 * Format a date to a readable string (e.g., "Jan 15, 2026")
 * @param {string|Date} dateString - Date string or Date object
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date
 */
export function formatDate(dateString, options = {}) {
    if (!dateString) return 'Unknown';

    try {
        const date = new Date(dateString);

        // Handle invalid dates
        if (isNaN(date.getTime())) return 'Invalid date';

        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            ...options
        };

        return date.toLocaleDateString('en-US', defaultOptions);
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Unknown';
    }
}

/**
 * Format a date with time (e.g., "Jan 15, 2026 at 3:45 PM")
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} - Formatted date and time
 */
export function formatDateTime(dateString) {
    if (!dateString) return 'Unknown';

    try {
        const date = new Date(dateString);

        // Handle invalid dates
        if (isNaN(date.getTime())) return 'Invalid date';

        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch (error) {
        console.error('Error formatting date time:', error);
        return 'Unknown';
    }
}

/**
 * Get time remaining until a future date (e.g., "2d 5h left", "Expired")
 * @param {string|Date} endDate - End date string or Date object
 * @returns {string} - Formatted time remaining
 */
export function getTimeLeft(endDate) {
    if (!endDate) return 'No end date';

    try {
        const end = new Date(endDate);
        const now = new Date();
        const diffMs = end - now;

        // Handle invalid dates
        if (isNaN(diffMs)) return 'Invalid date';

        // Already expired
        if (diffMs < 0) return 'Expired';

        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffDay > 7) {
            const weeks = Math.floor(diffDay / 7);
            return `${weeks}w ${diffDay % 7}d left`;
        }
        if (diffDay > 0) {
            return `${diffDay}d ${diffHour % 24}h left`;
        }
        if (diffHour > 0) {
            return `${diffHour}h ${diffMin % 60}m left`;
        }
        if (diffMin > 0) {
            return `${diffMin}m left`;
        }
        if (diffSec > 0) {
            return `${diffSec}s left`;
        }
        return 'Ending soon';
    } catch (error) {
        console.error('Error calculating time left:', error);
        return 'Unknown';
    }
}

/**
 * Check if a date is in the past
 * @param {string|Date} dateString - Date string or Date object
 * @returns {boolean} - True if date is in the past
 */
export function isPast(dateString) {
    if (!dateString) return false;

    try {
        const date = new Date(dateString);
        const now = new Date();
        return date < now;
    } catch (error) {
        console.error('Error checking if past:', error);
        return false;
    }
}

/**
 * Check if a date is in the future
 * @param {string|Date} dateString - Date string or Date object
 * @returns {boolean} - True if date is in the future
 */
export function isFuture(dateString) {
    if (!dateString) return false;

    try {
        const date = new Date(dateString);
        const now = new Date();
        return date > now;
    } catch (error) {
        console.error('Error checking if future:', error);
        return false;
    }
}

/**
 * Format timestamp for display (e.g., "2 hours ago" or "Jan 15" depending on age)
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} - Smart formatted timestamp
 */
export function smartTimestamp(dateString) {
    if (!dateString) return 'Unknown';

    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        // If less than 24 hours old, show relative time
        if (diffHours < 24) {
            return getTimeAgo(dateString);
        }

        // Otherwise show formatted date
        return formatDate(dateString);
    } catch (error) {
        console.error('Error in smart timestamp:', error);
        return 'Unknown';
    }
}

// Default export with all functions
export default {
    getTimeAgo,
    formatDate,
    formatDateTime,
    getTimeLeft,
    isPast,
    isFuture,
    smartTimestamp
};
