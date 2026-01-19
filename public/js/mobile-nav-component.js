// Mobile Navigation Component
// Renders mobile bottom navigation bar across all pages

function openMobileSearch() {
    if (window.app && window.app.mobileSearch) {
        window.app.mobileSearch.show();
        return;
    }

    if (window._standaloneMobileSearch) {
        window._standaloneMobileSearch.show();
        return;
    }

    if (window.MobileSearch && window.supabaseClient) {
        const api = window.GoatMouthAPI ? new window.GoatMouthAPI(window.supabaseClient) : { db: window.supabaseClient };
        const fallbackApp = {
            api,
            filterByCategory: (category) => {
                window.location.href = `index.html#${encodeURIComponent(category)}`;
            },
            showMarketDetail: (marketId) => {
                window.location.href = `market.html?id=${encodeURIComponent(marketId)}`;
            }
        };

        window._standaloneMobileSearch = new MobileSearch(fallbackApp);
        window._standaloneMobileSearch.show();
        return;
    }

    console.warn('[MobileNav] Mobile search unavailable on this page.');
}

window.openMobileSearch = openMobileSearch;

function renderMobileNav(options = {}) {
    const {
        currentPage = 'markets',
        isAdmin = false,
        isAuth = false,
        balance = 0
    } = options;

    // Admin navigation (different actions, no duplication with top nav)
    if (isAdmin) {
        return `
            <nav class="mobile-bottom-nav">
                <div class="mobile-bottom-nav-container">
                    <a href="index.html" class="mobile-nav-item ${currentPage === 'markets' ? 'active' : ''}">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                        </svg>
                        <span>Markets</span>
                    </a>
                    <a href="admin.html" class="mobile-nav-item ${currentPage === 'admin' ? 'active' : ''}">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        <span>Admin</span>
                    </a>
                    <button class="mobile-nav-item" onclick="openMobileSearch()">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                        <span>Search</span>
                    </button>
                    ${isAuth ? `
                        <a href="deposit.html" class="mobile-nav-item ${currentPage === 'deposit' ? 'active' : ''}" id="mobileNavWalletAdmin">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                            </svg>
                            <span class="mobile-wallet-text">
                                <svg class="mobile-balance-spinner${balance > 0 ? ' hidden' : ''}" viewBox="0 0 24 24" width="12" height="12">
                                    <circle class="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none"/>
                                </svg>
                                <span class="mobile-balance-text">${balance > 0 ? 'J$' + balance.toFixed(2) : ''}</span>
                            </span>
                        </a>
                    ` : `
                        <button class="mobile-nav-item" onclick="showAuthModal('login')">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                            </svg>
                            <span class="mobile-wallet-text">
                                <span class="mobile-balance-text">Wallet</span>
                            </span>
                        </button>
                    `}
                </div>
            </nav>
        `;
    }

    // Regular user navigation
    return `
        <nav class="mobile-bottom-nav">
            <div class="mobile-bottom-nav-container">
                <a href="index.html" class="mobile-nav-item ${currentPage === 'markets' ? 'active' : ''}">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                    <span>Home</span>
                </a>
                <a href="voting.html" class="mobile-nav-item ${currentPage === 'voting' ? 'active' : ''}">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>Voting</span>
                </a>
                <button class="mobile-nav-item" onclick="openMobileSearch()">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <span>Search</span>
                </button>
                ${isAuth ? `
                    <a href="deposit.html" class="mobile-nav-item ${currentPage === 'deposit' ? 'active' : ''}" id="mobileNavWallet">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        <span class="mobile-wallet-text">
                            <svg class="mobile-balance-spinner${balance > 0 ? ' hidden' : ''}" viewBox="0 0 24 24" width="12" height="12">
                                <circle class="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none"/>
                            </svg>
                            <span class="mobile-balance-text">${balance > 0 ? 'J$' + balance.toFixed(2) : ''}</span>
                        </span>
                    </a>
                ` : `
                    <button class="mobile-nav-item" onclick="showAuthModal('login')">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        <span class="mobile-wallet-text">
                            <span class="mobile-balance-text">Wallet</span>
                        </span>
                    </button>
                `}
            </div>
        </nav>
    `;
}

