// Utilities Loader - Non-module version for backward compatibility
// This loads utility modules and exposes them globally

(async function() {
    try {
        // Dynamically import ES modules
        const timeUtils = await import('../utils/time.js');
        const oddsUtils = await import('../utils/odds.js');
        const storageUtils = await import('../utils/storage.js');
        const authUtils = await import('../utils/auth.js');
        const modalUtils = await import('../utils/modal.js');

        // Expose to window for backward compatibility
        window.timeUtils = timeUtils;
        window.oddsUtils = oddsUtils;
        window.storageUtils = storageUtils;
        window.authUtils = authUtils;
        window.modalUtils = modalUtils;

        // Expose individual functions
        window.getTimeAgo = timeUtils.getTimeAgo;
        window.formatDate = timeUtils.formatDate;
        window.getTimeLeft = timeUtils.getTimeLeft;

        window.formatDecimalOdds = oddsUtils.formatDecimalOdds;
        window.calculateProfit = oddsUtils.calculateProfit;
        window.calculatePayout = oddsUtils.calculatePayout;

        window.getLocal = storageUtils.getLocal;
        window.setLocal = storageUtils.setLocal;
        window.removeLocal = storageUtils.removeLocal;

        console.log('✓ Utilities loaded globally');
    } catch (error) {
        console.error('Error loading utilities:', error);
    }
})();
