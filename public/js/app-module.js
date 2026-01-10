// Main Application Controller - ES Module Version
// Imports utility functions to eliminate code duplication

import { getTimeAgo, formatDate, getTimeLeft } from '../../src/utils/time.js';
import { formatDecimalOdds, calculateProfit, calculatePayout, formatCurrency } from '../../src/utils/odds.js';
import { getLocal, setLocal, removeLocal } from '../../src/utils/storage.js';

// Main Application Controller
class GoatMouth {
    constructor() {
        this.api = null;
        this.currentUser = null;
        this.currentView = 'markets'; // Always default to markets on page load
        this.currentCategory = 'all';
        this.isMobile = this.detectMobile();
        this.mobileMenuOpen = false;
        this.mobileSearch = null;
        this.bannerCarousel = null;
        this.marketOffset = 0; // For pagination
        this.marketsPerPage = 25; // 5x5 grid
        this.viewMode = getLocal('marketViewMode', 'grid'); // Use storage util instead of localStorage
        this.bookmarksCache = []; // Cache bookmarked market IDs
        this.init();
    }

    toggleViewMode() {
        this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
        setLocal('marketViewMode', this.viewMode); // Use storage util
        this.renderMarkets(document.getElementById('app'));
    }

    detectMobile() {
        return window.innerWidth <= 768;
    }

    toggleMobileMenu() {
        this.mobileMenuOpen = !this.mobileMenuOpen;
        const overlay = document.querySelector('.mobile-menu-overlay');
        const menu = document.querySelector('.mobile-menu');

        if (this.mobileMenuOpen) {
            overlay?.classList.add('active');
            menu?.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            overlay?.classList.remove('active');
            menu?.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    async init() {
        // Wait for Supabase client to be ready
        if (!window.supabaseClient) {
            console.error('Supabase client not initialized');
            return;
        }

        this.api = new GoatMouthAPI(window.supabaseClient);

        // Initialize mobile search
        this.mobileSearch = new MobileSearch(this);

        // Render header IMMEDIATELY (before auth check) for instant display
        this.renderNav();
        this.attachEventListeners();

        // Handle email verification callback from URL
        await this.handleAuthCallback();

        // Check auth state
        await this.checkAuth();

        // Set up auth listener
        window.supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                this.onSignIn(session.user);
            } else if (event === 'SIGNED_OUT') {
                this.onSignOut();
            }
        });

        // Check for hash navigation
        const hash = window.location.hash.substring(1);
        if (hash && ['portfolio', 'markets', 'voting', 'leaderboard', 'activity', 'earn'].includes(hash)) {
            this.currentView = hash;

            setTimeout(() => {
                document.querySelectorAll('.nav-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                const activeBtn = document.querySelector(`.nav-btn[data-nav="${hash}"]`);
                if (activeBtn) {
                    activeBtn.classList.add('active');
                }
            }, 100);
        }

        // Respond to hash navigation
        window.addEventListener('hashchange', () => {
            const newHash = window.location.hash.substring(1);
            if (['portfolio', 'markets', 'voting', 'leaderboard', 'activity', 'earn'].includes(newHash)) {
                this.currentView = newHash;
                this.render();
            }
        });

        // Check for auth mode in URL params
        const authParams = new URLSearchParams(window.location.search);
        const authMode = authParams.get('auth');
        if (authMode && !this.currentUser && (authMode === 'login' || authMode === 'signup')) {
            setTimeout(() => {
                this.showAuthModal(authMode);
            }, 100);
        }

        // Show markets by default
        this.render();

        // Load banners
        if (typeof BannerCarousel !== 'undefined') {
            this.bannerCarousel = new BannerCarousel();
            await this.bannerCarousel.loadBanners();
            const bannerContainer = document.getElementById('banner-container');
            if (bannerContainer) {
                this.bannerCarousel.render(bannerContainer);
            }
        }

        // Check if redirected from voting page to show bookmarks
        if (getLocal('showBookmarksOnLoad') === 'true') {
            removeLocal('showBookmarksOnLoad');
            setTimeout(() => {
                this.showBookmarksModal();
            }, 500);
        }
    }

    // Note: Rest of the methods would continue here
    // This is just showing the pattern for the first ~150 lines
    // The full conversion would continue with all remaining methods
}

// Export for ES module usage
export default GoatMouth;

// Also expose globally for backward compatibility during transition
if (typeof window !== 'undefined') {
    window.GoatMouth = GoatMouth;
}
