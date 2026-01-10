/**
 * Odds Utilities Module
 * Consolidates all odds calculation and formatting functions
 * Used across: market-page.js, market-detail.js, app.js
 */

/**
 * Format decimal odds to display format (e.g., 1.85 or 1.8)
 * @param {number} odds - Decimal odds value
 * @param {number} decimals - Number of decimal places (default: auto)
 * @returns {string} - Formatted odds
 */
export function formatDecimalOdds(odds, decimals = null) {
    if (odds === null || odds === undefined || isNaN(odds)) {
        return '—';
    }

    const numOdds = parseFloat(odds);

    if (numOdds < 1) return '1.00';
    if (numOdds > 1000) return '999+';

    // Auto-detect decimal places if not specified
    if (decimals === null) {
        // Show 1 decimal if it's a round number (1.5, 2.0)
        // Show 2 decimals otherwise (1.85, 3.25)
        const hasDecimal = numOdds % 1 !== 0;
        decimals = hasDecimal ? 2 : 1;
    }

    return numOdds.toFixed(decimals);
}

/**
 * Convert probability (0-1 or 0-100) to decimal odds
 * @param {number} probability - Probability value (0-1 or 0-100)
 * @param {boolean} isPercentage - Whether probability is in percentage format (default: auto-detect)
 * @returns {number} - Decimal odds
 */
export function probabilityToOdds(probability, isPercentage = null) {
    if (probability === null || probability === undefined || isNaN(probability)) {
        return null;
    }

    let prob = parseFloat(probability);

    // Auto-detect percentage format if not specified
    if (isPercentage === null) {
        isPercentage = prob > 1;
    }

    // Convert percentage to decimal
    if (isPercentage) {
        prob = prob / 100;
    }

    // Handle edge cases
    if (prob <= 0) return 999;
    if (prob >= 1) return 1.01;

    // Calculate decimal odds: odds = 1 / probability
    return 1 / prob;
}

/**
 * Convert decimal odds to probability percentage
 * @param {number} odds - Decimal odds value
 * @returns {number} - Probability as percentage (0-100)
 */
export function oddsToProbability(odds) {
    if (odds === null || odds === undefined || isNaN(odds)) {
        return null;
    }

    const numOdds = parseFloat(odds);

    // Handle edge cases
    if (numOdds <= 1) return 100;
    if (numOdds >= 999) return 0.1;

    // Calculate probability: probability = 1 / odds
    return (1 / numOdds) * 100;
}

/**
 * Format odds from probability (convenience function)
 * @param {number} probability - Probability value (0-1 or 0-100)
 * @param {boolean} isPercentage - Whether probability is in percentage format
 * @returns {string} - Formatted decimal odds
 */
export function formatOddsFromProbability(probability, isPercentage = null) {
    const odds = probabilityToOdds(probability, isPercentage);
    return formatDecimalOdds(odds);
}

/**
 * Calculate implied probability from decimal odds and format as percentage
 * @param {number} odds - Decimal odds value
 * @returns {string} - Formatted percentage (e.g., "54.5%")
 */
export function formatProbability(odds) {
    const prob = oddsToProbability(odds);

    if (prob === null) return '—';

    return `${prob.toFixed(1)}%`;
}

/**
 * Calculate the potential profit from a bet
 * @param {number} stake - Amount wagered
 * @param {number} odds - Decimal odds
 * @returns {number} - Profit amount (not including stake)
 */
export function calculateProfit(stake, odds) {
    if (!stake || !odds || isNaN(stake) || isNaN(odds)) {
        return 0;
    }

    const numStake = parseFloat(stake);
    const numOdds = parseFloat(odds);

    if (numStake <= 0 || numOdds <= 1) return 0;

    // Profit = (stake * odds) - stake
    return (numStake * numOdds) - numStake;
}

/**
 * Calculate the total payout from a bet (stake + profit)
 * @param {number} stake - Amount wagered
 * @param {number} odds - Decimal odds
 * @returns {number} - Total payout amount
 */
export function calculatePayout(stake, odds) {
    if (!stake || !odds || isNaN(stake) || isNaN(odds)) {
        return 0;
    }

    const numStake = parseFloat(stake);
    const numOdds = parseFloat(odds);

    if (numStake <= 0 || numOdds <= 1) return 0;

    // Payout = stake * odds
    return numStake * numOdds;
}

/**
 * Format a currency value for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency symbol (default: '$')
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} - Formatted currency
 */
export function formatCurrency(amount, currency = '$', decimals = 2) {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return `${currency}0.00`;
    }

    const numAmount = parseFloat(amount);
    return `${currency}${numAmount.toFixed(decimals)}`;
}

/**
 * Calculate Yes/No percentages from prices
 * @param {number} yesPrice - Yes option price (0-1)
 * @param {number} noPrice - No option price (0-1)
 * @returns {object} - { yesPercent, noPercent }
 */
export function calculatePercentages(yesPrice, noPrice) {
    const yesPercent = Math.round((yesPrice || 0) * 100);
    const noPercent = Math.round((noPrice || 0) * 100);

    return { yesPercent, noPercent };
}

// Default export with all functions
export default {
    formatDecimalOdds,
    probabilityToOdds,
    oddsToProbability,
    formatOddsFromProbability,
    formatProbability,
    calculateProfit,
    calculatePayout,
    formatCurrency,
    calculatePercentages
};