// Function to update mobile nav balance
function updateMobileNavBalance(balance) {
    // Don't update if trying to set to 0 when we already have a stored non-zero balance
    if ((balance === 0 || balance === undefined || balance === null) &&
        window._mobileNavBalance &&
        window._mobileNavBalance > 0) {
        console.log('[MobileNav] Ignoring attempt to set balance to 0, keeping:', window._mobileNavBalance);
        return;
    }

    console.log('[MobileNav] Updating balance to:', balance);

    const mobileNavWallet = document.getElementById('mobileNavWallet');
    const mobileNavWalletAdmin = document.getElementById('mobileNavWalletAdmin');
    const mobileWalletBalance = document.getElementById('mobileWalletBalance');

    const balanceText = `J$${(balance || 0).toFixed(2)}`;

    // Update regular user mobile nav
    if (mobileNavWallet) {
        const spinner = mobileNavWallet.querySelector('.mobile-balance-spinner');
        const balanceTextEl = mobileNavWallet.querySelector('.mobile-balance-text');

        if (balance > 0) {
            if (spinner) spinner.classList.add('hidden');
            if (balanceTextEl) {
                balanceTextEl.textContent = balanceText;
                balanceTextEl.style.display = 'inline';
            }
        } else {
            if (spinner) spinner.classList.remove('hidden');
            if (balanceTextEl) balanceTextEl.style.display = 'none';
        }
    }

    // Update admin mobile nav
    if (mobileNavWalletAdmin) {
        const spinner = mobileNavWalletAdmin.querySelector('.mobile-balance-spinner');
        const balanceTextEl = mobileNavWalletAdmin.querySelector('.mobile-balance-text');

        if (balance > 0) {
            if (spinner) spinner.classList.add('hidden');
            if (balanceTextEl) {
                balanceTextEl.textContent = balanceText;
                balanceTextEl.style.display = 'inline';
            }
        } else {
            if (spinner) spinner.classList.remove('hidden');
            if (balanceTextEl) balanceTextEl.style.display = 'none';
        }
    }

    // Also update app.js mobile nav balance
    const mobileNavWalletApp = document.getElementById('mobileNavWalletApp');
    if (mobileNavWalletApp) {
        const spinner = mobileNavWalletApp.querySelector('.mobile-balance-spinner');
        const balanceTextEl = mobileNavWalletApp.querySelector('.mobile-balance-text');

        if (balance > 0) {
            if (spinner) spinner.classList.add('hidden');
            if (balanceTextEl) {
                balanceTextEl.textContent = balanceText;
                balanceTextEl.style.display = 'inline';
            }
        } else {
            if (spinner) spinner.classList.remove('hidden');
            if (balanceTextEl) balanceTextEl.style.display = 'none';
        }
    } else if (mobileWalletBalance) {
        // Fallback for old version
        mobileWalletBalance.textContent = balanceText;
    }

    // Update stored balance
    if (balance !== undefined && balance !== null) {
        window._mobileNavBalance = balance;
    }
}

// Make it globally available
window.updateMobileNavBalance = updateMobileNavBalance;

// Auto-inject mobile nav on page load (mobile only)
document.addEventListener('DOMContentLoaded', async function() {
    const mobileNavContainer = document.getElementById('mobile-nav-container');

    if (mobileNavContainer) {
        // Detect if mobile
        const isMobile = window.innerWidth <= 768;

        if (!isMobile) {
            mobileNavContainer.style.display = 'none';
            return;
        }

        // Get page name from data attribute or URL
        const currentPage = mobileNavContainer.dataset.page || 'markets';

        // Check if user is authenticated
        let isAuth = false;
        let isAdmin = false;
        let balance = 0;

        if (typeof window.supabaseClient !== 'undefined') {
            try {
                if (typeof setAuthPending === 'function') {
                    setAuthPending(true);
                }
                if (typeof resolveAuthState === 'function') {
                    await resolveAuthState();
                }

                const state = typeof getAuthState === 'function' ? getAuthState() : null;
                if (state?.user) {
                    isAuth = true;
                    isAdmin = state.profile?.role === 'admin';
                    balance = state.profile?.balance || 0;
                }
            } catch (error) {
                console.log('Auth check error:', error);
            }
        }

        // Render mobile nav
        mobileNavContainer.innerHTML = renderMobileNav({
            currentPage,
            isAdmin,
            isAuth,
            balance
        });

        console.log('[MobileNav] Rendered with balance:', balance);

        // Trigger a custom event to notify that mobile nav is ready
        window.dispatchEvent(new CustomEvent('mobileNavReady', { detail: { balance } }));

        // Store the balance globally so other scripts don't overwrite with 0
        window._mobileNavBalance = balance;
    }
});
