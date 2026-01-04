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
        this.viewMode = localStorage.getItem('marketViewMode') || 'grid'; // 'grid' or 'list'
        this.bookmarksCache = []; // Cache bookmarked market IDs
        this.init();
    }

    toggleViewMode() {
        this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
        localStorage.setItem('marketViewMode', this.viewMode);
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

        // Check for hash navigation (e.g., #portfolio, #voting, #activity)
        const hash = window.location.hash.substring(1);
        if (hash && ['portfolio', 'markets', 'voting', 'leaderboard', 'activity'].includes(hash)) {
            this.currentView = hash;

            // Update active state on navigation buttons
            setTimeout(() => {
                document.querySelectorAll('.nav-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                const activeBtn = document.querySelector(`.nav-btn[data-nav="${hash}"]`);
                if (activeBtn) {
                    activeBtn.classList.add('active');
                }
            }, 100);

            // Clear hash from URL for cleaner navigation
            window.history.replaceState(null, null, window.location.pathname);
        }

        // Full render (updates auth state in header and renders content)
        this.render();

        // Check if bookmarks modal should be shown (from other pages)
        if (sessionStorage.getItem('showBookmarksOnLoad') === 'true') {
            sessionStorage.removeItem('showBookmarksOnLoad');
            // Wait a bit for auth to be fully ready
            setTimeout(() => {
                this.showBookmarksModal();
            }, 500);
        }

        // Prevent back button cache issues
        this.setupPageVisibilityMonitoring();

        // Handle window resize for mobile responsiveness
        this.setupResponsiveListener();
    }

    setupPageVisibilityMonitoring() {
        // Only reload on pageshow if from cache (back/forward button)
        // Don't reload on simple tab switching
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                // Page was loaded from back/forward cache, reload it
                window.location.reload(true);
            }
        });
    }

    setupResponsiveListener() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            // Debounce resize events
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const wasMobile = this.isMobile;
                this.isMobile = this.detectMobile();

                // Re-render if mobile state changed
                if (wasMobile !== this.isMobile) {
                    this.render();
                }
            }, 250);
        });
    }

    async handleAuthCallback() {
        // Check if URL contains auth tokens (from email verification or OAuth)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        // Check query params for app identifier
        const urlParams = new URLSearchParams(window.location.search);
        const appParam = urlParams.get('app');

        // If we have an access token, this is an OAuth callback
        if (accessToken) {
            // Check if this OAuth was initiated from GoatMouth
            const oauthApp = localStorage.getItem('oauth_app');
            const oauthRedirect = localStorage.getItem('oauth_redirect');

            // If OAuth was initiated from GoatMouth but we're on a different site, redirect back
            if (oauthApp === 'goatmouth' && oauthRedirect && !window.location.origin.includes(oauthRedirect)) {
                localStorage.removeItem('oauth_app');
                localStorage.removeItem('oauth_redirect');
                window.location.href = `${oauthRedirect}/index.html`;
                return;
            }

            // Clean up OAuth markers
            localStorage.removeItem('oauth_app');
            localStorage.removeItem('oauth_redirect');

            if (type === 'signup') {
                // Email was verified! Clean up URL and show success message
                window.history.replaceState({}, document.title, window.location.pathname);

                // Show welcome message
                setTimeout(() => {
                    this.showWelcomeMessage();
                }, 1000);
            } else {
                // OAuth login completed, clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }

    showWelcomeMessage() {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-900 border border-green-500 text-green-100 px-6 py-4 rounded-lg shadow-2xl z-50 animate-slide-in';
        toast.innerHTML = `
            <div class="flex items-center gap-3">
                <svg class="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <div>
                    <p class="font-bold">Email verified!</p>
                    <p class="text-sm">Welcome to GoatMouth. You're all set to start trading.</p>
                </div>
            </div>
        `;
        document.body.appendChild(toast);

        // Remove after 5 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(400px)';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    async checkAuth() {
        try {
            this.currentUser = await this.api.getCurrentUser();
            if (this.currentUser) {
                this.currentProfile = await this.api.getProfile(this.currentUser.id);

                // Load user's bookmarks
                await this.loadBookmarks();

                // Redirect admin to admin panel
                if (this.currentProfile.role === 'admin' && !window.location.pathname.includes('admin.html')) {
                    // Optional: comment this out if you want admins to access main app too
                    // window.location.href = 'admin.html';
                }

                // Update header with user info
                this.updateUserInfo();

                // Ensure mobile nav balance is updated
                setTimeout(() => {
                    const mobileWalletBalance = document.getElementById('mobileWalletBalance');
                    if (mobileWalletBalance && this.currentProfile) {
                        const balance = this.currentProfile.balance || 0;
                        mobileWalletBalance.textContent = `J$${balance.toFixed(2)}`;
                    }
                }, 200);
            }
        } catch (error) {
            console.log('No user logged in');
        }
    }

    async onSignIn(user) {
        this.currentUser = user;
        this.currentProfile = await this.api.getProfile(user.id);

        // Load user's bookmarks
        await this.loadBookmarks();

        // Redirect admin to admin panel on login
        if (this.currentProfile.role === 'admin') {
            window.location.href = 'admin.html';
            return;
        }

        this.render();
    }

    updateUserInfo() {
        // Update username and email in header (Desktop)
        const userName = document.getElementById('user-name');
        const userNameDropdown = document.getElementById('user-name-dropdown');
        const userEmail = document.getElementById('user-email');
        const userAvatarInitial = document.getElementById('user-avatar-initial');

        // Mobile elements
        const mobileUserName = document.getElementById('mobile-user-name');
        const mobileUserEmail = document.getElementById('mobile-user-email');
        const mobileAvatarInitial = document.getElementById('mobile-avatar-initial');

        if (userName && this.currentProfile) {
            userName.textContent = this.currentProfile.username;
        }

        if (userNameDropdown && this.currentProfile) {
            userNameDropdown.textContent = this.currentProfile.username;
        }

        if (userEmail) {
            // Use email from profile if available, otherwise from auth user
            const email = this.currentProfile?.email || this.currentUser?.email;
            if (email) {
                userEmail.textContent = email;
            }
        }

        if (userAvatarInitial && this.currentProfile) {
            userAvatarInitial.textContent = this.currentProfile.username.charAt(0).toUpperCase();
        }

        // Update mobile elements
        if (mobileUserName && this.currentProfile) {
            mobileUserName.textContent = this.currentProfile.username;
        }

        if (mobileUserEmail) {
            const email = this.currentProfile?.email || this.currentUser?.email;
            if (email) {
                mobileUserEmail.textContent = email;
            }
        }

        if (mobileAvatarInitial && this.currentProfile) {
            mobileAvatarInitial.textContent = this.currentProfile.username.charAt(0).toUpperCase();
        }

        // Update mobile nav wallet balance
        const mobileNavWalletApp = document.getElementById('mobileNavWalletApp');
        if (mobileNavWalletApp && this.currentProfile) {
            const balance = this.currentProfile.balance || 0;
            console.log('[App.js updateUserInfo] Updating mobile nav balance to:', balance);

            const spinner = mobileNavWalletApp.querySelector('.mobile-balance-spinner');
            const balanceTextEl = mobileNavWalletApp.querySelector('.mobile-balance-text');

            if (balance > 0) {
                if (spinner) spinner.classList.add('hidden');
                if (balanceTextEl) {
                    balanceTextEl.textContent = `J$${balance.toFixed(2)}`;
                    balanceTextEl.style.display = 'inline';
                }
            } else {
                if (spinner) spinner.classList.remove('hidden');
                if (balanceTextEl) balanceTextEl.style.display = 'none';
            }
        } else {
            console.log('[App.js updateUserInfo] Cannot update balance:', {
                hasElement: !!mobileNavWalletApp,
                hasProfile: !!this.currentProfile
            });
        }
    }

    onSignOut() {
        this.currentUser = null;
        this.currentView = 'markets';
        this.render();
    }

    attachEventListeners() {
        // Navigation
        document.addEventListener('click', (e) => {
            // Check if clicked element or any parent has data-nav attribute
            const navEl = e.target.closest('[data-nav]');
            if (navEl) {
                e.preventDefault();
                this.navigate(navEl.dataset.nav);
            }

            // Category filtering
            if (e.target.matches('[data-category]') || e.target.closest('[data-category]')) {
                e.preventDefault();
                const categoryEl = e.target.matches('[data-category]') ? e.target : e.target.closest('[data-category]');
                this.filterByCategory(categoryEl.dataset.category);
            }

            // Auth buttons
            if (e.target.closest('[data-action="connect"]')) {
                e.preventDefault();
                const btn = e.target.closest('[data-action="connect"]');
                const tab = btn.dataset.tab || 'login';
                this.showAuthModal(tab);
            }

            if (e.target.closest('[data-action="signout"]')) {
                e.preventDefault();
                this.handleSignOut();
            }

            // Profile dropdown toggle
            if (e.target.closest('[data-action="toggle-profile"]')) {
                e.stopPropagation();
                const menu = document.querySelector('.profile-menu');
                if (menu) {
                    menu.classList.toggle('hidden');
                }
            }

            // Edit profile
            if (e.target.closest('[data-action="edit-profile"]')) {
                e.preventDefault();
                this.showEditProfileModal();
                document.querySelector('.profile-menu').classList.add('hidden');
            }

            // Close dropdown when clicking outside
            const profileDropdown = document.querySelector('.profile-dropdown');
            if (profileDropdown && !e.target.closest('.profile-dropdown')) {
                const menu = document.querySelector('.profile-menu');
                if (menu) {
                    menu.classList.add('hidden');
                }
            }
        });
    }

    navigate(view) {
        this.currentView = view;
        this.currentCategory = 'all';
        this.render();
    }

    filterByCategory(category) {
        this.currentCategory = category;
        this.currentView = 'markets';
        this.marketOffset = 0; // Reset pagination when changing category
        this.render();
    }

    async render() {
        this.renderNav();

        // Only render content if #app div exists (on index.html)
        const app = document.getElementById('app');
        if (app) {
            await this.renderContent();
        }
    }

    renderNav() {
        const mainNav = document.querySelector('#main-nav');
        const categoryNav = document.querySelector('#category-nav');

        // If elements don't exist, components are handling navigation - skip rendering
        if (!mainNav || !categoryNav) {
            return;
        }

        const isAuth = !!this.currentUser;
        const isOnIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '';

        // Mobile Navigation
        if (this.isMobile) {
            // Check if mobile nav already exists to prevent re-rendering
            const existingMobileNav = document.querySelector('.mobile-bottom-nav');
            if (existingMobileNav) {
                console.log('[App.js] Mobile nav already exists, skipping re-render');
                // Just update the balance if profile is loaded
                if (this.currentProfile) {
                    const mobileNavWalletApp = document.getElementById('mobileNavWalletApp');
                    if (mobileNavWalletApp) {
                        const balance = this.currentProfile.balance || 0;
                        console.log('[App.js] Updating existing mobile nav balance to:', balance);

                        const spinner = mobileNavWalletApp.querySelector('.mobile-balance-spinner');
                        const balanceTextEl = mobileNavWalletApp.querySelector('.mobile-balance-text');

                        if (balance > 0) {
                            if (spinner) spinner.classList.add('hidden');
                            if (balanceTextEl) {
                                balanceTextEl.textContent = `J$${balance.toFixed(2)}`;
                                balanceTextEl.style.display = 'inline';
                            }
                        } else {
                            if (spinner) spinner.classList.remove('hidden');
                            if (balanceTextEl) balanceTextEl.style.display = 'none';
                        }
                    }
                }
                return;
            }
            console.log('[App.js] Creating mobile nav for first time');

            mainNav.innerHTML = `
                <!-- Mobile Header - Redesigned -->
                <div class="mobile-header bg-gray-900 border-b border-gray-800">
                    <!-- Top Bar -->
                    <div class="flex items-center justify-between px-3 py-2">
                        <!-- Logo -->
                        ${isOnIndexPage ? `
                            <div class="flex-shrink-0 cursor-pointer" data-nav="markets">
                                <img src="assets/official.png" alt="GoatMouth" class="mobile-logo logo-no-bg" style="height: 100px; width: 100px;">
                            </div>
                        ` : `
                            <a href="index.html" class="flex-shrink-0 cursor-pointer">
                                <img src="assets/official.png" alt="GoatMouth" class="mobile-logo logo-no-bg" style="height: 100px; width: 100px;">
                            </a>
                        `}

                        <!-- Right Actions -->
                        <div class="flex items-center gap-2">
                            ${isAuth ? `
                                <!-- Balance -->
                                <div class="px-2 py-1 rounded-lg border" style="background: rgba(2, 122, 64, 0.1); border-color: rgba(2, 122, 64, 0.3); max-width: 85px; overflow: hidden;">
                                    <span class="text-xs font-bold whitespace-nowrap" style="color: #027A40; display: block; overflow: hidden; text-overflow: ellipsis;" id="mobile-user-balance">$0.00</span>
                                </div>
                            ` : `
                                <!-- Login & Sign Up Buttons -->
                                <button class="px-2 py-1.5 rounded-lg font-semibold text-xs border touch-target" style="border-color: #027A40; color: #027A40; min-height: 32px;" data-action="connect" data-tab="login">Login</button>
                                <button class="px-2 py-1.5 rounded-lg font-semibold text-xs touch-target" style="background: #00CB97; color: white; min-height: 32px;" data-action="connect" data-tab="signup">Sign Up</button>
                            `}
                        </div>
                    </div>
                </div>

                <!-- Mobile Menu Overlay -->
                <div class="mobile-menu-overlay" onclick="app.toggleMobileMenu()"></div>

                <!-- Mobile Menu -->
                <div class="mobile-menu">
                    <div class="p-6">
                        <!-- User Info -->
                        <div class="flex items-center gap-3 mb-6 pb-6 border-b-2" style="border-color: rgba(2, 122, 64, 0.2);">
                            <div class="w-12 h-12 rounded-full flex items-center justify-center font-bold" style="background: linear-gradient(135deg, #00CB97 0%, #631BDD 100%);">
                                <span id="mobile-avatar-initial">U</span>
                            </div>
                            <div>
                                <p class="font-bold text-white" id="mobile-user-name">User</p>
                                <p class="text-xs text-gray-400" id="mobile-user-email">user@email.com</p>
                            </div>
                        </div>

                        <!-- Menu Items -->
                        <nav class="space-y-2">
                            <a href="#" class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition touch-target" data-nav="markets" onclick="app.toggleMobileMenu()">
                                <svg class="w-5 h-5" style="color: #027A40;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                </svg>
                                <span class="font-semibold">Markets</span>
                            </a>
                            <a href="#" class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition touch-target" data-nav="portfolio" onclick="app.toggleMobileMenu()">
                                <svg class="w-5 h-5" style="color: #631BDD;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                </svg>
                                <span class="font-semibold">Portfolio</span>
                            </a>
                            <a href="#" class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition touch-target" data-nav="activity" onclick="app.toggleMobileMenu()">
                                <svg class="w-5 h-5" style="color: #F2C300;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <span class="font-semibold">Activity</span>
                            </a>
                            <a href="#" class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition touch-target" data-nav="voting" onclick="app.toggleMobileMenu()">
                                <svg class="w-5 h-5" style="color: #ffffff;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <span class="font-semibold" style="color: #ffffff;">Community Voting</span>
                            </a>

                            <!-- Live Feed Section (Mobile Only) -->
                            <div class="mobile-live-feed">
                                <div class="mobile-live-feed-header">
                                    <i class="fa-solid fa-rss"></i>
                                    <span class="font-semibold">Live Feed</span>
                                </div>
                                <div class="mobile-live-feed-content">
                                    <div class="mobile-live-feed-placeholder">
                                        <i class="fa-brands fa-twitter"></i>
                                        <p>Social media feed placeholder</p>
                                        <span>Your social media updates will appear here</span>
                                    </div>
                                </div>
                            </div>

                            ${this.currentProfile && this.currentProfile.role === 'admin' ? `
                                <a href="admin.html" class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition touch-target" onclick="app.toggleMobileMenu()">
                                    <svg class="w-5 h-5" style="color: #631BDD;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    </svg>
                                    <span class="font-bold" style="color: #631BDD;">Admin Panel</span>
                                </a>
                            ` : ''}
                            <button class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition touch-target w-full text-left" style="color: #ef4444;" data-action="signout">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                                </svg>
                                <span class="font-bold">Sign Out</span>
                            </button>
                        </nav>
                    </div>
                </div>
            `;

            // Mobile Bottom Navigation - Show for ALL users (both auth and non-auth)
            const bottomNav = document.createElement('div');

            bottomNav.innerHTML = `
                <nav class="mobile-bottom-nav">
                    <div class="mobile-bottom-nav-container">
                        <a href="${isOnIndexPage ? '#' : 'index.html'}" class="mobile-nav-item ${isOnIndexPage ? 'active' : ''}" ${isOnIndexPage ? 'data-nav="markets"' : ''}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                            </svg>
                            <span>Home</span>
                        </a>
                        <a href="voting.html" class="mobile-nav-item ${window.location.pathname.includes('voting.html') ? 'active' : ''}">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span>Voting</span>
                        </a>
                        <button class="mobile-nav-item" onclick="app.mobileSearch.show()">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                            <span>Search</span>
                        </button>
                        <a href="deposit.html" class="mobile-nav-item ${window.location.pathname.includes('deposit.html') ? 'active' : ''}" id="mobileNavWalletApp">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                            </svg>
                            <span class="mobile-wallet-text">
                                <svg class="mobile-balance-spinner" viewBox="0 0 24 24" width="12" height="12">
                                    <circle class="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none"/>
                                </svg>
                                <span id="mobileWalletBalance" class="mobile-balance-text" style="display: none;">J$0.00</span>
                            </span>
                        </a>
                    </div>
                </nav>
            `;

            // Append bottom nav to body
            document.body.appendChild(bottomNav.firstElementChild);

            console.log('[App.js Mobile Nav] Appended to body');

            // Update balance if profile is already loaded
            setTimeout(() => {
                console.log('[App.js Mobile Nav] Timeout fired, checking profile...');
                if (this.currentProfile) {
                    const mobileWalletBalance = document.getElementById('mobileWalletBalance');
                    if (mobileWalletBalance) {
                        const balance = this.currentProfile.balance || 0;
                        console.log('[App.js Mobile Nav] Setting balance to:', balance, 'Profile:', this.currentProfile);
                        mobileWalletBalance.textContent = `J$${balance.toFixed(2)}`;
                    } else {
                        console.log('[App.js Mobile Nav] mobileWalletBalance element not found');
                    }
                } else {
                    console.log('[App.js Mobile Nav] currentProfile not loaded yet');
                }
            }, 100);

            return;
        }

        // Desktop Navigation
        mainNav.innerHTML = `
            <div class="container mx-auto px-4 py-1 flex items-center justify-between gap-6">
                <!-- Left: Logo -->
                ${isOnIndexPage ? `
                    <div class="flex-shrink-0 cursor-pointer" data-nav="markets">
                        <img src="assets/official.png" alt="GoatMouth" style="height: 120px; width: 120px;" class="logo-no-bg">
                    </div>
                ` : `
                    <a href="index.html" class="flex-shrink-0 cursor-pointer">
                        <img src="assets/official.png" alt="GoatMouth" style="height: 120px; width: 120px;" class="logo-no-bg">
                    </a>
                `}

                <!-- Center: Search -->
                <div class="flex-1 max-w-3xl">
                    <div class="relative">
                        <input
                            type="text"
                            placeholder="Search GoatMouth Market..."
                            class="w-full px-5 py-2.5 pl-12 bg-gray-800 border-2 rounded-xl text-base focus:outline-none shadow-lg" style="border-color: #027A40; box-shadow: 0 4px 14px 0 rgba(2, 122, 64, 0.15);" onfocus="this.style.boxShadow='0 4px 20px 0 rgba(2, 122, 64, 0.3)'; this.style.borderColor='#00CB97'" onblur="this.style.boxShadow='0 4px 14px 0 rgba(2, 122, 64, 0.15)'; this.style.borderColor='#00CB97'"
                        >
                        <svg class="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style="color: #00a87d;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                    </div>
                </div>

                <!-- Right: Actions -->
                <div class="flex items-center gap-4">
                    ${isAuth ? `
                        <!-- How it works (Icon Only) -->
                        <a href="how-it-works.html" class="p-3 rounded-xl transition" title="How it works" onmouseover="this.style.backgroundColor='rgba(242, 195, 0, 0.1)'" onmouseout="this.style.backgroundColor='transparent'">
                            <img src="assets/info.png" alt="Info" class="h-9 w-9">
                        </a>

                        <!-- Balance -->
                        <div class="relative px-5 py-2.5 rounded-xl border-2"
                             style="background: linear-gradient(135deg, rgba(2, 122, 64, 0.15) 0%, rgba(2, 122, 64, 0.05) 100%);
                                    border-color: rgba(2, 122, 64, 0.3);
                                    backdrop-filter: blur(10px);">
                            <div class="flex items-center gap-2.5">
                                <div class="flex items-center justify-center w-8 h-8 rounded-lg"
                                     style="background: linear-gradient(135deg, #00CB97 0%, #00e5af 100%);">
                                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                                    </svg>
                                </div>
                                <div class="flex flex-col" style="min-width: 0;">
                                    <span class="text-xs font-medium tracking-wide" style="color: rgba(2, 122, 64, 0.8);">BALANCE</span>
                                    <span class="text-lg font-bold leading-none tracking-tight whitespace-nowrap" style="color: #027A40; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 120px;" id="desktop-user-balance">$0.00</span>
                                </div>
                            </div>
                        </div>

                        <!-- User Profile Dropdown -->
                        <div class="relative profile-dropdown">
                            <button class="group relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl border-2 transition-all duration-300 hover:scale-105 overflow-hidden"
                                    style="background: linear-gradient(135deg, rgba(2, 122, 64, 0.08) 0%, rgba(99, 27, 221, 0.08) 100%);
                                           border-color: rgba(2, 122, 64, 0.3);
                                           backdrop-filter: blur(10px);"
                                    data-action="toggle-profile"
                                    onmouseover="this.style.borderColor='rgba(2, 122, 64, 0.6)'; this.style.boxShadow='0 0 20px rgba(2, 122, 64, 0.3)'"
                                    onmouseout="this.style.borderColor='rgba(2, 122, 64, 0.3)'; this.style.boxShadow='none'">
                                <div class="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-300 group-hover:scale-110"
                                     style="background: linear-gradient(135deg, #00CB97 0%, #631BDD 100%);">
                                    <svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                    </svg>
                                </div>
                                <span class="font-bold text-white tracking-tight" id="user-name">User</span>
                                <svg class="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" style="color: #027A40;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </button>

                            <!-- Dropdown Menu -->
                            <div class="profile-menu hidden absolute right-0 mt-3 w-72 rounded-2xl border-2 shadow-2xl z-50 overflow-hidden"
                                 style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
                                        border-color: rgba(2, 122, 64, 0.2);
                                        backdrop-filter: blur(20px);
                                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(2, 122, 64, 0.1);">
                                <!-- Header -->
                                <div class="p-5 border-b-2" style="background: linear-gradient(135deg, rgba(2, 122, 64, 0.12) 0%, rgba(99, 27, 221, 0.12) 100%);
                                                                    border-color: rgba(2, 122, 64, 0.15);">
                                    <div class="flex items-center gap-3.5">
                                        <div class="relative flex-shrink-0">
                                            <div class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white ring-2 ring-offset-2 ring-offset-gray-800 transition-all duration-300"
                                                 style="background: linear-gradient(135deg, #00CB97 0%, #631BDD 100%);
                                                        ring-color: rgba(2, 122, 64, 0.4);">
                                                <span id="user-avatar-initial">U</span>
                                            </div>
                                            <div class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-gray-800"
                                                 style="background: #00CB97;"></div>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <p class="font-bold text-base text-white truncate tracking-tight" id="user-name-dropdown">User</p>
                                            <p class="text-xs font-medium truncate mt-0.5" style="color: rgba(2, 122, 64, 0.8);" id="user-email">user@email.com</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Menu Items -->
                                <div class="py-2">
                                    <a href="#" class="group flex items-center gap-3.5 px-5 py-3 transition-all duration-200 relative overflow-hidden"
                                       data-nav="profile"
                                       onmouseover="this.style.background='linear-gradient(90deg, rgba(2, 122, 64, 0.15) 0%, rgba(2, 122, 64, 0.05) 100%)'"
                                       onmouseout="this.style.background='transparent'">
                                        <div class="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200"
                                             style="background: rgba(2, 122, 64, 0.1);">
                                            <svg class="h-4.5 w-4.5 transition-all duration-200" style="color: #027A40;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                            </svg>
                                        </div>
                                        <span class="font-semibold text-sm text-gray-200 tracking-tight">Your Profile</span>
                                    </a>
                                    <a href="#" class="group flex items-center gap-3.5 px-5 py-3 transition-all duration-200 relative overflow-hidden"
                                       data-action="edit-profile"
                                       onmouseover="this.style.background='linear-gradient(90deg, rgba(2, 122, 64, 0.15) 0%, rgba(2, 122, 64, 0.05) 100%)'"
                                       onmouseout="this.style.background='transparent'">
                                        <div class="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200"
                                             style="background: rgba(2, 122, 64, 0.1);">
                                            <svg class="h-4.5 w-4.5 transition-all duration-200" style="color: #027A40;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                            </svg>
                                        </div>
                                        <span class="font-semibold text-sm text-gray-200 tracking-tight">Edit Profile</span>
                                    </a>
                                    ${this.currentProfile && this.currentProfile.role === 'admin' ? `
                                        <a href="admin.html" class="group flex items-center gap-3.5 px-5 py-3 transition-all duration-200 relative overflow-hidden"
                                           onmouseover="this.style.background='linear-gradient(90deg, rgba(99, 27, 221, 0.15) 0%, rgba(99, 27, 221, 0.05) 100%)'"
                                           onmouseout="this.style.background='transparent'">
                                            <div class="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200"
                                                 style="background: rgba(99, 27, 221, 0.15);">
                                                <svg class="h-4.5 w-4.5 transition-all duration-200" style="color: #631BDD;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                                </svg>
                                            </div>
                                            <span class="font-bold text-sm tracking-tight" style="color: #631BDD;">Admin Panel</span>
                                        </a>
                                    ` : ''}
                                </div>

                                <!-- Sign Out -->
                                <div class="border-t-2 py-2" style="border-color: rgba(239, 68, 68, 0.15);">
                                    <button class="group flex items-center gap-3.5 px-5 py-3 transition-all duration-200 w-full text-left relative overflow-hidden"
                                            data-action="signout"
                                            onmouseover="this.style.background='linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)'"
                                            onmouseout="this.style.background='transparent'">
                                        <div class="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200"
                                             style="background: rgba(239, 68, 68, 0.15);">
                                            <svg class="h-4.5 w-4.5 transition-all duration-200" style="color: #ef4444;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                                            </svg>
                                        </div>
                                        <span class="font-bold text-sm tracking-tight" style="color: #ef4444;">Sign Out</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <a href="how-it-works.html" class="flex items-center gap-1.5 px-8 py-4 rounded-xl font-bold text-lg transition" style="color: #F2C300;" onmouseover="this.style.backgroundColor='rgba(242, 195, 0, 0.1)'" onmouseout="this.style.backgroundColor='transparent'">
                            <img src="assets/info.png" alt="Info" class="h-9 w-9">
                            How it works
                        </a>
                        <button class="px-8 py-4 text-lg font-bold rounded-xl transition" style="color: #027A40;" onmouseover="this.style.backgroundColor='rgba(2, 122, 64, 0.1)'" onmouseout="this.style.backgroundColor='transparent'" data-action="connect" data-tab="login">Log In</button>
                        <button class="px-8 py-4 rounded-xl font-bold text-lg transition text-white" style="background-color: #027A40;" onmouseover="this.style.backgroundColor='#00e5af'" onmouseout="this.style.backgroundColor='#00CB97'" data-action="connect" data-tab="signup">Sign Up</button>
                    `}
                    <button class="text-gray-300 hover:text-white transition p-3">
                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        // Category Navigation
        if (this.isMobile) {
            // Mobile: Horizontal scroll with pills
            categoryNav.innerHTML = `
                <div class="category-nav-mobile border-t border-gray-800 bg-gray-900" style="position: fixed; top: 124px; left: 0; right: 0; z-index: 40; width: 100%;">
                    <div class="flex gap-3 overflow-x-auto px-4 py-3" style="-webkit-overflow-scrolling: touch; scrollbar-width: none; -ms-overflow-style: none;">
                        <a href="#" class="mobile-card whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition active:scale-95 ${this.currentCategory === 'all' && this.currentView === 'markets' ? 'category-active' : ''}"
                           style="background: ${this.currentCategory === 'all' && this.currentView === 'markets' ? '#00CB97' : 'rgba(2, 122, 64, 0.1)'};
                                  color: ${this.currentCategory === 'all' && this.currentView === 'markets' ? 'white' : '#00CB97'};
                                  border: 1px solid ${this.currentCategory === 'all' && this.currentView === 'markets' ? '#00CB97' : 'transparent'};"
                           data-category="all">
                            All Markets
                        </a>
                        ${isAuth ? `
                            <a href="#" class="mobile-card whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition active:scale-95 ${this.currentView === 'portfolio' ? 'category-active' : ''}"
                               style="background: ${this.currentView === 'portfolio' ? '#631BDD' : 'rgba(99, 27, 221, 0.1)'};
                                      color: ${this.currentView === 'portfolio' ? 'white' : '#631BDD'};
                                      border: 1px solid ${this.currentView === 'portfolio' ? '#631BDD' : 'transparent'};"
                               data-nav="portfolio">
                                Portfolio
                            </a>
                            <a href="#" class="mobile-card whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition active:scale-95 ${this.currentView === 'activity' ? 'category-active' : ''}"
                               style="background: ${this.currentView === 'activity' ? '#F2C300' : 'rgba(242, 195, 0, 0.1)'};
                                      color: ${this.currentView === 'activity' ? 'black' : '#F2C300'};
                                      border: 1px solid ${this.currentView === 'activity' ? '#F2C300' : 'transparent'};"
                               data-nav="activity">
                                Activity
                            </a>
                        ` : ''}
                        <a href="earn.html" class="mobile-card whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition active:scale-95"
                           style="background: rgba(242, 195, 0, 0.1);
                                  color: #F2C300;
                                  border: 1px solid transparent;">
                            Earn
                        </a>
                        <a href="#" class="mobile-card whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition active:scale-95"
                           style="background: ${this.currentCategory === 'Politics' ? '#00CB97' : 'rgba(2, 122, 64, 0.1)'};
                                  color: ${this.currentCategory === 'Politics' ? 'white' : '#00CB97'};
                                  border: 1px solid ${this.currentCategory === 'Politics' ? '#00CB97' : 'transparent'};"
                           data-category="Politics">Politics</a>
                        <a href="#" class="mobile-card whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition active:scale-95"
                           style="background: ${this.currentCategory === 'Sports' ? '#631BDD' : 'rgba(99, 27, 221, 0.1)'};
                                  color: ${this.currentCategory === 'Sports' ? 'white' : '#631BDD'};
                                  border: 1px solid ${this.currentCategory === 'Sports' ? '#631BDD' : 'transparent'};"
                           data-category="Sports">Sports</a>
                        <a href="#" class="mobile-card whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition active:scale-95"
                           style="background: ${this.currentCategory === 'Finance' ? '#F2C300' : 'rgba(242, 195, 0, 0.1)'};
                                  color: ${this.currentCategory === 'Finance' ? 'black' : '#F2C300'};
                                  border: 1px solid ${this.currentCategory === 'Finance' ? '#F2C300' : 'transparent'};"
                           data-category="Finance">Finance</a>
                        <a href="#" class="mobile-card whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition active:scale-95"
                           style="background: ${this.currentCategory === 'Crypto' ? '#00CB97' : 'rgba(2, 122, 64, 0.1)'};
                                  color: ${this.currentCategory === 'Crypto' ? 'white' : '#00CB97'};
                                  border: 1px solid ${this.currentCategory === 'Crypto' ? '#00CB97' : 'transparent'};"
                           data-category="Crypto">Crypto</a>
                        <a href="#" class="mobile-card whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition active:scale-95"
                           style="background: ${this.currentCategory === 'Technology' ? '#631BDD' : 'rgba(99, 27, 221, 0.1)'};
                                  color: ${this.currentCategory === 'Technology' ? 'white' : '#631BDD'};
                                  border: 1px solid ${this.currentCategory === 'Technology' ? '#631BDD' : 'transparent'};"
                           data-category="Technology">Tech</a>
                        <a href="#" class="mobile-card whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition active:scale-95"
                           style="background: ${this.currentCategory === 'Science' ? '#F2C300' : 'rgba(242, 195, 0, 0.1)'};
                                  color: ${this.currentCategory === 'Science' ? 'black' : '#F2C300'};
                                  border: 1px solid ${this.currentCategory === 'Science' ? '#F2C300' : 'transparent'};"
                           data-category="Science">Science</a>
                        <a href="#" class="mobile-card whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition active:scale-95"
                           style="background: ${this.currentCategory === 'Culture' ? '#00CB97' : 'rgba(2, 122, 64, 0.1)'};
                                  color: ${this.currentCategory === 'Culture' ? 'white' : '#00CB97'};
                                  border: 1px solid ${this.currentCategory === 'Culture' ? '#00CB97' : 'transparent'};"
                           data-category="Culture">Culture</a>

                        <!-- View Mode Toggle for Mobile -->
                        ${this.currentView === 'markets' ? `
                            <div class="flex gap-1 bg-gray-800 rounded-lg p-1 border border-gray-700 whitespace-nowrap">
                                <button class="px-2 py-1 rounded ${this.viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400'} transition" onclick="if(app.viewMode !== 'grid') app.toggleViewMode()" title="Grid">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                                    </svg>
                                </button>
                                <button class="px-2 py-1 rounded ${this.viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400'} transition" onclick="if(app.viewMode !== 'list') app.toggleViewMode()" title="List">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                                    </svg>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <!-- Search Bar - Below Category Nav -->
                <div class="px-3 py-2 bg-gray-900 border-b border-gray-800" id="mobile-search-bar" style="display: block !important; visibility: visible !important;">
                    <div class="relative">
                        <input type="text" id="mobile-menu-search-input" name="mobile-menu-search" placeholder="Search markets..." class="w-full px-3 py-2.5 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-green-500" style="font-size: 16px;" autocomplete="off">
                        <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                    </div>
                </div>
                <style>
                    .category-nav-mobile > div::-webkit-scrollbar {
                        display: none;
                    }
                </style>
            `;
        } else {
            // Desktop: Original layout
            categoryNav.innerHTML = `
                <div class="container mx-auto px-4 border-t border-gray-800">
                    <div class="flex items-center justify-between overflow-x-auto">
                        <div class="flex items-center gap-4">
                        <a href="#" class="category-link flex items-center gap-1.5 ${this.currentCategory === 'all' && this.currentView === 'markets' ? 'category-active' : ''}" data-category="all">
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                            </svg>
                            <span>All Markets</span>
                        </a>
                        <span class="text-gray-600 text-xl">|</span>
                        ${isAuth ? `
                            <a href="#" class="category-link ${this.currentView === 'portfolio' ? 'category-active' : ''}" data-nav="portfolio">Portfolio</a>
                            <a href="#" class="category-link ${this.currentView === 'activity' ? 'category-active' : ''}" data-nav="activity">Activity</a>
                            <span class="text-gray-600 text-xl">|</span>
                        ` : ''}
                        <a href="#" class="category-link flex items-center gap-1.5 ${this.currentView === 'voting' ? 'category-active' : ''}" data-nav="voting">
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span>Voting</span>
                        </a>
                        <span class="text-gray-600 text-xl">|</span>
                        <a href="#" class="category-link ${this.currentCategory === 'Politics' ? 'category-active' : ''}" data-category="Politics">Politics</a>
                        <a href="#" class="category-link ${this.currentCategory === 'Sports' ? 'category-active' : ''}" data-category="Sports">Sports</a>
                        <a href="#" class="category-link ${this.currentCategory === 'Finance' ? 'category-active' : ''}" data-category="Finance">Finance</a>
                        <a href="#" class="category-link ${this.currentCategory === 'Crypto' ? 'category-active' : ''}" data-category="Crypto">Crypto</a>
                        <a href="#" class="category-link ${this.currentCategory === 'Technology' ? 'category-active' : ''}" data-category="Technology">Tech</a>
                        <a href="#" class="category-link ${this.currentCategory === 'Science' ? 'category-active' : ''}" data-category="Science">Science</a>
                        <a href="#" class="category-link ${this.currentCategory === 'Culture' ? 'category-active' : ''}" data-category="Culture">Culture</a>
                        </div>

                        <!-- View Mode Toggle -->
                        ${this.currentView === 'markets' ? `
                            <div class="flex gap-1 bg-gray-800 rounded-lg p-1 border border-gray-700" style="flex-shrink: 0;">
                                <button class="px-2 py-1.5 rounded ${this.viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'} transition" onclick="if(app.viewMode !== 'grid') app.toggleViewMode()" title="Grid View">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                                    </svg>
                                </button>
                                <button class="px-2 py-1.5 rounded ${this.viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'} transition" onclick="if(app.viewMode !== 'list') app.toggleViewMode()" title="List View">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                                    </svg>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        // Show mobile navigation
        if (this.isMobile && categoryNav) {
            categoryNav.style.display = 'block';
        }

        // Load balance if authenticated
        if (isAuth) {
            this.loadUserBalance();
        }
    }

    async loadUserBalance() {
        try {
            const profile = await this.api.getProfile(this.currentUser.id);
            const balanceText = `J$${parseFloat(profile.balance).toFixed(2)}`;

            // Update mobile balance
            const mobileBalance = document.getElementById('mobile-user-balance');
            if (mobileBalance) {
                mobileBalance.textContent = balanceText;
            }

            // Update desktop balance
            const desktopBalance = document.getElementById('desktop-user-balance');
            if (desktopBalance) {
                desktopBalance.textContent = balanceText;
            }
        } catch (error) {
            console.error('Error loading balance:', error);
        }
    }

    async initializeBanner() {
        // Initialize banner carousel once for all views (if not already initialized)
        if (!this.bannerCarousel && window.BannerCarousel) {
            const bannerContainer = document.getElementById('banner-container');
            if (bannerContainer) {
                this.bannerCarousel = new BannerCarousel(this);
                await this.bannerCarousel.loadBanners();

                // Only render if we have banners and container has the .banner-content child
                const bannerContent = bannerContainer.querySelector('.banner-content');
                if (bannerContent && this.bannerCarousel.banners && this.bannerCarousel.banners.length > 0) {
                    this.bannerCarousel.render(bannerContainer);
                }
            }
        }
    }

    async renderContent() {
        const app = document.getElementById('app');
        const bannerContainer = document.getElementById('banner-container');

        // Show banner on all pages
        if (bannerContainer) bannerContainer.classList.remove('hidden');

        // Set page-specific class on body for CSS targeting
        document.body.setAttribute('data-page', this.currentView);

        switch (this.currentView) {
            case 'markets':
                await this.renderMarkets(app);
                break;
            case 'portfolio':
                await this.renderPortfolio(app);
                break;
            case 'activity':
                await this.renderActivity(app);
                break;
            case 'profile':
                await this.renderProfile(app);
                break;
            case 'voting':
                await this.renderVoting(app);
                break;
            case 'leaderboard':
                await this.renderLeaderboard(app);
                break;
            default:
                app.innerHTML = '<p>View not found</p>';
        }

        // Initialize banner carousel once for all views (if on index.html and not already initialized)
        await this.initializeBanner();
    }

    async renderMarkets(container) {
        container.innerHTML = window.SkeletonLoaders.marketGrid(6);

        try {
            let filters = { status: 'active' };

            // Add category filter if not "all"
            if (this.currentCategory && this.currentCategory !== 'all') {
                filters.category = this.currentCategory;
            }

            const allMarkets = await this.api.getMarkets(filters);
            const markets = allMarkets;

            // Store all markets for bookmarks modal
            this.markets = allMarkets;

            if (markets.length === 0) {
                const categoryText = this.currentCategory === 'all' ? '' : ` in ${this.currentCategory}`;
                container.innerHTML = `
                    <div class="text-center py-12">
                        <p class="text-gray-400 mb-4">No active markets${categoryText}</p>
                        ${this.currentCategory !== 'all' ? '<button class="px-4 py-2 rounded-lg text-white transition" style="background-color: #631BDD;" onmouseover="this.style.backgroundColor=\'#7a2ef0\'" onmouseout="this.style.backgroundColor=\'#631BDD\'" onclick="app.filterByCategory(\'all\')">View All Markets</button>' : ''}
                        ${this.currentProfile && this.currentProfile.role === 'admin' ? '<button class="px-4 py-2 rounded-lg text-white transition ml-2" style="background-color: #027A40;" onmouseover="this.style.backgroundColor=\'#00e5af\'" onmouseout="this.style.backgroundColor=\'#00CB97\'" onclick="app.showCreateMarketModal()">Create Market</button>' : ''}
                    </div>
                `;
                return;
            }

            // Pagination: Display markets in 5x5 grid (25 per page)
            const startIndex = this.marketOffset;
            const endIndex = startIndex + this.marketsPerPage;
            const displayedMarkets = markets.slice(startIndex, endIndex);
            const hasMore = markets.length > endIndex;
            const hasPrevious = startIndex > 0;
            const totalPages = Math.ceil(markets.length / this.marketsPerPage);
            const currentPage = Math.floor(startIndex / this.marketsPerPage) + 1;

            container.innerHTML = `
                <!-- Banner Carousel (only on "all" category) -->
                ${this.currentCategory === 'all' ? `
                    <div id="banner-container"></div>
                    <div id="banner-reopen-container" class="banner-reopen-container hidden">
                        <button class="banner-reopen-btn" onclick="reopenBanner()" title="Show banner">
                            <i class="fa-solid fa-image"></i>
                            <span class="reopen-text">Show Banner</span>
                        </button>
                    </div>
                ` : ''}

                ${this.currentProfile && this.currentProfile.role === 'admin' ? `
                    <div class="mb-6 flex justify-end">
                        <button class="px-4 py-2 rounded-lg text-white transition" style="background-color: #027A40;" onmouseover="this.style.backgroundColor='#00e5af'" onmouseout="this.style.backgroundColor='#00CB97'" onclick="app.showCreateMarketModal()">Create Market</button>
                    </div>
                ` : ''}

                <!-- Floating View Toggle - Mobile Only -->
                ${this.isMobile ? `
                    <button onclick="app.toggleViewMode()"
                            class="mobile-only"
                            style="position: fixed; bottom: 80px; right: 16px; background: transparent; border: none; padding: 8px; display: flex; align-items: center; justify-content: center; z-index: 40; transition: all 0.2s ease; cursor: pointer;"
                            onmouseover="this.style.transform='scale(1.1)'; this.style.opacity='0.8';"
                            onmouseout="this.style.transform='scale(1)'; this.style.opacity='1';"
                            ontouchstart="this.style.transform='scale(0.9)'; this.style.opacity='0.8';"
                            ontouchend="this.style.transform='scale(1)'; this.style.opacity='1';"
                            title="${this.viewMode === 'grid' ? 'Switch to List View' : 'Switch to Grid View'}">
                        ${this.viewMode === 'grid' ? `
                            <!-- List Icon (3 horizontal lines) -->
                            <svg style="width: 36px; height: 36px; color: #027A40; filter: drop-shadow(0 2px 8px rgba(2, 122, 64, 0.5));" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16"/>
                            </svg>
                        ` : `
                            <!-- Grid Icon (4 squares) -->
                            <svg style="width: 36px; height: 36px; color: #027A40; filter: drop-shadow(0 2px 8px rgba(2, 122, 64, 0.5));" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                            </svg>
                        `}
                    </button>
                ` : ''}

                <!-- Markets Container -->
                <div class="${this.viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5' : 'flex flex-col gap-3'} mb-6">
                    ${displayedMarkets.map(market => this.viewMode === 'list' ? this.renderMarketListItem(market) : this.renderMarketCard(market)).join('')}
                </div>

                <!-- Pagination Controls -->
                ${(hasPrevious || hasMore) ? `
                    <div class="flex items-center justify-center gap-4">
                        ${hasPrevious ? `
                            <button class="px-6 py-3 rounded-lg font-bold text-white transition border border-gray-600 hover:bg-gray-700"
                                    onclick="app.previousPage()">
                                ← Previous
                            </button>
                        ` : ''}
                        <span class="text-gray-400 font-medium">Page ${currentPage} of ${totalPages}</span>
                        ${hasMore ? `
                            <button class="px-6 py-3 rounded-lg font-bold text-white transition"
                                    style="background-color: #027A40;"
                                    onmouseover="this.style.backgroundColor='#00e5af'"
                                    onmouseout="this.style.backgroundColor='#00CB97'"
                                    onclick="app.nextPage()">
                                Next →
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            `;
        } catch (error) {
            container.innerHTML = `<div class="text-red-500">Error loading markets: ${error.message}</div>`;
        }
    }

    renderMarketCard(market) {
        const yesPercent = (market.yes_price * 100).toFixed(0);
        const noPercent = (market.no_price * 100).toFixed(0);
        const timeLeft = this.getTimeLeft(market.end_date);

        // Calculate circular progress for visual indicator
        const circumference = 2 * Math.PI * 45; // radius = 45
        const yesStrokeDashoffset = circumference - (yesPercent / 100) * circumference;

        if (this.isMobile) {
            // Mobile card - Polymarket style
            return `
                <div class="mobile-card bg-gray-800 rounded-xl overflow-hidden border border-gray-700"
                     style="box-shadow: 0 2px 8px rgba(0,0,0,0.3); transition: all 0.2s;">

                    <!-- Image Section -->
                    <div onclick="window.location.href='market.html?id=${market.id}'" style="cursor: pointer; position: relative;">
                        ${market.image_url ? `
                            <div style="height: 140px; background: url('${market.image_url}') center/cover; position: relative;">
                                <div style="position: absolute; inset: 0; background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 100%);"></div>
                            </div>
                        ` : `
                            <div style="height: 140px; background: linear-gradient(135deg, #1f2937 0%, #111827 100%); position: relative; display: flex; align-items: center; justify-content: center;">
                                <div style="font-size: 2.5rem; font-weight: 800; color: rgba(0, 203, 151, 0.15);">${yesPercent}%</div>
                            </div>
                        `}

                        <!-- Share Icon - Bottom Right -->
                        <button onclick="event.stopPropagation(); app.shareMarket('${market.id}', '${market.title.replace(/'/g, "\\'")}');"
                                class="share-btn"
                                style="position: absolute; bottom: 10px; right: 50px; padding: 8px; background: none; border: none; transition: all 0.2s; opacity: 0.9; -webkit-tap-highlight-color: transparent;"
                                onmouseover="this.style.opacity='1'; this.style.transform='scale(1.15)';"
                                onmouseout="this.style.opacity='0.9'; this.style.transform='scale(1)';">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                                <circle cx="18" cy="5" r="3"></circle>
                                <circle cx="6" cy="12" r="3"></circle>
                                <circle cx="18" cy="19" r="3"></circle>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                            </svg>
                        </button>

                        <!-- Bookmark Icon - Bottom Right -->
                        <button onclick="event.stopPropagation(); app.toggleBookmark('${market.id}');"
                                class="bookmark-btn ${this.isBookmarked(market.id) ? 'bookmarked' : ''}"
                                data-market-id="${market.id}"
                                style="position: absolute; bottom: 10px; right: 10px; padding: 8px; background: none; border: none; transition: all 0.2s; opacity: 0.9; -webkit-tap-highlight-color: transparent;"
                                onmouseover="this.style.opacity='1'; this.style.transform='scale(1.15)';"
                                onmouseout="this.style.opacity='0.9'; this.style.transform='scale(1)';">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="${this.isBookmarked(market.id) ? '#059669' : 'none'}" stroke="${this.isBookmarked(market.id) ? '#059669' : '#ffffff'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M18 7v14l-6 -4l-6 4v-14a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4z" />
                            </svg>
                        </button>

                        <div class="p-4">
                            <!-- Category & Time -->
                            <div class="flex items-center justify-between mb-2">
                                ${market.category ? `
                                    <span class="text-xs font-semibold" style="color: #059669;">${market.category}</span>
                                ` : '<span></span>'}
                                <div class="flex items-center gap-1 text-gray-400 text-xs">
                                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <span class="font-medium">${timeLeft}</span>
                                </div>
                            </div>

                            <!-- Title -->
                            <h3 class="text-base font-bold mb-3 leading-tight line-clamp-2" style="color: #ffffff; min-height: 40px;">${market.title}</h3>

                            <!-- Bet Buttons - Polymarket Style -->
                            <div class="grid grid-cols-2 gap-2 mb-3">
                                <button onclick="event.stopPropagation(); app.quickBet('${market.id}', 'yes', ${market.yes_price});"
                                        class="flex items-center justify-between px-3 py-2.5 rounded-lg transition"
                                        style="background: rgba(5, 150, 105, 0.12);"
                                        onmouseover="this.style.background='rgba(5, 150, 105, 0.18)';"
                                        onmouseout="this.style.background='rgba(5, 150, 105, 0.12)';">
                                    <span class="text-xs font-semibold" style="color: #059669;">YES</span>
                                    <span class="text-lg font-bold" style="color: #059669;">${yesPercent}¢</span>
                                </button>

                                <button onclick="event.stopPropagation(); app.quickBet('${market.id}', 'no', ${market.no_price});"
                                        class="flex items-center justify-between px-3 py-2.5 rounded-lg transition"
                                        style="background: rgba(239, 68, 68, 0.12);"
                                        onmouseover="this.style.background='rgba(239, 68, 68, 0.18)';"
                                        onmouseout="this.style.background='rgba(239, 68, 68, 0.12)';">
                                    <span class="text-xs font-semibold" style="color: #ef4444;">NO</span>
                                    <span class="text-lg font-bold" style="color: #ef4444;">${noPercent}¢</span>
                                </button>
                            </div>

                            <!-- Volume & Traders -->
                            <div class="flex items-center gap-4 text-xs text-gray-400">
                                <div class="flex items-center gap-1.5">
                                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                    </svg>
                                    <span class="font-medium">J$${parseFloat(market.total_volume/1000).toFixed(1)}K vol</span>
                                </div>
                                <div class="flex items-center gap-1.5">
                                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                    </svg>
                                    <span class="font-medium">${market.bettor_count || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Desktop card - Polymarket style
            return `
                <div class="bg-gray-800 rounded-lg overflow-hidden border border-gray-700"
                     style="box-shadow: 0 1px 3px rgba(0,0,0,0.2); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);"
                     onmouseover="this.style.boxShadow='0 6px 20px rgba(2, 122, 64, 0.12), 0 3px 10px rgba(0,0,0,0.3)'; this.style.transform='translateY(-2px)'; this.style.borderColor='rgba(2, 122, 64, 0.3)';"
                     onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.2)'; this.style.transform='translateY(0)'; this.style.borderColor='rgb(55, 65, 81)';">

                    <!-- Image Section -->
                    <div onclick="window.location.href='market.html?id=${market.id}'" style="cursor: pointer; position: relative;">
                        ${market.image_url ? `
                            <div style="height: 110px; background: url('${market.image_url}') center/cover; position: relative;">
                                <div style="position: absolute; inset: 0; background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.3) 100%);"></div>
                            </div>
                        ` : `
                            <div style="height: 110px; background: linear-gradient(135deg, #1f2937 0%, #111827 100%); display: flex; align-items: center; justify-content: center; position: relative;">
                                <div style="font-size: 2rem; font-weight: 800; color: rgba(0, 203, 151, 0.12);">${yesPercent}%</div>
                            </div>
                        `}

                        <!-- Share Icon - Bottom Right -->
                        <button onclick="event.stopPropagation(); app.shareMarket('${market.id}', '${market.title.replace(/'/g, "\\'")}');"
                                class="share-btn"
                                style="position: absolute; bottom: 6px; right: 40px; padding: 0; background: none; border: none; transition: all 0.2s; opacity: 0.9;"
                                onmouseover="this.style.opacity='1'; this.style.transform='scale(1.15)';"
                                onmouseout="this.style.opacity='0.9'; this.style.transform='scale(1)';">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                                <circle cx="18" cy="5" r="3"></circle>
                                <circle cx="6" cy="12" r="3"></circle>
                                <circle cx="18" cy="19" r="3"></circle>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                            </svg>
                        </button>

                        <!-- Bookmark Icon - Bottom Right -->
                        <button onclick="event.stopPropagation(); app.toggleBookmark('${market.id}');"
                                class="bookmark-btn ${this.isBookmarked(market.id) ? 'bookmarked' : ''}"
                                data-market-id="${market.id}"
                                style="position: absolute; bottom: 6px; right: 6px; padding: 0; background: none; border: none; transition: all 0.2s; opacity: 0.9;"
                                onmouseover="this.style.opacity='1'; this.style.transform='scale(1.15)';"
                                onmouseout="this.style.opacity='0.9'; this.style.transform='scale(1)';">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${this.isBookmarked(market.id) ? '#059669' : 'none'}" stroke="${this.isBookmarked(market.id) ? '#059669' : '#ffffff'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M18 7v14l-6 -4l-6 4v-14a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4z" />
                            </svg>
                        </button>

                        <div class="p-3">
                            <!-- Category & Time -->
                            <div class="flex items-center justify-between mb-2">
                                ${market.category ? `
                                    <span class="text-xs font-semibold" style="color: #059669; font-size: 9px;">${market.category}</span>
                                ` : '<span></span>'}
                                <div class="flex items-center gap-0.5 text-gray-400 text-xs">
                                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <span class="font-medium" style="font-size: 9px;">${timeLeft}</span>
                                </div>
                            </div>

                            <!-- Title -->
                            <h3 class="text-sm font-bold mb-3 leading-tight line-clamp-2" style="color: #ffffff; min-height: 36px;">${market.title}</h3>

                            <!-- Bet Buttons - Polymarket Style -->
                            <div class="grid grid-cols-2 gap-2 mb-3">
                                <button onclick="event.stopPropagation(); app.quickBet('${market.id}', 'yes', ${market.yes_price});"
                                        class="flex items-center justify-between px-2.5 py-2 rounded-lg transition"
                                        style="background: rgba(5, 150, 105, 0.12);"
                                        onmouseover="this.style.background='rgba(5, 150, 105, 0.18)';"
                                        onmouseout="this.style.background='rgba(5, 150, 105, 0.12)';">
                                    <span class="text-xs font-semibold" style="color: #059669; font-size: 10px;">YES</span>
                                    <span class="text-base font-bold" style="color: #059669;">${yesPercent}¢</span>
                                </button>

                                <button onclick="event.stopPropagation(); app.quickBet('${market.id}', 'no', ${market.no_price});"
                                        class="flex items-center justify-between px-2.5 py-2 rounded-lg transition"
                                        style="background: rgba(239, 68, 68, 0.12);"
                                        onmouseover="this.style.background='rgba(239, 68, 68, 0.18)';"
                                        onmouseout="this.style.background='rgba(239, 68, 68, 0.12)';">
                                    <span class="text-xs font-semibold" style="color: #ef4444; font-size: 10px;">NO</span>
                                    <span class="text-base font-bold" style="color: #ef4444;">${noPercent}¢</span>
                                </button>
                            </div>

                            <!-- Volume & Traders -->
                            <div class="flex items-center gap-3 text-xs text-gray-400">
                                <div class="flex items-center gap-1">
                                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                    </svg>
                                    <span class="font-medium" style="font-size: 9px;">J$${parseFloat(market.total_volume/1000).toFixed(1)}K</span>
                                </div>
                                <div class="flex items-center gap-1">
                                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                    </svg>
                                    <span class="font-medium" style="font-size: 9px;">${market.bettor_count || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    renderMarketListItem(market) {
        const yesPercent = (market.yes_price * 100).toFixed(0);
        const noPercent = (market.no_price * 100).toFixed(0);
        const timeLeft = this.getTimeLeft(market.end_date);

        return `
            <div class="bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition cursor-pointer"
                 onclick="window.location.href='market.html?id=${market.id}'"
                 style="box-shadow: 0 1px 3px rgba(0,0,0,0.2); overflow: hidden;">
                <div style="padding: 12px; display: flex; align-items: center; gap: 8px; overflow: hidden;">
                    <!-- Image Thumbnail -->
                    ${market.image_url ? `
                        <div class="flex-shrink-0">
                            <img src="${market.image_url}"
                                 alt="${market.title}"
                                 class="object-cover rounded-lg border border-gray-700"
                                 style="width: 48px; height: 48px;"
                                 onerror="this.style.display='none'">
                        </div>
                    ` : ''}

                    <!-- Left: Market Info -->
                    <div class="flex-1" style="min-width: 0; display: flex; flex-direction: column; gap: 4px; overflow: hidden;">
                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; overflow: hidden;">
                            ${market.category ? `
                                <span style="font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 600; background-color: rgba(2, 122, 64, 0.1); color: #027A40; border: 1px solid rgba(2, 122, 64, 0.2); white-space: nowrap;">
                                    ${market.category}
                                </span>
                            ` : ''}
                            <span style="font-size: 0.65rem; color: #9ca3af; display: flex; align-items: center; gap: 3px; white-space: nowrap;">
                                <svg style="width: 11px; height: 11px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                ${timeLeft}
                            </span>
                        </div>
                        <h3 style="font-size: 0.85rem; font-weight: 700; color: #ffffff; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
                            ${market.title}
                        </h3>
                        <div style="display: flex; align-items: center; gap: 10px; font-size: 0.65rem; color: #9ca3af; flex-wrap: wrap; overflow: hidden;">
                            <span style="display: flex; align-items: center; gap: 3px; white-space: nowrap;">
                                <svg style="width: 11px; height: 11px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                </svg>
                                J$${parseFloat(market.total_volume/1000).toFixed(1)}K
                            </span>
                            <span style="display: flex; align-items: center; gap: 3px; white-space: nowrap;">
                                <svg style="width: 11px; height: 11px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                </svg>
                                ${market.bettor_count || 0}
                            </span>
                            ${this.isMobile ? `
                                <span style="display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                                    <div style="width: 40px; height: 6px; border-radius: 3px; background: linear-gradient(90deg, #027A40 0%, #027A40 ${yesPercent}%, #ef4444 ${yesPercent}%, #ef4444 100%); box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>
                                    <span style="color: #027A40; font-weight: 600; font-size: 0.65rem;">${yesPercent}%</span>
                                </span>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Right: Probability Bars - Desktop Only -->
                    ${!this.isMobile ? `
                        <div style="display: flex; gap: 4px; align-items: center;">
                            <div style="text-align: center;">
                                <div style="font-size: 0.95rem; font-weight: 700; color: #027A40; line-height: 1.1; white-space: nowrap;">${yesPercent}%</div>
                                <div style="font-size: 0.55rem; color: #9ca3af; text-transform: uppercase; font-weight: 600;">Yes</div>
                            </div>
                            <div style="width: 1px; height: 32px; background-color: #374151; flex-shrink: 0;"></div>
                            <div style="text-align: center;">
                                <div style="font-size: 0.95rem; font-weight: 700; color: #ef4444; line-height: 1.1; white-space: nowrap;">${noPercent}%</div>
                                <div style="font-size: 0.55rem; color: #9ca3af; text-transform: uppercase; font-weight: 600;">No</div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Share & Bookmark Buttons -->
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button
                            onclick="event.stopPropagation(); app.shareMarket('${market.id}', '${market.title.replace(/'/g, "\\'")}'))"
                            class="share-btn flex-shrink-0"
                            style="padding: 8px; border-radius: 6px; background: transparent; border: 1px solid #374151; transition: all 0.2s; cursor: pointer;"
                            onmouseover="this.style.borderColor='#00CB97'; this.style.background='rgba(0, 203, 151, 0.1)'"
                            onmouseout="this.style.borderColor='#374151'; this.style.background='transparent'"
                            title="Share this market">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="18" cy="5" r="3"></circle>
                                <circle cx="6" cy="12" r="3"></circle>
                                <circle cx="18" cy="19" r="3"></circle>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                            </svg>
                        </button>
                        <button
                            onclick="event.stopPropagation(); app.toggleBookmark('${market.id}')"
                            class="bookmark-btn flex-shrink-0"
                            data-market-id="${market.id}"
                            style="padding: 8px; border-radius: 6px; background: transparent; border: 1px solid #374151; transition: all 0.2s; cursor: pointer;"
                            onmouseover="this.style.borderColor='#00CB97'; this.style.background='rgba(0, 203, 151, 0.1)'"
                            onmouseout="this.style.borderColor='#374151'; this.style.background='transparent'"
                            title="${this.isBookmarked(market.id) ? 'Remove bookmark' : 'Bookmark this market'}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${this.isBookmarked(market.id) ? '#00CB97' : 'none'}" stroke="${this.isBookmarked(market.id) ? '#00CB97' : '#9ca3af'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getTimeLeft(endDate) {
        const end = new Date(endDate);
        const now = new Date();
        const diff = end - now;

        if (diff < 0) return 'Ended';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days}d left`;
        return `${hours}h left`;
    }

    async renderPortfolio(container) {
        if (!this.currentUser) {
            container.innerHTML = '<p class="text-center py-8">Please sign in to view your portfolio</p>';
            return;
        }

        container.innerHTML = window.SkeletonLoaders.list(5);

        try {
            const positions = await this.api.getUserPositions(this.currentUser.id);

            container.innerHTML = `
                <h1 class="text-3xl font-bold mb-6">Your Portfolio</h1>
                ${positions.length === 0 ? '<p class="text-gray-400">No positions yet</p>' : `
                    <div class="space-y-4">
                        ${positions.map(pos => `
                            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                                <div class="flex justify-between items-start mb-2">
                                    <h3 class="font-semibold">${pos.markets.title}</h3>
                                    <span class="text-sm ${pos.outcome === 'yes' ? 'text-green-400' : 'text-red-400'}">${pos.outcome.toUpperCase()}</span>
                                </div>
                                <div class="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p class="text-gray-400">Shares</p>
                                        <p class="font-semibold">${parseFloat(pos.shares).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p class="text-gray-400">Avg Price</p>
                                        <p class="font-semibold">${(parseFloat(pos.avg_price) * 100).toFixed(1)}¢</p>
                                    </div>
                                    <div>
                                        <p class="text-gray-400">Invested</p>
                                        <p class="font-semibold">J$${parseFloat(pos.total_invested).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p class="text-gray-400">Current Value</p>
                                        <p class="font-semibold">J$${parseFloat(pos.current_value).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            `;
        } catch (error) {
            container.innerHTML = `<div class="text-red-500">Error loading portfolio: ${error.message}</div>`;
        }
    }

    async renderActivity(container) {
        if (!this.currentUser) {
            container.innerHTML = '<p class="text-center py-8">Please sign in to view activity</p>';
            return;
        }

        container.innerHTML = window.SkeletonLoaders.commentList(5);

        try {
            const bets = await this.api.getUserBets(this.currentUser.id);

            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
                    <h1 class="text-3xl font-bold">Your Activity</h1>
                    <div class="text-sm text-gray-400" style="overflow: hidden;">
                        <span class="font-semibold text-white">${bets.length}</span> total bets
                    </div>
                </div>
                ${bets.length === 0 ? `
                    <div class="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
                        <i class="ri-history-line text-6xl text-gray-600 mb-4"></i>
                        <p class="text-gray-400 text-lg">No bets yet</p>
                        <p class="text-gray-500 text-sm mt-2">Start betting on markets to see your activity here</p>
                    </div>
                ` : `
                    <div class="space-y-3">
                        ${bets.map(bet => {
                            const outcomeColor = bet.outcome === 'yes' ? '#00CB97' : '#ef4444';
                            const outcomeBg = bet.outcome === 'yes' ? 'rgba(0, 203, 151, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                            const price = parseFloat(bet.price);
                            const amount = parseFloat(bet.amount);
                            // Calculate shares from amount and price
                            const shares = bet.outcome === 'yes'
                                ? (amount / price).toFixed(2)
                                : (amount / (1 - price)).toFixed(2);
                            const priceDisplay = (price * 100).toFixed(1);
                            const amountDisplay = amount.toFixed(2);
                            const potentialReturn = parseFloat(bet.potential_return || shares).toFixed(2);

                            return `
                            <div class="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-600 transition-all duration-200 hover:transform hover:scale-[1.01]">
                                <div class="flex justify-between items-start gap-4">
                                    <div class="flex-1 min-w-0">
                                        <a href="market.html?id=${bet.market_id}" class="block group">
                                            <h3 class="font-semibold mb-2 text-white group-hover:text-green-400 transition-colors">${bet.markets.title}</h3>
                                        </a>
                                        <div class="flex items-center gap-3 text-sm text-gray-400 mb-3 flex-wrap">
                                            <span class="whitespace-nowrap"><i class="ri-time-line"></i> ${new Date(bet.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div class="flex items-center gap-4 text-sm flex-wrap">
                                            <div class="flex items-center gap-2 whitespace-nowrap">
                                                <span class="text-gray-400">Shares:</span>
                                                <span class="font-semibold text-white">${shares}</span>
                                            </div>
                                            <div class="flex items-center gap-2 whitespace-nowrap">
                                                <span class="text-gray-400">Price:</span>
                                                <span class="font-semibold text-white">${priceDisplay}¢</span>
                                            </div>
                                            <div class="flex items-center gap-2 whitespace-nowrap">
                                                <span class="text-gray-400">Total:</span>
                                                <span class="font-semibold text-white">J$${amountDisplay}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex flex-col items-end gap-2 flex-shrink-0">
                                        <div class="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap" style="background: ${outcomeBg}; color: ${outcomeColor};">
                                            ${bet.outcome.toUpperCase()}
                                        </div>
                                        <div class="text-right whitespace-nowrap">
                                            <div class="text-xs text-gray-400">Potential</div>
                                            <div class="text-sm font-semibold" style="color: ${outcomeColor};">J$${potentialReturn}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `}).join('')}
                    </div>
                `}
            `;
        } catch (error) {
            container.innerHTML = `<div class="text-red-500">Error loading activity: ${error.message}</div>`;
        }
    }

    async renderLeaderboard(container) {
        container.innerHTML = window.SkeletonLoaders.list(10);

        try {
            // Fetch top users by balance or total bets
            const leaderboard = await this.api.getLeaderboard();

            container.innerHTML = `
                <h1 class="text-3xl font-bold mb-6">Leaderboard</h1>
                <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    ${leaderboard && leaderboard.length > 0 ? `
                        <div class="space-y-4">
                            ${leaderboard.map((user, index) => `
                                <div class="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700">
                                    <div class="flex items-center gap-4">
                                        <div class="text-2xl font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-gray-500'}">
                                            #${index + 1}
                                        </div>
                                        <div>
                                            <div class="font-semibold">${user.username || 'Anonymous'}</div>
                                            <div class="text-sm text-gray-400" style="overflow: hidden;">${user.total_bets || 0} bets placed</div>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-xl font-bold" style="color: #027A40;">$${(user.balance || 0).toFixed(2)}</div>
                                        <div class="text-sm text-gray-400" style="overflow: hidden;">Balance</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <p class="text-center text-gray-400 py-8">No leaderboard data available yet</p>
                    `}
                </div>
            `;
        } catch (error) {
            container.innerHTML = `<div class="text-red-500">Error loading leaderboard: ${error.message}</div>`;
        }
    }

    async renderProfile(container) {
        if (!this.currentUser) {
            container.innerHTML = '<p class="text-center py-8">Please sign in to view profile</p>';
            return;
        }

        container.innerHTML = `
            ${window.SkeletonLoaders.profile()}
            ${window.SkeletonLoaders.stats(4)}
        `;

        try {
            const [positions, bets, transactions] = await Promise.all([
                this.api.getUserPositions(this.currentUser.id),
                this.api.getUserBets(this.currentUser.id),
                this.api.getUserTransactions(this.currentUser.id)
            ]);

            const totalInvested = positions.reduce((sum, p) => sum + parseFloat(p.total_invested || 0), 0);
            const currentValue = positions.reduce((sum, p) => sum + parseFloat(p.current_value || 0), 0);
            const profitLoss = currentValue - totalInvested;

            container.innerHTML = `
                <!-- Profile Header -->
                <div class="bg-gray-800 rounded-xl p-8 mb-6 border border-gray-700">
                    <div class="flex items-center gap-6">
                        <div class="bg-gradient-to-br from-teal-500 to-purple-600 rounded-full p-1">
                            <div class="bg-gray-800 rounded-full p-6">
                                <svg class="h-16 w-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                </svg>
                            </div>
                        </div>
                        <div class="flex-1">
                            <h1 class="text-3xl font-bold mb-2">${this.currentProfile.username}</h1>
                            <p class="text-gray-400">${this.currentUser.email}</p>
                            <div class="flex gap-4 mt-4">
                                <!-- Balance Card -->
                                <div class="group relative px-5 py-3 rounded-xl border-2 transition-all duration-300 hover:scale-105"
                                     style="background: linear-gradient(135deg, rgba(2, 122, 64, 0.1) 0%, rgba(2, 122, 64, 0.05) 100%);
                                            border-color: rgba(2, 122, 64, 0.3);">
                                    <div class="flex items-center gap-2 mb-1">
                                        <svg class="w-4 h-4" style="color: #027A40;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                                        </svg>
                                        <p class="text-xs font-semibold tracking-wide" style="color: rgba(2, 122, 64, 0.8);">BALANCE</p>
                                    </div>
                                    <p class="text-2xl font-bold" style="color: #027A40;">J$${parseFloat(this.currentProfile.balance).toFixed(2)}</p>
                                </div>

                                <!-- Total Bets Card -->
                                <div class="group relative px-5 py-3 rounded-xl border-2 transition-all duration-300 hover:scale-105"
                                     style="background: linear-gradient(135deg, rgba(99, 27, 221, 0.1) 0%, rgba(99, 27, 221, 0.05) 100%);
                                            border-color: rgba(99, 27, 221, 0.3);">
                                    <div class="flex items-center gap-2 mb-1">
                                        <svg class="w-4 h-4" style="color: #631BDD;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                        </svg>
                                        <p class="text-xs font-semibold tracking-wide" style="color: rgba(99, 27, 221, 0.8);">TOTAL BETS</p>
                                    </div>
                                    <p class="text-2xl font-bold" style="color: #631BDD;">${bets.length}</p>
                                </div>

                                <!-- P/L Card -->
                                <div class="group relative px-5 py-3 rounded-xl border-2 transition-all duration-300 hover:scale-105"
                                     style="background: linear-gradient(135deg, rgba(${profitLoss >= 0 ? '16, 185, 129' : '239, 68, 68'}, 0.1) 0%, rgba(${profitLoss >= 0 ? '16, 185, 129' : '239, 68, 68'}, 0.05) 100%);
                                            border-color: rgba(${profitLoss >= 0 ? '16, 185, 129' : '239, 68, 68'}, 0.3);">
                                    <div class="flex items-center gap-2 mb-1">
                                        <svg class="w-4 h-4" style="color: ${profitLoss >= 0 ? '#10B981' : '#EF4444'};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                        </svg>
                                        <p class="text-xs font-semibold tracking-wide" style="color: rgba(${profitLoss >= 0 ? '16, 185, 129' : '239, 68, 68'}, 0.8);">PROFIT/LOSS</p>
                                    </div>
                                    <p class="text-2xl font-bold" style="color: ${profitLoss >= 0 ? '#10B981' : '#EF4444'};">
                                        ${profitLoss >= 0 ? '+' : ''}J$${profitLoss.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <button onclick="app.showEditProfileModal()" class="px-6 py-3 rounded-lg font-semibold text-white transition" style="background-color: #027A40;" onmouseover="this.style.backgroundColor='#00e5af'" onmouseout="this.style.backgroundColor='#00CB97'">
                            Edit Profile
                        </button>
                    </div>
                </div>

                <!-- Active Positions -->
                <div class="mb-6">
                    <h2 class="text-2xl font-bold mb-4">Active Positions</h2>
                    ${positions.length === 0 ? '<p class="text-gray-400">No active positions</p>' : `
                        <div class="grid gap-4">
                            ${positions.map(pos => `
                                <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                                    <div class="flex justify-between items-start">
                                        <div class="flex-1">
                                            <h3 class="font-semibold mb-1">${pos.markets.title}</h3>
                                            <p class="text-sm ${pos.outcome === 'yes' ? 'text-green-400' : 'text-red-400'} font-semibold">${pos.outcome.toUpperCase()}</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-sm text-gray-400" style="overflow: hidden;">Shares: ${parseFloat(pos.shares).toFixed(2)}</p>
                                            <p class="text-sm text-gray-400" style="overflow: hidden;">Avg: ${(parseFloat(pos.avg_price) * 100).toFixed(1)}¢</p>
                                            <p class="text-sm font-semibold">Value: J$${parseFloat(pos.current_value).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>

                <!-- Recent Activity -->
                <div>
                    <h2 class="text-2xl font-bold mb-4">Recent Activity</h2>
                    ${transactions.slice(0, 10).length === 0 ? '<p class="text-gray-400">No recent activity</p>' : `
                        <div class="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                            <table class="w-full">
                                <thead class="bg-gray-900">
                                    <tr>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-400">Type</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-400">Amount</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-400">Balance</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-400">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${transactions.slice(0, 10).map(tx => `
                                        <tr class="border-t border-gray-700">
                                            <td class="px-4 py-3">
                                                <span class="badge badge-${tx.type}">${tx.type}</span>
                                            </td>
                                            <td class="px-4 py-3 font-semibold">${tx.type === 'bet' ? '-' : '+'}J$${parseFloat(tx.amount).toFixed(2)}</td>
                                            <td class="px-4 py-3 text-gray-400">J$${parseFloat(tx.balance_after).toFixed(2)}</td>
                                            <td class="px-4 py-3 text-sm text-gray-400">${new Date(tx.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            `;
        } catch (error) {
            container.innerHTML = `<div class="text-red-500">Error loading profile: ${error.message}</div>`;
        }
    }

    async renderVoting(container) {
        container.innerHTML = `
            <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
            <style>
                .voting-content {
                    padding: 28px 34px;
                    padding-bottom: 100px;
                }
                .voting-grid {
                    display: grid;
                    grid-template-columns: minmax(0, 2.4fr) minmax(260px, 1fr);
                    gap: 28px;
                }
                .panel {
                    background: #1f2937;
                    border-radius: 12px;
                    border: 1px solid #374151;
                    padding: 22px 26px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                    margin-bottom: 28px;
                }
                .panel-title {
                    font-size: 1.15rem;
                    font-weight: 600;
                    margin-bottom: 18px;
                }
                .stats-column {
                    display: flex;
                    flex-direction: column;
                    gap: 22px;
                }
                .stat-card {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 24px;
                    height: 120px;
                    border-radius: 12px;
                    color: white;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                }
                .stat-icon {
                    font-size: 42px;
                    color: rgba(255,255,255,0.85);
                    width: 60px;
                    text-align: center;
                }
                .stat-info {
                    text-align: right;
                }
                .stat-main {
                    font-size: 1.9rem;
                    font-weight: 700;
                }
                .stat-label {
                    opacity: 0.92;
                    font-size: 0.9rem;
                }
                .stat-green { background: linear-gradient(135deg, #00CB97 0%, #00e5af 100%); }
                .stat-purple { background: linear-gradient(135deg, #631BDD 0%, #8b5cf6 100%); }
                .stat-yellow { background: linear-gradient(135deg, #F2C300 0%, #ffd700 100%); }
                .stat-red { background: linear-gradient(135deg, #ef4444 0%, #f87171 100%); }
                .vote-tab {
                    background: rgba(2, 122, 64, 0.1);
                    border: 1px solid rgba(2, 122, 64, 0.3);
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: 0.2s;
                    color: #027A40;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }
                .vote-tab:hover {
                    background: rgba(2, 122, 64, 0.2);
                }
                .vote-tab.active {
                    background: #00CB97;
                    color: white;
                    border-color: #027A40;
                }
                .admin-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 18px;
                    margin-top: 10px;
                }
                .admin-btn {
                    background: rgba(2, 122, 64, 0.1);
                    border: 1px solid rgba(2, 122, 64, 0.3);
                    border-radius: 10px;
                    padding: 20px 10px;
                    text-align: center;
                    font-weight: 600;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: 0.2s;
                    color: #027A40;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .admin-btn i {
                    font-size: 30px;
                    margin-bottom: 8px;
                    opacity: 0.75;
                }
                .admin-btn:hover {
                    background: rgba(2, 122, 64, 0.2);
                    border-color: #027A40;
                    transform: translateY(-2px);
                }
                @media (max-width: 1024px) {
                    .voting-grid {
                        grid-template-columns: 1fr;
                    }
                    .stats-column {
                        grid-template-columns: repeat(2, 1fr);
                        display: grid;
                    }
                }
            </style>

            <div class="voting-content">
                <div class="voting-grid">
                    <!-- Left Column -->
                    <div>
                        <!-- Top Action Bar -->
                        <div class="flex items-center justify-between mb-6 flex-wrap gap-4">
                            <div>
                                <h1 class="text-2xl font-bold text-white mb-1">Voting</h1>
                                <p class="text-gray-400 text-sm">Vote on proposals and shape the market</p>
                            </div>
                            <div id="suggest-market-btn"></div>
                        </div>

                        <!-- Tabs -->
                        <div class="flex gap-3 mb-6 flex-wrap">
                            <button class="vote-tab active" data-tab="active">
                                <div class="w-2 h-2 rounded-full bg-current"></div>
                                Active Proposals
                            </button>
                            <button class="vote-tab" data-tab="approved" style="background: rgba(99, 27, 221, 0.1); border-color: rgba(99, 27, 221, 0.3); color: #631BDD;">
                                <i class="ri-check-line"></i>
                                Approved
                            </button>
                            <button class="vote-tab" data-tab="rejected" style="background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); color: #ef4444;">
                                <i class="ri-close-line"></i>
                                Rejected
                            </button>
                        </div>

                        <!-- Proposals -->
                        <section class="panel">
                            <div class="panel-title">Market Proposals</div>
                            <div id="proposals-container">
                                ${window.SkeletonLoaders.proposalList(3)}
                            </div>
                        </section>

                        <!-- Admin Panel -->
                        <section class="panel" id="admin-panel" style="display: none;">
                            <div class="panel-title">Admin Poll Management</div>
                            <div class="admin-grid">
                                <div class="admin-btn" data-action="create-proposal">
                                    <i class="ri-add-circle-line"></i>
                                    Create Proposal
                                </div>
                                <div class="admin-btn" onclick="window.location.href='admin.html'">
                                    <i class="ri-checkbox-circle-line"></i>
                                    Approve Markets
                                </div>
                                <div class="admin-btn" onclick="window.location.href='admin.html'">
                                    <i class="ri-settings-3-line"></i>
                                    Manage Markets
                                </div>
                                <div class="admin-btn" data-tab="approved">
                                    <i class="ri-bar-chart-box-line"></i>
                                    View Results
                                </div>
                            </div>
                        </section>
                    </div>

                    <!-- Right Column - Stats -->
                    <aside class="stats-column">
                        <div class="stat-card stat-green">
                            <div class="stat-icon"><i class="ri-survey-line"></i></div>
                            <div class="stat-info">
                                <div class="stat-main" id="stat-total">-</div>
                                <div class="stat-label">Total Proposals</div>
                            </div>
                        </div>

                        <div class="stat-card stat-purple">
                            <div class="stat-icon"><i class="ri-user-voice-line"></i></div>
                            <div class="stat-info">
                                <div class="stat-main" id="stat-participation">-%</div>
                                <div class="stat-label">Participation Rate</div>
                            </div>
                        </div>

                        <div class="stat-card stat-yellow">
                            <div class="stat-icon"><i class="ri-check-double-line"></i></div>
                            <div class="stat-info">
                                <div class="stat-main" id="stat-approved">-</div>
                                <div class="stat-label">Approved & Live</div>
                            </div>
                        </div>

                        <div class="stat-card stat-red">
                            <div class="stat-icon"><i class="ri-bar-chart-box-line"></i></div>
                            <div class="stat-info">
                                <div class="stat-main" id="stat-avg-votes">-</div>
                                <div class="stat-label">Avg Votes/Proposal</div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        `;

        // Initialize VotingSystem
        if (window.VotingSystem) {
            new window.VotingSystem();
        }
    }

    showAuthModal(activeTab = 'login') {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0';
        modal.style.zIndex = '9999';
        modal.style.backdropFilter = 'blur(12px)';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
        modal.style.overflow = 'hidden';
        modal.style.touchAction = 'none';
        modal.innerHTML = `
            <div class="min-h-screen flex items-center justify-center px-4 py-4" style="touch-action: pan-y;">
                <div class="relative rounded-2xl w-full shadow-2xl" style="max-width: 580px; max-height: 90vh; display: flex; flex-direction: column; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);">
                    <!-- Watermark Logo Background -->
                    <div class="absolute inset-0 flex items-center justify-center pointer-events-none" style="opacity: 0.04;">
                        <img src="assets/official.png" alt="" style="width: 600px; height: 600px; object-fit: contain; transform: rotate(-15deg);">
                    </div>

                    <!-- Content Container -->
                    <div class="relative z-10" id="auth-modal-content" style="overflow-y: auto; -webkit-overflow-scrolling: touch; flex: 1; min-height: 0; padding: 2rem 2rem;">
                        <!-- Close Button -->
                        <button id="auth-modal-close" class="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700" title="Close" style="z-index: 10;">
                            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>

                        <!-- Logo & Title -->
                        <div class="text-center mb-4">
                            <img src="assets/official.png" alt="GoatMouth" class="mx-auto mb-3 logo-no-bg" id="auth-modal-logo" style="height: 80px; width: 80px; filter: drop-shadow(0 0 30px rgba(2, 122, 64, 0.4));">
                            <h2 class="text-2xl font-bold mb-1 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">Welcome Back</h2>
                            <p class="text-gray-400 text-xs">Sign in or create an account to start trading</p>
                        </div>

                        <!-- Tabs -->
                        <div class="flex gap-2 mb-4 p-1 rounded-xl" style="background: rgba(0, 0, 0, 0.3);">
                            <button id="login-tab" class="auth-tab ${activeTab === 'login' ? 'active' : ''} flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200 text-sm">
                                Sign In
                            </button>
                            <button id="signup-tab" class="auth-tab ${activeTab === 'signup' ? 'active' : ''} flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200 text-sm">
                                Sign Up
                            </button>
                        </div>

                        <!-- Error Message -->
                        <div id="auth-error" class="hidden mb-4 p-3 rounded-lg text-sm"></div>

                        <!-- Login Form -->
                        <form id="login-form" class="auth-form space-y-3 ${activeTab === 'signup' ? 'hidden' : ''}">
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-semibold text-gray-300 mb-1.5">Email Address</label>
                                    <input
                                        type="email"
                                        id="login-email"
                                        placeholder="Enter your email"
                                        required
                                        autocomplete="email"
                                        class="w-full px-4 py-2.5 rounded-lg text-white text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                                        style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.1);"
                                    >
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-gray-300 mb-1.5">Password</label>
                                    <input
                                        type="password"
                                        id="login-password"
                                        placeholder="Enter your password"
                                        required
                                        autocomplete="current-password"
                                        class="w-full px-4 py-2.5 rounded-lg text-white text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                                        style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.1);"
                                    >
                                </div>
                            </div>
                            <button
                                type="submit"
                                class="w-full px-6 py-3 rounded-lg font-bold text-white transition-all duration-200 mt-4 shadow-lg hover:shadow-xl"
                                style="background: linear-gradient(135deg, #00CB97 0%, #00a878 100%);"
                            >
                                Sign In
                            </button>

                            <!-- Divider -->
                            <div class="relative my-4">
                                <div class="absolute inset-0 flex items-center">
                                    <div class="w-full border-t border-gray-600"></div>
                                </div>
                                <div class="relative flex justify-center text-xs">
                                    <span class="px-2 text-gray-400" style="background: #1e293b;">OR</span>
                                </div>
                            </div>

                            <!-- Google OAuth Button -->
                            <button
                                type="button"
                                id="google-login-btn"
                                class="w-full px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center gap-3 hover:shadow-lg"
                                style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);"
                            >
                                <svg class="h-5 w-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                Continue with Google
                            </button>
                        </form>

                        <!-- Signup Form -->
                        <form id="signup-form" class="auth-form space-y-3 ${activeTab === 'login' ? 'hidden' : ''}">
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div class="sm:col-span-2">
                                    <label class="block text-xs font-semibold text-gray-300 mb-1.5">Username</label>
                                    <input
                                        type="text"
                                        id="signup-username"
                                        placeholder="Choose a username"
                                        required
                                        autocomplete="username"
                                        class="w-full px-4 py-2.5 rounded-lg text-white text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                                        style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.1);"
                                    >
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-gray-300 mb-1.5">Email Address</label>
                                    <input
                                        type="email"
                                        id="signup-email"
                                        placeholder="Enter your email"
                                        required
                                        autocomplete="email"
                                        class="w-full px-4 py-2.5 rounded-lg text-white text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                                        style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.1);"
                                    >
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-gray-300 mb-1.5">Password</label>
                                    <input
                                        type="password"
                                        id="signup-password"
                                        placeholder="Min 6 characters"
                                        required
                                        minlength="6"
                                        autocomplete="new-password"
                                        class="w-full px-4 py-2.5 rounded-lg text-white text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                                        style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.1);"
                                    >
                                </div>
                            </div>
                            <button
                                type="submit"
                                class="w-full px-6 py-3 rounded-lg font-bold text-white transition-all duration-200 mt-4 shadow-lg hover:shadow-xl"
                                style="background: linear-gradient(135deg, #00CB97 0%, #00a878 100%);"
                            >
                                Create Account
                            </button>

                            <!-- Divider -->
                            <div class="relative my-4">
                                <div class="absolute inset-0 flex items-center">
                                    <div class="w-full border-t border-gray-600"></div>
                                </div>
                                <div class="relative flex justify-center text-xs">
                                    <span class="px-2 text-gray-400" style="background: #1e293b;">OR</span>
                                </div>
                            </div>

                            <!-- Google OAuth Button -->
                            <button
                                type="button"
                                id="google-signup-btn"
                                class="w-full px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center gap-3 hover:shadow-lg"
                                style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);"
                            >
                                <svg class="h-5 w-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                Sign up with Google
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Prevent body scroll when modal is open (especially on mobile)
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';

        // Mobile-specific adjustments
        const modalContent = modal.querySelector('#auth-modal-content');
        const modalLogo = modal.querySelector('#auth-modal-logo');
        if (window.innerWidth <= 768) {
            modalContent.style.padding = '1.5rem 1.25rem';
            modalLogo.style.height = '60px';
            modalLogo.style.width = '60px';
        }

        // Function to close modal and cleanup
        const closeModal = () => {

            // Restore body scroll and position
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            window.scrollTo(0, parseInt(scrollY || '0') * -1);

            modal.remove();
        };

        // Close button handler
        const closeBtn = modal.querySelector('#auth-modal-close');
        closeBtn.addEventListener('click', closeModal);

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('min-h-screen')) {
                closeModal();
            }
        });


        // Tab switching
        const loginTab = modal.querySelector('#login-tab');
        const signupTab = modal.querySelector('#signup-tab');
        const loginForm = modal.querySelector('#login-form');
        const signupForm = modal.querySelector('#signup-form');

        loginTab.addEventListener('click', () => {
            loginTab.classList.add('active');
            signupTab.classList.remove('active');
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
        });

        signupTab.addEventListener('click', () => {
            signupTab.classList.add('active');
            loginTab.classList.remove('active');
            signupForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
        });

        // Login form submission
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = modal.querySelector('#login-email').value;
            const password = modal.querySelector('#login-password').value;
            const errorDiv = modal.querySelector('#auth-error');
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            // Clear previous errors
            errorDiv.classList.add('hidden');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing in...';

            try {
                await this.api.signIn(email, password);
                closeModal();
                this.init(); // Refresh app
            } catch (error) {
                errorDiv.textContent = error.message || 'Sign in failed. Please check your credentials.';
                errorDiv.className = 'mb-4 p-3 rounded-lg text-sm bg-red-900 bg-opacity-30 border border-red-500 text-red-300';
                errorDiv.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In';
            }
        });

        // Signup form submission
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = modal.querySelector('#signup-username').value;
            const email = modal.querySelector('#signup-email').value;
            const password = modal.querySelector('#signup-password').value;
            const errorDiv = modal.querySelector('#auth-error');
            const submitBtn = signupForm.querySelector('button[type="submit"]');

            // Clear previous errors
            errorDiv.classList.add('hidden');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating account...';

            try {
                await this.api.signUp(email, password, username);

                // Try to automatically sign in
                submitBtn.textContent = 'Signing you in...';
                try {
                    await this.api.signIn(email, password);
                    // Success! User is now logged in
                    closeModal();
                    this.init(); // Refresh app
                } catch (signInError) {
                    // Sign in failed (probably email verification required)
                    errorDiv.textContent = 'Account created! Please check your email for verification, then sign in.';
                    errorDiv.className = 'mb-4 p-3 rounded-lg text-sm bg-green-900 bg-opacity-30 border border-green-500 text-green-300';
                    errorDiv.classList.remove('hidden');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Create Account';
                    // Switch to login tab after 3 seconds
                    setTimeout(() => {
                        loginTab.click();
                    }, 3000);
                }
            } catch (error) {
                errorDiv.textContent = error.message || 'Sign up failed. Please try again.';
                errorDiv.className = 'mb-4 p-3 rounded-lg text-sm bg-red-900 bg-opacity-30 border border-red-500 text-red-300';
                errorDiv.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';
            }
        });

        // Google OAuth handlers
        const googleLoginBtn = modal.querySelector('#google-login-btn');
        const googleSignupBtn = modal.querySelector('#google-signup-btn');

        const handleGoogleAuth = async () => {
            const errorDiv = modal.querySelector('#auth-error');

            try {
                // Clear previous errors
                errorDiv.classList.add('hidden');

                // Mark that this is GoatMouth app for redirect after OAuth
                localStorage.setItem('oauth_app', 'goatmouth');
                localStorage.setItem('oauth_redirect', window.location.origin);

                // Use current site's URL with app identifier for redirect
                const redirectUrl = `${window.location.origin}/index.html?app=goatmouth`;
                console.log('Google OAuth redirect URL:', redirectUrl);

                const { data, error } = await this.api.db.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: redirectUrl,
                        // Skip confirmation for faster login
                        skipBrowserRedirect: false
                    }
                });

                if (error) throw error;

                // The user will be redirected to Google for authentication
                // After successful auth, they'll be redirected back to the app
            } catch (error) {
                console.error('Google OAuth error:', error);
                errorDiv.textContent = error.message || 'Failed to sign in with Google. Please try again.';
                errorDiv.className = 'mb-4 p-3 rounded-lg text-sm bg-red-900 bg-opacity-30 border border-red-500 text-red-300';
                errorDiv.classList.remove('hidden');
            }
        };

        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', handleGoogleAuth);
        }
        if (googleSignupBtn) {
            googleSignupBtn.addEventListener('click', handleGoogleAuth);
        }
    }

    showEditProfileModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
        modal.style.backdropFilter = 'blur(4px)';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-700">
                <!-- Header -->
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-2xl font-bold text-white">Edit Profile</h2>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <!-- Form -->
                <form id="edit-profile-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Username</label>
                        <input
                            type="text"
                            id="edit-username"
                            value="${this.currentProfile.username}"
                            required
                            minlength="3"
                            class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500 transition"
                        >
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
                        <input
                            type="email"
                            value="${this.currentUser.email}"
                            disabled
                            class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                        >
                        <p class="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>

                    <div class="pt-4">
                        <button
                            type="submit"
                            class="w-full px-6 py-3 rounded-lg font-bold text-white transition"
                            style="background-color: #027A40;"
                            onmouseover="this.style.backgroundColor='#00e5af'"
                            onmouseout="this.style.backgroundColor='#00CB97'"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#edit-profile-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const newUsername = modal.querySelector('#edit-username').value;

            if (newUsername === this.currentProfile.username) {
                alert('No changes made');
                modal.remove();
                return;
            }

            try {
                await this.api.db.from('profiles')
                    .update({ username: newUsername })
                    .eq('id', this.currentUser.id);

                this.currentProfile.username = newUsername;
                this.updateUserInfo();
                alert('Profile updated successfully!');
                modal.remove();
            } catch (error) {
                alert('Error updating profile: ' + error.message);
            }
        });
    }

    async handleSignOut() {
        try {
            // Close mobile menu if open
            if (this.mobileMenuOpen) {
                this.toggleMobileMenu();
            }

            // Sign out from Supabase
            await this.api.signOut();

            // Clear local state
            this.currentUser = null;
            this.currentProfile = null;
            this.currentView = 'markets';

            // Clear any stored data
            localStorage.clear();
            sessionStorage.clear();

            // Clear all cookies
            document.cookie.split(";").forEach(function(c) {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });

            // Redirect to home page
            if (window.location.pathname.includes('admin.html')) {
                window.location.href = '/';
            } else {
                window.location.reload();
            }
        } catch (error) {
            console.error('Sign out error:', error);
            // Force clear everything
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
        }
    }

    showMarketDetail(marketId) {
        this.marketDetailModal = new MarketDetailModal(this, marketId);
        this.marketDetailModal.show();
    }

    // Bookmark methods
    async loadBookmarks() {
        if (!this.currentUser) {
            this.bookmarksCache = [];
            return [];
        }

        try {
            const { data, error } = await window.supabaseClient
                .from('bookmarks')
                .select('market_id')
                .eq('user_id', this.currentUser.id);

            if (error) {
                console.error('Error fetching bookmarks:', error);
                this.bookmarksCache = [];
                return [];
            }

            this.bookmarksCache = data.map(b => b.market_id);
            console.log('✓ Loaded bookmarks:', this.bookmarksCache.length);
            return this.bookmarksCache;
        } catch (error) {
            console.error('Error fetching bookmarks:', error);
            this.bookmarksCache = [];
            return [];
        }
    }

    isBookmarked(marketId) {
        return this.bookmarksCache.includes(marketId);
    }

    async toggleBookmark(marketId) {
        // Check if user is logged in
        if (!this.currentUser) {
            this.showAuthModal('login');
            return;
        }

        try {
            const isCurrentlyBookmarked = this.isBookmarked(marketId);

            if (isCurrentlyBookmarked) {
                // Remove bookmark from database
                const { error } = await window.supabaseClient
                    .from('bookmarks')
                    .delete()
                    .eq('user_id', this.currentUser.id)
                    .eq('market_id', marketId);

                if (error) throw error;

                // Update cache
                this.bookmarksCache = this.bookmarksCache.filter(id => id !== marketId);
                console.log('✓ Removed bookmark:', marketId);
            } else {
                // Add bookmark to database
                const { error } = await window.supabaseClient
                    .from('bookmarks')
                    .insert({
                        user_id: this.currentUser.id,
                        market_id: marketId
                    });

                if (error) throw error;

                // Update cache
                this.bookmarksCache.push(marketId);
                console.log('✓ Added bookmark:', marketId);
            }

            // Update UI
            this.updateBookmarkUI(marketId);

        } catch (error) {
            console.error('Error toggling bookmark:', error);
            if (window.showToast) {
                window.showToast('Failed to update bookmark', 'error');
            }
        }
    }

    updateBookmarkUI(marketId) {
        const isBookmarked = this.isBookmarked(marketId);
        const bookmarkBtns = document.querySelectorAll(`.bookmark-btn[data-market-id="${marketId}"]`);

        bookmarkBtns.forEach(btn => {
            const svg = btn.querySelector('svg');
            if (svg) {
                if (isBookmarked) {
                    svg.setAttribute('fill', '#059669');
                    svg.setAttribute('stroke', '#059669');
                    btn.classList.add('bookmarked');
                } else {
                    svg.setAttribute('fill', 'none');
                    svg.setAttribute('stroke', '#ffffff');
                    btn.classList.remove('bookmarked');
                }
            }
        });
    }

    async shareMarket(marketId, marketTitle) {
        try {
            const marketUrl = `${window.location.origin}/market.html?id=${marketId}`;
            const shareData = {
                title: marketTitle,
                text: `Check out this market on GoatMouth: ${marketTitle}`,
                url: marketUrl
            };

            // Check if Web Share API is supported
            if (navigator.share && this.isMobile) {
                // Use native share on mobile
                await navigator.share(shareData);
                if (window.showToast) {
                    window.showToast('Shared successfully!', 'success');
                }
            } else {
                // Fallback: Copy to clipboard
                await navigator.clipboard.writeText(marketUrl);
                if (window.showToast) {
                    window.showToast('Link copied to clipboard!', 'success');
                } else {
                    alert('Link copied to clipboard!');
                }
            }
        } catch (error) {
            // User cancelled share or clipboard failed
            if (error.name !== 'AbortError') {
                console.error('Share error:', error);
                if (window.showToast) {
                    window.showToast('Failed to share market', 'error');
                }
            }
        }
    }

    async showBookmarksModal() {
        // Check if user is logged in
        if (!this.currentUser) {
            this.showAuthModal('login');
            return;
        }

        // Reload bookmarks from database to ensure fresh data
        await this.loadBookmarks();

        // Load all markets if not already loaded
        if (!this.markets || this.markets.length === 0) {
            console.log('Loading markets for bookmarks modal...');
            this.markets = await this.api.getMarkets({});
        }

        console.log('=== BOOKMARKS DEBUG ===');
        console.log('📚 Bookmarks in cache:', this.bookmarksCache);
        console.log('📊 Total markets available:', this.markets ? this.markets.length : 0);

        if (this.markets && this.markets.length > 0) {
            console.log('📝 Sample market ID:', this.markets[0].id, '(type:', typeof this.markets[0].id + ')');
        }

        if (this.bookmarksCache.length > 0) {
            console.log('📝 Sample bookmark ID:', this.bookmarksCache[0], '(type:', typeof this.bookmarksCache[0] + ')');
        }

        const bookmarkedMarkets = this.markets ? this.markets.filter(m => {
            const isMatch = this.bookmarksCache.includes(m.id);
            if (this.bookmarksCache.length > 0 && this.bookmarksCache.length <= 3) {
                console.log(`Checking market ${m.id} (${m.title?.substring(0, 30)}...) - Match:`, isMatch);
            }
            return isMatch;
        }) : [];

        console.log('✅ Bookmarked markets found:', bookmarkedMarkets.length);
        if (bookmarkedMarkets.length > 0) {
            console.log('First bookmarked market:', bookmarkedMarkets[0].title);
        }
        console.log('=== END DEBUG ===');

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center';
        modal.style.cssText = 'backdrop-filter: blur(8px); z-index: 100; padding-top: 80px;';

        modal.innerHTML = `
            <div class="bg-gray-800 rounded-xl max-w-3xl w-full mx-4 shadow-2xl border border-gray-700 overflow-hidden"
                 style="max-height: calc(100vh - 100px); animation: slideUp 0.3s ease-out;">
                <style>
                    @keyframes slideUp {
                        from { transform: translateY(20px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                </style>

                <!-- Header -->
                <div class="p-4 border-b border-gray-700" style="background: linear-gradient(135deg, rgba(5, 150, 105, 0.1) 0%, rgba(0, 0, 0, 0.2) 100%);">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#059669" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M18 7v14l-6 -4l-6 4v-14a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4z" />
                            </svg>
                            <h2 class="text-xl font-bold" style="color: #fff;">Bookmarked Markets</h2>
                        </div>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-2xl transition" style="padding: 4px 8px;">
                            &times;
                        </button>
                    </div>
                    <p class="text-sm text-gray-400 mt-1">${bookmarkedMarkets.length} market${bookmarkedMarkets.length !== 1 ? 's' : ''} saved</p>
                </div>

                <!-- Body -->
                <div class="p-4 overflow-y-auto" style="max-height: calc(100vh - 200px);">
                    ${bookmarkedMarkets.length === 0 ? `
                        <div class="text-center py-16">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#4b5563" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px;">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M18 7v14l-6 -4l-6 4v-14a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4z" />
                            </svg>
                            <h3 class="text-xl font-bold text-gray-300 mb-2">No bookmarks yet</h3>
                            <p class="text-gray-400 mb-6">Start bookmarking markets to keep track of your favorites</p>
                            <button onclick="this.closest('.fixed').remove()" class="px-6 py-3 rounded-lg font-semibold transition" style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #fff;">
                                Browse Markets
                            </button>
                        </div>
                    ` : `
                        <div class="flex flex-col gap-3">
                            ${bookmarkedMarkets.map(market => {
                                const yesPercent = (market.yes_price * 100).toFixed(0);
                                const noPercent = (market.no_price * 100).toFixed(0);
                                const timeLeft = this.getTimeLeft(market.end_date);

                                return `
                                    <div class="bg-gray-700 rounded-lg border border-gray-600 hover:border-gray-500 transition cursor-pointer overflow-hidden"
                                         onclick="window.location.href='market.html?id=${market.id}'"
                                         style="box-shadow: 0 1px 3px rgba(0,0,0,0.3);">
                                        <div class="flex items-center gap-3 p-3">
                                            ${market.image_url ? `
                                                <img src="${market.image_url}" alt="${market.title}" class="w-16 h-16 rounded object-cover flex-shrink-0" />
                                            ` : `
                                                <div class="w-16 h-16 rounded bg-gray-600 flex items-center justify-center flex-shrink-0">
                                                    <span class="text-2xl font-bold text-gray-500">${yesPercent}%</span>
                                                </div>
                                            `}
                                            <div class="flex-1 min-w-0">
                                                <div class="flex items-center gap-2 mb-1">
                                                    ${market.category ? `<span class="text-xs font-semibold" style="color: #059669;">${market.category}</span>` : ''}
                                                    <span class="text-xs text-gray-400">${timeLeft}</span>
                                                </div>
                                                <h3 class="text-sm font-bold text-white mb-2 line-clamp-2">${market.title}</h3>
                                                <div class="flex items-center gap-2">
                                                    <div class="flex items-center gap-1 px-2 py-1 rounded" style="background: rgba(5, 150, 105, 0.12);">
                                                        <span class="text-xs font-semibold" style="color: #059669;">YES</span>
                                                        <span class="text-sm font-bold" style="color: #059669;">${yesPercent}¢</span>
                                                    </div>
                                                    <div class="flex items-center gap-1 px-2 py-1 rounded" style="background: rgba(239, 68, 68, 0.12);">
                                                        <span class="text-xs font-semibold" style="color: #ef4444;">NO</span>
                                                        <span class="text-sm font-bold" style="color: #ef4444;">${noPercent}¢</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onclick="event.stopPropagation(); app.toggleBookmark('${market.id}'); setTimeout(() => { if(!app.isBookmarked('${market.id}')) { this.closest('.fixed').remove(); } }, 100);"
                                                    class="p-2 rounded-lg hover:bg-gray-600 transition flex-shrink-0">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#059669" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                                    <path d="M18 7v14l-6 -4l-6 4v-14a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async quickBet(marketId, outcome, price) {
        // Check if user is logged in
        if (!this.currentUser) {
            this.showAuthModal('login');
            return;
        }

        // Get market data
        const market = this.markets.find(m => m.id === marketId);
        if (!market) {
            alert('Market not found');
            return;
        }

        // Create quick bet modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center';
        modal.style.backdropFilter = 'blur(8px)';
        modal.style.zIndex = '10001';
        modal.style.paddingTop = '60px';
        modal.style.paddingBottom = '20px';

        const yesPercent = (market.yes_price * 100).toFixed(0);
        const noPercent = (market.no_price * 100).toFixed(0);
        const outcomeColor = outcome === 'yes' ? '#059669' : '#ef4444';
        const outcomeText = outcome.toUpperCase();
        const outcomePrice = outcome === 'yes' ? yesPercent : noPercent;
        const profit = 100 - parseFloat(outcomePrice);

        modal.innerHTML = `
            <div class="bg-gray-800 rounded-xl w-full mx-4 shadow-2xl border border-gray-700 overflow-y-auto"
                 style="max-width: 440px; max-height: 90vh; animation: slideUp 0.3s ease-out;">
                <style>
                    @keyframes slideUp {
                        from { transform: translateY(20px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                </style>

                <!-- Header -->
                <div class="p-4 border-b border-gray-700" style="background: linear-gradient(135deg, rgba(2, 122, 64, 0.1) 0%, rgba(0, 0, 0, 0.2) 100%);">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="text-lg font-bold" style="color: ${outcomeColor};">Quick Bet: ${outcomeText}</h3>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                    </div>
                    <p class="text-sm text-gray-300 line-clamp-2">${market.title}</p>
                </div>

                <!-- Body -->
                <div class="p-4">
                    <!-- Outcome Display -->
                    <div class="mb-4 p-3 rounded-lg text-center" style="background: linear-gradient(135deg, rgba(${outcome === 'yes' ? '2, 122, 64' : '220, 38, 38'}, 0.15) 0%, rgba(${outcome === 'yes' ? '2, 122, 64' : '220, 38, 38'}, 0.05) 100%); border: 2px solid rgba(${outcome === 'yes' ? '0, 203, 151' : '239, 68, 68'}, 0.3);">
                        <div class="text-xs font-semibold mb-1" style="color: ${outcomeColor};">${outcomeText}</div>
                        <div class="text-3xl font-black mb-1" style="color: ${outcomeColor};">${outcomePrice}¢</div>
                        <div class="text-xs text-gray-400">${profit.toFixed(0)}% potential profit</div>
                    </div>

                    <!-- Quick Amount Buttons -->
                    <div class="mb-4">
                        <label class="block text-sm font-semibold mb-2" style="color: #059669;">Bet Amount</label>
                        <div class="grid grid-cols-4 gap-2 mb-3">
                            <button class="quick-amount-btn px-2 py-2 rounded-lg border border-gray-600 hover:border-green-500 hover:bg-gray-700 transition text-sm font-semibold" data-amount="10">$10</button>
                            <button class="quick-amount-btn px-2 py-2 rounded-lg border border-gray-600 hover:border-green-500 hover:bg-gray-700 transition text-sm font-semibold" data-amount="25">$25</button>
                            <button class="quick-amount-btn px-2 py-2 rounded-lg border border-gray-600 hover:border-green-500 hover:bg-gray-700 transition text-sm font-semibold" data-amount="50">$50</button>
                            <button class="quick-amount-btn px-2 py-2 rounded-lg border border-gray-600 hover:border-green-500 hover:bg-gray-700 transition text-sm font-semibold" data-amount="100">$100</button>
                        </div>
                        <input type="number" id="quick-bet-amount" placeholder="Or enter custom amount"
                               class="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-green-500 text-sm"
                               style="font-size: 16px;" min="1" step="0.01">
                    </div>

                    <!-- Bet Summary -->
                    <div id="quick-bet-summary" class="hidden mb-4 p-3 rounded-lg" style="background: linear-gradient(135deg, rgba(0, 203, 151, 0.1) 0%, rgba(99, 27, 221, 0.1) 100%); border: 2px solid rgba(0, 203, 151, 0.3);">
                        <div class="flex justify-between text-sm mb-2">
                            <span class="text-gray-400">Shares</span>
                            <span class="font-semibold" id="quick-summary-shares">-</span>
                        </div>
                        <div class="flex justify-between text-sm mb-2">
                            <span class="text-gray-400">Avg. Price</span>
                            <span class="font-semibold" id="quick-summary-price">-</span>
                        </div>
                        <div class="flex justify-between pt-2 border-t border-gray-600">
                            <span class="font-semibold text-sm">Potential Profit</span>
                            <span class="font-bold text-green-400 text-sm" id="quick-summary-profit">-</span>
                        </div>
                    </div>

                    <!-- Place Bet Button -->
                    <button id="quick-place-bet-btn" disabled
                            class="w-full px-4 py-2.5 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed text-white transition"
                            style="background: linear-gradient(135deg, #059669 0%, #10b981 100%);">
                        Place Bet
                    </button>

                    <!-- Balance -->
                    <div class="text-center text-xs text-gray-400 mt-3">
                        Balance: <span class="font-semibold text-white">J$${parseFloat(this.currentProfile?.balance || 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Attach event listeners
        const amountInput = modal.querySelector('#quick-bet-amount');
        const placeBetBtn = modal.querySelector('#quick-place-bet-btn');
        const summary = modal.querySelector('#quick-bet-summary');

        let betAmount = 0;

        const updateSummary = () => {
            if (!betAmount || parseFloat(betAmount) < 1) {
                summary.classList.add('hidden');
                placeBetBtn.disabled = true;
                placeBetBtn.textContent = 'Place Bet';
                return;
            }

            const amount = parseFloat(betAmount);
            const shares = amount / price;
            const potentialProfit = shares - amount;

            summary.classList.remove('hidden');
            modal.querySelector('#quick-summary-shares').textContent = shares.toFixed(2);
            modal.querySelector('#quick-summary-price').textContent = (price * 100).toFixed(1) + '¢';
            modal.querySelector('#quick-summary-profit').textContent = '+J$' + potentialProfit.toFixed(2);

            placeBetBtn.disabled = false;
            placeBetBtn.textContent = `Place Bet: J$${amount.toFixed(2)}`;
        };

        // Quick amount buttons
        modal.querySelectorAll('.quick-amount-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                betAmount = btn.dataset.amount;
                amountInput.value = betAmount;
                updateSummary();
            });
        });

        // Amount input
        amountInput.addEventListener('input', (e) => {
            betAmount = e.target.value;
            updateSummary();
        });

        // Place bet
        placeBetBtn.addEventListener('click', async () => {
            const amount = parseFloat(betAmount);

            if (!confirm(`Confirm bet: J$${amount.toFixed(2)} on ${outcomeText} @ ${outcomePrice}¢?`)) {
                return;
            }

            try {
                placeBetBtn.disabled = true;
                placeBetBtn.textContent = 'Placing bet...';

                await this.api.placeBet(marketId, outcome, amount, price);

                alert('Bet placed successfully!');
                modal.remove();

                // Refresh markets
                await this.loadMarkets();
                this.render();

            } catch (error) {
                alert('Error placing bet: ' + error.message);
                placeBetBtn.disabled = false;
                placeBetBtn.textContent = 'Place Bet';
            }
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    nextPage() {
        this.marketOffset += this.marketsPerPage;
        this.renderMarketsView();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    previousPage() {
        this.marketOffset = Math.max(0, this.marketOffset - this.marketsPerPage);
        this.renderMarketsView();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async showEditMarketModal(marketId) {
        try {
            // Load existing market data
            const market = await this.api.getMarket(marketId);

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

            // Format end_date for datetime-local input
            const endDate = new Date(market.end_date);
            const formattedEndDate = endDate.toISOString().slice(0, 16);

            modal.innerHTML = `
                <div class="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold" style="color: #027A40;">Edit Market</h2>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white transition">
                            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    <form id="editMarketForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-semibold mb-2">Title *</label>
                            <input type="text" name="title" required value="${market.title.replace(/"/g, '&quot;')}"
                                   class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500">
                        </div>

                        <div>
                            <label class="block text-sm font-semibold mb-2">Description</label>
                            <textarea name="description" rows="3"
                                      class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500">${market.description || ''}</textarea>
                        </div>

                        <div>
                            <label class="block text-sm font-semibold mb-2">Category *</label>
                            <select name="category" required
                                    class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500">
                                <option value="">Select category</option>
                                <option value="Jamaican Parliament" ${market.category === 'Jamaican Parliament' ? 'selected' : ''}>Jamaican Parliament</option>
                                <option value="Dancehall" ${market.category === 'Dancehall' ? 'selected' : ''}>Dancehall</option>
                                <option value="Reggae" ${market.category === 'Reggae' ? 'selected' : ''}>Reggae</option>
                                <option value="Jamaica Sports" ${market.category === 'Jamaica Sports' ? 'selected' : ''}>Jamaica Sports</option>
                                <option value="Caribbean Cricket" ${market.category === 'Caribbean Cricket' ? 'selected' : ''}>Caribbean Cricket</option>
                                <option value="Jamaica Business" ${market.category === 'Jamaica Business' ? 'selected' : ''}>Jamaica Business</option>
                                <option value="JMD & Crypto" ${market.category === 'JMD & Crypto' ? 'selected' : ''}>JMD & Crypto</option>
                                <option value="Jamaican Culture" ${market.category === 'Jamaican Culture' ? 'selected' : ''}>Jamaican Culture</option>
                                <option value="Caribbean News" ${market.category === 'Caribbean News' ? 'selected' : ''}>Caribbean News</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-semibold mb-2">Market Image</label>
                            <div class="space-y-2">
                                <div id="editMarketImagePreview" class="w-full h-48 bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 overflow-hidden">
                                    ${market.image_url
                                        ? `<img src="${market.image_url}" class="w-full h-full object-cover">`
                                        : '<span>No image selected</span>'
                                    }
                                </div>
                                <input type="file" id="editMarketImageInput" accept="image/*"
                                       class="block w-full text-sm text-gray-400
                                       file:mr-4 file:py-2 file:px-4
                                       file:rounded file:border-0
                                       file:text-sm file:font-semibold
                                       file:bg-green-600 file:text-white
                                       hover:file:bg-green-700 file:cursor-pointer cursor-pointer">
                                <p class="text-xs text-gray-400">Upload a new image or keep existing (max 5MB). Recommended: 400x200px</p>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold mb-2">YES Price *</label>
                                <input type="number" name="yes_price" step="0.01" min="0" max="1" value="${market.yes_price}" required
                                       class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500">
                                <p class="text-xs text-gray-400 mt-1">0.00 - 1.00 (50% = 0.50)</p>
                            </div>

                            <div>
                                <label class="block text-sm font-semibold mb-2">End Date *</label>
                                <input type="datetime-local" name="end_date" required value="${formattedEndDate}"
                                       class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500">
                            </div>
                        </div>

                        <div class="flex gap-3 pt-4">
                            <button type="submit"
                                    class="flex-1 px-6 py-3 rounded-lg font-bold text-white transition"
                                    style="background-color: #027A40;"
                                    onmouseover="this.style.backgroundColor='#00e5af'"
                                    onmouseout="this.style.backgroundColor='#00CB97'">
                                Update Market
                            </button>
                            <button type="button" onclick="this.closest('.fixed').remove()"
                                    class="px-6 py-3 rounded-lg font-bold text-gray-400 border border-gray-600 hover:bg-gray-700 transition">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            `;

            document.body.appendChild(modal);

            // Handle image preview
            const imageInput = document.getElementById('editMarketImageInput');
            const imagePreview = document.getElementById('editMarketImagePreview');

            imageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                // Validate file size (5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('Image size must be less than 5MB');
                    e.target.value = '';
                    return;
                }

                // Validate file type
                if (!file.type.startsWith('image/')) {
                    alert('Please select an image file');
                    e.target.value = '';
                    return;
                }

                // Show preview
                const reader = new FileReader();
                reader.onload = (event) => {
                    imagePreview.innerHTML = `<img src="${event.target.result}" class="w-full h-full object-cover">`;
                };
                reader.readAsDataURL(file);
            });

            // Handle form submission
            document.getElementById('editMarketForm').addEventListener('submit', async (e) => {
                e.preventDefault();

                const submitBtn = e.target.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;

                try {
                    // Show loading state
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<div class="skeleton skeleton-inline-sm inline-block mr-2"></div>Updating...';

                    const formData = new FormData(e.target);
                    let imageUrl = market.image_url; // Keep existing image by default

                    // Upload new image if selected
                    if (imageInput.files.length > 0) {
                        const file = imageInput.files[0];
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                        const { data: uploadData, error: uploadError } = await this.api.db.storage
                            .from('market-images')
                            .upload(fileName, file, {
                                cacheControl: '3600',
                                upsert: false
                            });

                        if (uploadError) throw uploadError;

                        // Get public URL
                        const { data: urlData } = this.api.db.storage
                            .from('market-images')
                            .getPublicUrl(fileName);

                        imageUrl = urlData.publicUrl;
                    }

                    const marketData = {
                        title: formData.get('title'),
                        description: formData.get('description'),
                        category: formData.get('category'),
                        image_url: imageUrl,
                        yes_price: parseFloat(formData.get('yes_price')),
                        no_price: 1 - parseFloat(formData.get('yes_price')),
                        end_date: formData.get('end_date')
                    };

                    const { error } = await this.api.db
                        .from('markets')
                        .update(marketData)
                        .eq('id', marketId);

                    if (error) throw error;

                    alert('Market updated successfully!');
                    modal.remove();
                    this.render(); // Refresh the view

                    // Close the market detail modal if it's open
                    const detailModal = document.querySelector('.modal-backdrop');
                    if (detailModal) detailModal.remove();
                } catch (error) {
                    alert('Error updating market: ' + error.message);
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        } catch (error) {
            alert('Error loading market: ' + error.message);
        }
    }

    showCreateMarketModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold" style="color: #027A40;">Create New Market</h2>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white transition">
                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <form id="createMarketForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold mb-2">Title *</label>
                        <input type="text" name="title" required
                               class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                               placeholder="Will Bitcoin reach $100k in 2025?">
                    </div>

                    <div>
                        <label class="block text-sm font-semibold mb-2">Description</label>
                        <textarea name="description" rows="3"
                                  class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                                  placeholder="Market details and resolution criteria..."></textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-semibold mb-2">Category *</label>
                        <select name="category" required
                                class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500">
                            <option value="">Select category</option>
                            <option value="Jamaican Parliament">Jamaican Parliament</option>
                            <option value="Dancehall">Dancehall</option>
                            <option value="Reggae">Reggae</option>
                            <option value="Jamaica Sports">Jamaica Sports</option>
                            <option value="Caribbean Cricket">Caribbean Cricket</option>
                            <option value="Jamaica Business">Jamaica Business</option>
                            <option value="JMD & Crypto">JMD & Crypto</option>
                            <option value="Jamaican Culture">Jamaican Culture</option>
                            <option value="Caribbean News">Caribbean News</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-semibold mb-2">Market Image (optional)</label>
                        <div class="space-y-2">
                            <div id="marketImagePreview" class="w-full h-48 bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 overflow-hidden">
                                <span>No image selected</span>
                            </div>
                            <input type="file" id="marketImageInput" accept="image/*"
                                   class="block w-full text-sm text-gray-400
                                   file:mr-4 file:py-2 file:px-4
                                   file:rounded file:border-0
                                   file:text-sm file:font-semibold
                                   file:bg-green-600 file:text-white
                                   hover:file:bg-green-700 file:cursor-pointer cursor-pointer">
                            <p class="text-xs text-gray-400">Upload an image for this market (max 5MB). Recommended: 400x200px</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-semibold mb-2">Initial YES Price *</label>
                            <input type="number" name="yes_price" step="0.01" min="0" max="1" value="0.50" required
                                   class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500">
                            <p class="text-xs text-gray-400 mt-1">0.00 - 1.00 (50% = 0.50)</p>
                        </div>

                        <div>
                            <label class="block text-sm font-semibold mb-2">End Date *</label>
                            <input type="datetime-local" name="end_date" required
                                   class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500">
                        </div>
                    </div>

                    <div class="flex gap-3 pt-4">
                        <button type="submit"
                                class="flex-1 px-6 py-3 rounded-lg font-bold text-white transition"
                                style="background-color: #027A40;"
                                onmouseover="this.style.backgroundColor='#00e5af'"
                                onmouseout="this.style.backgroundColor='#00CB97'">
                            Create Market
                        </button>
                        <button type="button" onclick="this.closest('.fixed').remove()"
                                class="px-6 py-3 rounded-lg font-bold text-gray-400 border border-gray-600 hover:bg-gray-700 transition">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle image preview
        const imageInput = document.getElementById('marketImageInput');
        const imagePreview = document.getElementById('marketImagePreview');

        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size must be less than 5MB');
                e.target.value = '';
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                e.target.value = '';
                return;
            }

            // Show preview
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.innerHTML = `<img src="${event.target.result}" class="w-full h-full object-cover">`;
            };
            reader.readAsDataURL(file);
        });

        // Handle form submission
        document.getElementById('createMarketForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;

            try {
                // Show loading state
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<div class="skeleton skeleton-inline-sm inline-block mr-2"></div>Creating...';

                const formData = new FormData(e.target);
                let imageUrl = null;

                // Upload image if selected
                if (imageInput.files.length > 0) {
                    const file = imageInput.files[0];
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                    const { data: uploadData, error: uploadError } = await this.api.db.storage
                        .from('market-images')
                        .upload(fileName, file, {
                            cacheControl: '3600',
                            upsert: false
                        });

                    if (uploadError) throw uploadError;

                    // Get public URL
                    const { data: urlData } = this.api.db.storage
                        .from('market-images')
                        .getPublicUrl(fileName);

                    imageUrl = urlData.publicUrl;
                }

                const marketData = {
                    title: formData.get('title'),
                    description: formData.get('description'),
                    category: formData.get('category'),
                    image_url: imageUrl,
                    yes_price: parseFloat(formData.get('yes_price')),
                    no_price: 1 - parseFloat(formData.get('yes_price')),
                    end_date: formData.get('end_date'),
                    status: 'active',
                    total_volume: 0
                };

                const { data, error } = await this.api.db
                    .from('markets')
                    .insert([marketData])
                    .select()
                    .single();

                if (error) throw error;

                alert('Market created successfully!');
                modal.remove();
                this.render(); // Refresh the view
            } catch (error) {
                alert('Error creating market: ' + error.message);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
}

// Initialize app when DOM is ready
let app;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new GoatMouth();
        window.app = app; // Expose for debugging

        // Check if redirected from voting page to show login
        if (window.location.hash === '#login') {
            setTimeout(() => {
                if (app && app.showAuthModal) {
                    app.showAuthModal('login');
                    // Remove hash from URL
                    history.replaceState(null, null, ' ');
                }
            }, 500);
        }
    });
} else {
    app = new GoatMouth();
    window.app = app;

    // Check if redirected from voting page to show login
    if (window.location.hash === '#login') {
        setTimeout(() => {
            if (app && app.showAuthModal) {
                app.showAuthModal('login');
                // Remove hash from URL
                history.replaceState(null, null, ' ');
            }
        }, 500);
    }
}
