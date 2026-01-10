// XSS Protection Helper using DOMPurify
// This module provides safe HTML sanitization to prevent XSS attacks

// Import DOMPurify from CDN (loaded in HTML)
// Usage: Include DOMPurify before this script

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param {string} dirty - Unsanitized HTML string
 * @param {object} config - Optional DOMPurify configuration
 * @returns {string} - Sanitized HTML safe for innerHTML
 */
function sanitizeHTML(dirty, config = {}) {
    if (!dirty || typeof dirty !== 'string') return '';

    // Check if DOMPurify is loaded
    if (typeof DOMPurify === 'undefined') {
        console.error('DOMPurify not loaded! Falling back to text-only output.');
        return escapeHtml(dirty);
    }

    const defaultConfig = {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'span', 'div'],
        ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
        ALLOW_DATA_ATTR: false,
        ...config
    };

    return DOMPurify.sanitize(dirty, defaultConfig);
}

/**
 * Safely sets innerHTML with sanitized content
 * @param {HTMLElement} element - Target DOM element
 * @param {string} html - HTML content to sanitize and insert
 * @param {object} config - Optional DOMPurify configuration
 */
function safeSetInnerHTML(element, html, config = {}) {
    if (!element) return;
    element.innerHTML = sanitizeHTML(html, config);
}

/**
 * Escapes HTML special characters for plain text output
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text safe for innerHTML
 */
function escapeHtml(text) {
    if (!text || typeof text !== 'string') return '';

    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Sanitizes user-generated content for display in markets
 * @param {string} content - Raw user content
 * @returns {string} - Sanitized content
 */
function sanitizeUserContent(content) {
    return sanitizeHTML(content, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: []
    });
}

/**
 * Sanitizes market descriptions (allows more formatting)
 * @param {string} description - Market description
 * @returns {string} - Sanitized description
 */
function sanitizeMarketDescription(description) {
    return sanitizeHTML(description, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h3', 'h4', 'blockquote'],
        ALLOWED_ATTR: ['href', 'title', 'target', 'rel']
    });
}

// Export functions to window for global access
if (typeof window !== 'undefined') {
    window.sanitizeHTML = sanitizeHTML;
    window.safeSetInnerHTML = safeSetInnerHTML;
    window.escapeHtml = escapeHtml;
    window.sanitizeUserContent = sanitizeUserContent;
    window.sanitizeMarketDescription = sanitizeMarketDescription;
}
