/**
 * Utilities Module - Barrel Exports
 * Centralized export point for all utility modules
 *
 * Usage:
 * import { getTimeAgo, formatDecimalOdds, checkAuth } from './utils';
 * OR
 * import * as utils from './utils';
 */

// Time utilities
export {
    getTimeAgo,
    formatDate,
    formatDateTime,
    getTimeLeft,
    isPast,
    isFuture,
    smartTimestamp
} from './time.js';

// Odds utilities
export {
    formatDecimalOdds,
    probabilityToOdds,
    oddsToProbability,
    formatOddsFromProbability,
    formatProbability,
    calculateProfit,
    calculatePayout,
    formatCurrency,
    calculatePercentages
} from './odds.js';

// Authentication utilities
export {
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
    getSession as getAuthSession
} from './auth.js';

// Modal utilities
export {
    createModalOverlay,
    createModalContainer,
    addModalCloseButton,
    openModal,
    closeModal,
    closeModalById,
    toggleModal,
    addOverlayClickClose,
    addEscapeKeyClose,
    createAlertModal,
    createConfirmModal,
    showAlert,
    showConfirm,
    openUpdatesModal,
    closeUpdatesModal
} from './modal.js';

// Storage utilities
export {
    getLocal,
    setLocal,
    removeLocal,
    clearLocal,
    getLocalKeys,
    getSession,
    setSession,
    removeSession,
    clearSession,
    getSessionKeys,
    clearAllStorage,
    getWithExpiration,
    setWithExpiration,
    StorageKeys
} from './storage.js';

// Default exports from each module
import timeUtils from './time.js';
import oddsUtils from './odds.js';
import authUtils from './auth.js';
import modalUtils from './modal.js';
import storageUtils from './storage.js';

export default {
    time: timeUtils,
    odds: oddsUtils,
    auth: authUtils,
    modal: modalUtils,
    storage: storageUtils
};
