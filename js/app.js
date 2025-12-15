// Main Application Controller
class GoatMouth {
    constructor() {
        this.api = null;
        this.currentUser = null;
        this.currentView = 'markets';
        this.currentCategory = 'all';
        this.isMobile = this.detectMobile();
        this.mobileMenuOpen = false;
        this.mobileSearch = null;
        this.bannerCarousel = null;
        this.marketOffset = 0; // For pagination
        this.marketsPerPage = 25; // 5x5 grid
        this.init();
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

        // Full render (updates auth state in header and renders content)
        this.render();

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
        // Check if URL contains auth tokens (from email verification)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        if (accessToken && type === 'signup') {
            // Email was verified! Clean up URL and show success message
            window.history.replaceState({}, document.title, window.location.pathname);

            // Show welcome message
            setTimeout(() => {
                this.showWelcomeMessage();
            }, 1000);
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

                // Redirect admin to admin panel
                if (this.currentProfile.role === 'admin' && !window.location.pathname.includes('admin.html')) {
                    // Optional: comment this out if you want admins to access main app too
                    // window.location.href = 'admin.html';
                }

                // Update header with user info
                this.updateUserInfo();
            }
        } catch (error) {
            console.log('No user logged in');
        }
    }

    async onSignIn(user) {
        this.currentUser = user;
        this.currentProfile = await this.api.getProfile(user.id);

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
                this.showAuthModal();
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
        const isAuth = !!this.currentUser;
        const isOnIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '';

        // Mobile Navigation
        if (this.isMobile) {

            mainNav.innerHTML = `
                <!-- Mobile Header - Redesigned -->
                <div class="mobile-header bg-gray-900 border-b border-gray-800">
                    <!-- Top Bar -->
                    <div class="flex items-center justify-between px-3 py-2">
                        <!-- Logo -->
                        ${isOnIndexPage ? `
                            <div class="flex-shrink-0 cursor-pointer" data-nav="markets">
                                <img src="assets/mainlogo.png" alt="GoatMouth" class="mobile-logo logo-no-bg" style="height: 100px; width: 100px;">
                            </div>
                        ` : `
                            <a href="index.html" class="flex-shrink-0 cursor-pointer">
                                <img src="assets/mainlogo.png" alt="GoatMouth" class="mobile-logo logo-no-bg" style="height: 100px; width: 100px;">
                            </a>
                        `}

                        <!-- Right Actions -->
                        <div class="flex items-center gap-2">
                            ${isAuth ? `
                                <!-- Balance -->
                                <div class="px-2 py-1 rounded-lg border" style="background: rgba(0, 203, 151, 0.1); border-color: rgba(0, 203, 151, 0.3); max-width: 85px; overflow: hidden;">
                                    <span class="text-xs font-bold whitespace-nowrap" style="color: #00CB97; display: block; overflow: hidden; text-overflow: ellipsis;" id="mobile-user-balance">$0.00</span>
                                </div>
                            ` : `
                                <!-- Login & Sign Up Buttons -->
                                <button class="px-2 py-1.5 rounded-lg font-semibold text-xs border touch-target" style="border-color: #00CB97; color: #00CB97; min-height: 32px;" data-action="connect">Login</button>
                                <button class="px-2 py-1.5 rounded-lg font-semibold text-xs touch-target" style="background: #00CB97; color: white; min-height: 32px;" data-action="connect">Sign Up</button>
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
                        <div class="flex items-center gap-3 mb-6 pb-6 border-b-2" style="border-color: rgba(0, 203, 151, 0.2);">
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
                                <svg class="w-5 h-5" style="color: #00CB97;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                <svg class="w-5 h-5" style="color: #00CB97;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <span class="font-semibold" style="color: #00CB97;">Community Voting</span>
                            </a>
                            <a href="how-it-works.html" class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition touch-target" onclick="app.toggleMobileMenu()">
                                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <span class="font-semibold text-gray-300">How It Works</span>
                            </a>
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
                        ${isAuth ? `
                            <button class="mobile-nav-item" onclick="app.toggleMobileMenu()">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7"/>
                                </svg>
                                <span>More</span>
                            </button>
                        ` : `
                            <a href="how-it-works.html" class="mobile-nav-item">
                                <img src="assets/info.png" alt="Info">
                                <span>Info</span>
                            </a>
                        `}
                    </div>
                </nav>
            `;

            // Append bottom nav to body
            document.body.appendChild(bottomNav.firstElementChild);
            return;
        }

        // Desktop Navigation
        mainNav.innerHTML = `
            <div class="container mx-auto px-4 py-1 flex items-center justify-between gap-6">
                <!-- Left: Logo -->
                ${isOnIndexPage ? `
                    <div class="flex-shrink-0 cursor-pointer" data-nav="markets">
                        <img src="assets/mainlogo.png" alt="GoatMouth" style="height: 120px; width: 120px;" class="logo-no-bg">
                    </div>
                ` : `
                    <a href="index.html" class="flex-shrink-0 cursor-pointer">
                        <img src="assets/mainlogo.png" alt="GoatMouth" style="height: 120px; width: 120px;" class="logo-no-bg">
                    </a>
                `}

                <!-- Center: Search -->
                <div class="flex-1 max-w-3xl">
                    <div class="relative">
                        <input
                            type="text"
                            placeholder="Search GoatMouth Market..."
                            class="w-full px-5 py-2.5 pl-12 bg-gray-800 border-2 rounded-xl text-base focus:outline-none shadow-lg" style="border-color: #00CB97; box-shadow: 0 4px 14px 0 rgba(0, 203, 151, 0.15);" onfocus="this.style.boxShadow='0 4px 20px 0 rgba(0, 203, 151, 0.3)'; this.style.borderColor='#00CB97'" onblur="this.style.boxShadow='0 4px 14px 0 rgba(0, 203, 151, 0.15)'; this.style.borderColor='#00CB97'"
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
                             style="background: linear-gradient(135deg, rgba(0, 203, 151, 0.15) 0%, rgba(0, 203, 151, 0.05) 100%);
                                    border-color: rgba(0, 203, 151, 0.3);
                                    backdrop-filter: blur(10px);">
                            <div class="flex items-center gap-2.5">
                                <div class="flex items-center justify-center w-8 h-8 rounded-lg"
                                     style="background: linear-gradient(135deg, #00CB97 0%, #00e5af 100%);">
                                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                                    </svg>
                                </div>
                                <div class="flex flex-col" style="min-width: 0;">
                                    <span class="text-xs font-medium tracking-wide" style="color: rgba(0, 203, 151, 0.8);">BALANCE</span>
                                    <span class="text-lg font-bold leading-none tracking-tight whitespace-nowrap" style="color: #00CB97; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 120px;" id="desktop-user-balance">$0.00</span>
                                </div>
                            </div>
                        </div>

                        <!-- User Profile Dropdown -->
                        <div class="relative profile-dropdown">
                            <button class="group relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl border-2 transition-all duration-300 hover:scale-105 overflow-hidden"
                                    style="background: linear-gradient(135deg, rgba(0, 203, 151, 0.08) 0%, rgba(99, 27, 221, 0.08) 100%);
                                           border-color: rgba(0, 203, 151, 0.3);
                                           backdrop-filter: blur(10px);"
                                    data-action="toggle-profile"
                                    onmouseover="this.style.borderColor='rgba(0, 203, 151, 0.6)'; this.style.boxShadow='0 0 20px rgba(0, 203, 151, 0.3)'"
                                    onmouseout="this.style.borderColor='rgba(0, 203, 151, 0.3)'; this.style.boxShadow='none'">
                                <div class="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-300 group-hover:scale-110"
                                     style="background: linear-gradient(135deg, #00CB97 0%, #631BDD 100%);">
                                    <svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                    </svg>
                                </div>
                                <span class="font-bold text-white tracking-tight" id="user-name">User</span>
                                <svg class="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" style="color: #00CB97;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </button>

                            <!-- Dropdown Menu -->
                            <div class="profile-menu hidden absolute right-0 mt-3 w-72 rounded-2xl border-2 shadow-2xl z-50 overflow-hidden"
                                 style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
                                        border-color: rgba(0, 203, 151, 0.2);
                                        backdrop-filter: blur(20px);
                                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 203, 151, 0.1);">
                                <!-- Header -->
                                <div class="p-5 border-b-2" style="background: linear-gradient(135deg, rgba(0, 203, 151, 0.12) 0%, rgba(99, 27, 221, 0.12) 100%);
                                                                    border-color: rgba(0, 203, 151, 0.15);">
                                    <div class="flex items-center gap-3.5">
                                        <div class="relative flex-shrink-0">
                                            <div class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white ring-2 ring-offset-2 ring-offset-gray-800 transition-all duration-300"
                                                 style="background: linear-gradient(135deg, #00CB97 0%, #631BDD 100%);
                                                        ring-color: rgba(0, 203, 151, 0.4);">
                                                <span id="user-avatar-initial">U</span>
                                            </div>
                                            <div class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-gray-800"
                                                 style="background: #00CB97;"></div>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <p class="font-bold text-base text-white truncate tracking-tight" id="user-name-dropdown">User</p>
                                            <p class="text-xs font-medium truncate mt-0.5" style="color: rgba(0, 203, 151, 0.8);" id="user-email">user@email.com</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Menu Items -->
                                <div class="py-2">
                                    <a href="#" class="group flex items-center gap-3.5 px-5 py-3 transition-all duration-200 relative overflow-hidden"
                                       data-nav="profile"
                                       onmouseover="this.style.background='linear-gradient(90deg, rgba(0, 203, 151, 0.15) 0%, rgba(0, 203, 151, 0.05) 100%)'"
                                       onmouseout="this.style.background='transparent'">
                                        <div class="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200"
                                             style="background: rgba(0, 203, 151, 0.1);">
                                            <svg class="h-4.5 w-4.5 transition-all duration-200" style="color: #00CB97;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                            </svg>
                                        </div>
                                        <span class="font-semibold text-sm text-gray-200 tracking-tight">Your Profile</span>
                                    </a>
                                    <a href="#" class="group flex items-center gap-3.5 px-5 py-3 transition-all duration-200 relative overflow-hidden"
                                       data-action="edit-profile"
                                       onmouseover="this.style.background='linear-gradient(90deg, rgba(0, 203, 151, 0.15) 0%, rgba(0, 203, 151, 0.05) 100%)'"
                                       onmouseout="this.style.background='transparent'">
                                        <div class="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200"
                                             style="background: rgba(0, 203, 151, 0.1);">
                                            <svg class="h-4.5 w-4.5 transition-all duration-200" style="color: #00CB97;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <button class="px-8 py-4 text-lg font-bold rounded-xl transition" style="color: #00CB97;" onmouseover="this.style.backgroundColor='rgba(0, 203, 151, 0.1)'" onmouseout="this.style.backgroundColor='transparent'" data-action="connect">Log In</button>
                        <button class="px-8 py-4 rounded-xl font-bold text-lg transition text-white" style="background-color: #00CB97;" onmouseover="this.style.backgroundColor='#00e5af'" onmouseout="this.style.backgroundColor='#00CB97'" data-action="connect">Sign Up</button>
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
                <div class="category-nav-mobile border-t border-gray-800 bg-gray-900" style="position: sticky; top: 0; z-index: 40;">
                    <div class="flex gap-3 overflow-x-auto px-4 py-3" style="-webkit-overflow-scrolling: touch; scrollbar-width: none; -ms-overflow-style: none;">
                        <a href="#" class="mobile-card whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition active:scale-95 ${this.currentCategory === 'all' && this.currentView === 'markets' ? 'category-active' : ''}"
                           style="background: ${this.currentCategory === 'all' && this.currentView === 'markets' ? '#00CB97' : 'rgba(0, 203, 151, 0.1)'};
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
                        <a href="#" class="mobile-card whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition active:scale-95 ${this.currentView === 'voting' ? 'category-active' : ''}"
                           style="background: ${this.currentView === 'voting' ? '#00CB97' : 'rgba(0, 203, 151, 0.1)'};
                                  color: ${this.currentView === 'voting' ? 'white' : '#00CB97'};
                                  border: 1px solid ${this.currentView === 'voting' ? '#00CB97' : 'transparent'};"
                           data-nav="voting">
                            Voting
                        </a>
                        <a href="#" class="mobile-card whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition active:scale-95"
                           style="background: ${this.currentCategory === 'Politics' ? '#00CB97' : 'rgba(0, 203, 151, 0.1)'};
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
                           style="background: ${this.currentCategory === 'Crypto' ? '#00CB97' : 'rgba(0, 203, 151, 0.1)'};
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
                           style="background: ${this.currentCategory === 'Culture' ? '#00CB97' : 'rgba(0, 203, 151, 0.1)'};
                                  color: ${this.currentCategory === 'Culture' ? 'white' : '#00CB97'};
                                  border: 1px solid ${this.currentCategory === 'Culture' ? '#00CB97' : 'transparent'};"
                           data-category="Culture">Culture</a>
                    </div>
                </div>
                <!-- Search Bar - Below Category Nav -->
                <div class="px-3 py-2 bg-gray-900 border-b border-gray-800" id="mobile-search-bar" style="display: block !important; visibility: visible !important;">
                    <div class="relative">
                        <input type="text" id="mobile-search-input" placeholder="Search markets..." class="w-full px-3 py-2.5 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-green-500" style="font-size: 16px;">
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
                    <div class="flex items-center justify-evenly overflow-x-auto">
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
                </div>
            `;
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

    async renderContent() {
        const app = document.getElementById('app');

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
            default:
                app.innerHTML = '<p>View not found</p>';
        }
    }

    async renderMarkets(container) {
        container.innerHTML = `
            <div class="inline-loader">
                <div class="spinner-container">
                    <div class="spinner-glow"></div>
                    <div class="spinner-text">Loading markets...</div>
                </div>
            </div>
        `;

        try {
            let filters = { status: 'active' };

            // Add category filter if not "all"
            if (this.currentCategory && this.currentCategory !== 'all') {
                filters.category = this.currentCategory;
            }

            const allMarkets = await this.api.getMarkets(filters);
            const markets = allMarkets;

            if (markets.length === 0) {
                const categoryText = this.currentCategory === 'all' ? '' : ` in ${this.currentCategory}`;
                container.innerHTML = `
                    <div class="text-center py-12">
                        <p class="text-gray-400 mb-4">No active markets${categoryText}</p>
                        ${this.currentCategory !== 'all' ? '<button class="px-4 py-2 rounded-lg text-white transition" style="background-color: #631BDD;" onmouseover="this.style.backgroundColor=\'#7a2ef0\'" onmouseout="this.style.backgroundColor=\'#631BDD\'" onclick="app.filterByCategory(\'all\')">View All Markets</button>' : ''}
                        ${this.currentProfile && this.currentProfile.role === 'admin' ? '<button class="px-4 py-2 rounded-lg text-white transition ml-2" style="background-color: #00CB97;" onmouseover="this.style.backgroundColor=\'#00e5af\'" onmouseout="this.style.backgroundColor=\'#00CB97\'" onclick="app.showCreateMarketModal()">Create Market</button>' : ''}
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
                ${this.currentCategory === 'all' ? '<div id="banner-container"></div>' : ''}

                ${this.currentProfile && this.currentProfile.role === 'admin' ? `
                    <div class="mb-6 flex justify-end">
                        <button class="px-4 py-2 rounded-lg text-white transition" style="background-color: #00CB97;" onmouseover="this.style.backgroundColor='#00e5af'" onmouseout="this.style.backgroundColor='#00CB97'" onclick="app.showCreateMarketModal()">Create Market</button>
                    </div>
                ` : ''}

                <!-- Responsive Grid Container -->
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
                    ${displayedMarkets.map(market => this.renderMarketCard(market)).join('')}
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
                                    style="background-color: #00CB97;"
                                    onmouseover="this.style.backgroundColor='#00e5af'"
                                    onmouseout="this.style.backgroundColor='#00CB97'"
                                    onclick="app.nextPage()">
                                Next →
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            `;

            // Initialize banner carousel (only on "all" category)
            if (this.currentCategory === 'all') {
                const bannerContainer = document.getElementById('banner-container');
                if (bannerContainer && window.BannerCarousel) {
                    this.bannerCarousel = new BannerCarousel(this);
                    await this.bannerCarousel.loadBanners();
                    this.bannerCarousel.render(bannerContainer);
                }
            }
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
            // Mobile card with visual indicators
            return `
                <div class="mobile-card bg-gray-800 rounded-xl overflow-hidden border border-gray-700 touch-target"
                     onclick="app.showMarketDetail('${market.id}')"
                     style="box-shadow: 0 2px 8px rgba(0,0,0,0.3); transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);"
                     ontouchstart="this.style.transform='scale(0.97)'; this.style.boxShadow='0 1px 4px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(0, 203, 151, 0.3)'; this.style.borderColor='rgba(0, 203, 151, 0.4)';"
                     ontouchend="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.3)'; this.style.borderColor='rgb(55, 65, 81)';"
                     ontouchcancel="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.3)'; this.style.borderColor='rgb(55, 65, 81)';">

                    <!-- Colored Top Bar -->
                    <div style="height: 4px; background: linear-gradient(90deg, #00CB97 0%, #00CB97 ${yesPercent}%, #ef4444 ${yesPercent}%, #ef4444 100%);"></div>

                    <div class="p-4">
                        <!-- Category Badge -->
                        ${market.category ? `
                            <div class="mb-3">
                                <span class="text-xs px-2.5 py-1 rounded-full font-semibold" style="background-color: rgba(0, 203, 151, 0.15); color: #00CB97;">${market.category}</span>
                            </div>
                        ` : ''}

                        <!-- Title -->
                        <h3 class="text-base font-bold mb-4 leading-tight line-clamp-2" style="color: #ffffff;">${market.title}</h3>

                        <!-- Visual Odds Display -->
                        <div class="flex items-center justify-between mb-4">
                            <!-- YES Side -->
                            <div class="flex-1 text-center">
                                <div class="mb-2">
                                    <div class="text-3xl font-black" style="color: #00CB97;">${yesPercent}%</div>
                                    <div class="text-xs font-semibold uppercase tracking-wider mt-1" style="color: #00CB97;">YES</div>
                                </div>
                            </div>

                            <!-- Divider with VS -->
                            <div class="px-3">
                                <div class="text-xs font-bold text-gray-500">VS</div>
                            </div>

                            <!-- NO Side -->
                            <div class="flex-1 text-center">
                                <div class="mb-2">
                                    <div class="text-3xl font-black" style="color: #ef4444;">${noPercent}%</div>
                                    <div class="text-xs font-semibold uppercase tracking-wider mt-1" style="color: #ef4444;">NO</div>
                                </div>
                            </div>
                        </div>

                        <!-- Animated Progress Bar -->
                        <div class="w-full bg-gray-900 rounded-full h-2 overflow-hidden mb-4" style="box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);">
                            <div class="h-full transition-all duration-500 ease-out"
                                 style="width: ${yesPercent}%; background: linear-gradient(90deg, #00CB97 0%, #00e5af 100%); box-shadow: 0 0 8px rgba(0, 203, 151, 0.5);"></div>
                        </div>

                        <!-- Footer Info -->
                        <div class="flex items-center justify-between text-xs">
                            <div class="flex items-center gap-1.5 px-2 py-1 rounded-md" style="background: rgba(0, 203, 151, 0.1);">
                                <svg class="h-3.5 w-3.5" style="color: #00CB97;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                </svg>
                                <span class="font-bold" style="color: #00CB97;">J$${parseFloat(market.total_volume).toLocaleString()}</span>
                            </div>
                            <div class="flex items-center gap-1.5 text-gray-400">
                                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <span class="font-medium">${timeLeft}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Desktop card - Compact 5-column layout
            return `
                <div class="bg-gray-800 rounded-lg overflow-hidden cursor-pointer border border-gray-700"
                     onclick="app.showMarketDetail('${market.id}')"
                     style="box-shadow: 0 1px 3px rgba(0,0,0,0.2); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);"
                     onmouseover="this.style.boxShadow='0 8px 24px rgba(0, 203, 151, 0.15), 0 4px 12px rgba(0,0,0,0.4)'; this.style.transform='translateY(-4px) scale(1.01)'; this.style.borderColor='rgba(0, 203, 151, 0.5)';"
                     onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.2)'; this.style.transform='translateY(0) scale(1)'; this.style.borderColor='rgb(55, 65, 81)';"
                     onmousedown="this.style.transform='translateY(-2px) scale(0.99)'; this.style.boxShadow='0 4px 12px rgba(0, 203, 151, 0.2)';"
                     onmouseup="this.style.transform='translateY(-4px) scale(1.01)'; this.style.boxShadow='0 8px 24px rgba(0, 203, 151, 0.15), 0 4px 12px rgba(0,0,0,0.4)';">

                    <!-- Colored Top Bar -->
                    <div style="height: 3px; background: linear-gradient(90deg, #00CB97 0%, #00CB97 ${yesPercent}%, #ef4444 ${yesPercent}%, #ef4444 100%);"></div>

                    <!-- Image Placeholder -->
                    ${market.image_url ? `
                        <div style="height: 100px; background: url('${market.image_url}') center/cover; position: relative;">
                            <div style="position: absolute; top: 8px; left: 8px;">
                                ${market.category ? `<span class="text-xs px-2 py-1 rounded-full font-semibold" style="background-color: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px); color: #00CB97; border: 1px solid rgba(0, 203, 151, 0.3); font-size: 10px;">${market.category}</span>` : ''}
                            </div>
                        </div>
                    ` : `
                        <div style="height: 100px; background: linear-gradient(135deg, #1f2937 0%, #111827 100%); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
                            <div style="position: absolute; inset: 0; opacity: 0.03; background-image: radial-gradient(circle, #00CB97 1px, transparent 1px); background-size: 15px 15px;"></div>
                            <div style="position: absolute; top: 8px; left: 8px;">
                                ${market.category ? `<span class="text-xs px-2 py-1 rounded-full font-semibold" style="background-color: rgba(0, 203, 151, 0.15); color: #00CB97; border: 1px solid rgba(0, 203, 151, 0.3); font-size: 10px;">${market.category}</span>` : ''}
                            </div>
                            <svg width="60" height="60" style="transform: rotate(-90deg);">
                                <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3"/>
                                <circle cx="30" cy="30" r="26" fill="none" stroke="#00CB97" stroke-width="3"
                                        stroke-dasharray="${2 * Math.PI * 26}"
                                        stroke-dashoffset="${2 * Math.PI * 26 - (yesPercent / 100) * 2 * Math.PI * 26}"
                                        stroke-linecap="round"
                                        style="filter: drop-shadow(0 0 4px rgba(0, 203, 151, 0.6)); transition: stroke-dashoffset 0.5s ease;"/>
                                <text x="30" y="30" text-anchor="middle" dy="5" font-size="16" font-weight="bold" fill="#00CB97" transform="rotate(90 30 30)">${yesPercent}%</text>
                            </svg>
                        </div>
                    `}

                    <div class="p-3">
                        <!-- Title -->
                        <h3 class="text-sm font-bold mb-2 leading-tight line-clamp-2" style="color: #ffffff; min-height: 40px;">${market.title}</h3>

                        <!-- Visual Odds Display -->
                        <div class="flex items-stretch mb-2 rounded-md overflow-hidden" style="height: 50px;">
                            <div class="flex-1 flex flex-col items-center justify-center" style="background: linear-gradient(135deg, rgba(0, 203, 151, 0.15) 0%, rgba(0, 203, 151, 0.05) 100%); border-right: 1px solid rgba(0, 203, 151, 0.2);">
                                <div class="text-2xl font-black" style="color: #00CB97; text-shadow: 0 0 15px rgba(0, 203, 151, 0.3);">${yesPercent}%</div>
                                <div class="text-xs font-bold uppercase" style="color: #00CB97; opacity: 0.7; font-size: 9px;">YES</div>
                            </div>
                            <div class="flex-1 flex flex-col items-center justify-center" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%);">
                                <div class="text-2xl font-black" style="color: #ef4444; text-shadow: 0 0 15px rgba(239, 68, 68, 0.3);">${noPercent}%</div>
                                <div class="text-xs font-bold uppercase" style="color: #ef4444; opacity: 0.7; font-size: 9px;">NO</div>
                            </div>
                        </div>

                        <!-- Progress Bar -->
                        <div class="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden mb-2" style="box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);">
                            <div class="h-full transition-all duration-500 ease-out"
                                 style="width: ${yesPercent}%; background: linear-gradient(90deg, #00CB97 0%, #00e5af 100%); box-shadow: 0 0 8px rgba(0, 203, 151, 0.5);"></div>
                        </div>

                        <!-- Footer -->
                        <div class="flex items-center justify-between text-xs">
                            <div class="flex items-center gap-1 px-2 py-1 rounded" style="background: rgba(0, 203, 151, 0.1);">
                                <svg class="h-3 w-3" style="color: #00CB97;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                </svg>
                                <span class="font-bold" style="color: #00CB97; font-size: 11px;">J$${parseFloat(market.total_volume/1000).toFixed(1)}K</span>
                            </div>
                            <div class="flex items-center gap-1 text-gray-400">
                                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <span class="font-medium" style="font-size: 11px;">${timeLeft}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
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

        container.innerHTML = `
            <div class="inline-loader">
                <div class="spinner-container">
                    <div class="spinner-glow"></div>
                    <div class="spinner-text">Loading portfolio...</div>
                </div>
            </div>
        `;

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

        container.innerHTML = `
            <div class="inline-loader">
                <div class="spinner-container">
                    <div class="spinner-glow"></div>
                    <div class="spinner-text">Loading activity...</div>
                </div>
            </div>
        `;

        try {
            const bets = await this.api.getUserBets(this.currentUser.id);

            container.innerHTML = `
                <h1 class="text-3xl font-bold mb-6">Your Activity</h1>
                ${bets.length === 0 ? '<p class="text-gray-400">No bets yet</p>' : `
                    <div class="space-y-3">
                        ${bets.map(bet => `
                            <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <h3 class="font-semibold mb-1">${bet.markets.title}</h3>
                                        <p class="text-sm text-gray-400">${new Date(bet.created_at).toLocaleString()}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-sm ${bet.outcome === 'yes' ? 'text-green-400' : 'text-red-400'} font-semibold">${bet.outcome.toUpperCase()}</p>
                                        <p class="text-sm">J$${parseFloat(bet.amount).toFixed(2)} @ ${(parseFloat(bet.price) * 100).toFixed(1)}¢</p>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            `;
        } catch (error) {
            container.innerHTML = `<div class="text-red-500">Error loading activity: ${error.message}</div>`;
        }
    }

    async renderProfile(container) {
        if (!this.currentUser) {
            container.innerHTML = '<p class="text-center py-8">Please sign in to view profile</p>';
            return;
        }

        container.innerHTML = `
            <div class="inline-loader">
                <div class="spinner-container">
                    <div class="spinner-glow"></div>
                    <div class="spinner-text">Loading profile...</div>
                </div>
            </div>
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
                                     style="background: linear-gradient(135deg, rgba(0, 203, 151, 0.1) 0%, rgba(0, 203, 151, 0.05) 100%);
                                            border-color: rgba(0, 203, 151, 0.3);">
                                    <div class="flex items-center gap-2 mb-1">
                                        <svg class="w-4 h-4" style="color: #00CB97;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                                        </svg>
                                        <p class="text-xs font-semibold tracking-wide" style="color: rgba(0, 203, 151, 0.8);">BALANCE</p>
                                    </div>
                                    <p class="text-2xl font-bold" style="color: #00CB97;">J$${parseFloat(this.currentProfile.balance).toFixed(2)}</p>
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
                        <button onclick="app.showEditProfileModal()" class="px-6 py-3 rounded-lg font-semibold text-white transition" style="background-color: #00CB97;" onmouseover="this.style.backgroundColor='#00e5af'" onmouseout="this.style.backgroundColor='#00CB97'">
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
                                            <p class="text-sm text-gray-400">Shares: ${parseFloat(pos.shares).toFixed(2)}</p>
                                            <p class="text-sm text-gray-400">Avg: ${(parseFloat(pos.avg_price) * 100).toFixed(1)}¢</p>
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
                    background: rgba(0, 203, 151, 0.1);
                    border: 1px solid rgba(0, 203, 151, 0.3);
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: 0.2s;
                    color: #00CB97;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }
                .vote-tab:hover {
                    background: rgba(0, 203, 151, 0.2);
                }
                .vote-tab.active {
                    background: #00CB97;
                    color: white;
                    border-color: #00CB97;
                }
                .admin-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 18px;
                    margin-top: 10px;
                }
                .admin-btn {
                    background: rgba(0, 203, 151, 0.1);
                    border: 1px solid rgba(0, 203, 151, 0.3);
                    border-radius: 10px;
                    padding: 20px 10px;
                    text-align: center;
                    font-weight: 600;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: 0.2s;
                    color: #00CB97;
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
                    background: rgba(0, 203, 151, 0.2);
                    border-color: #00CB97;
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
                                <div class="inline-loader">
                                    <div class="spinner-container">
                                        <div class="spinner-glow"></div>
                                        <div class="spinner-text">Loading proposals...</div>
                                    </div>
                                </div>
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

    showAuthModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
        modal.style.backdropFilter = 'blur(4px)';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-700">
                <!-- Logo -->
                <div class="text-center mb-6">
                    <img src="assets/mainlogo.png" alt="GoatMouth" class="mx-auto mb-4 logo-no-bg" style="height: 100px; width: 100px;">
                    <h2 class="text-2xl font-bold text-white mb-2">Welcome to GoatMouth</h2>
                    <p class="text-gray-400 text-sm">Sign in or create an account to start trading</p>
                </div>

                <!-- Tabs -->
                <div class="flex gap-3 mb-6">
                    <button id="login-tab" class="auth-tab active flex-1 px-4 py-3 rounded-lg font-semibold transition">
                        Sign In
                    </button>
                    <button id="signup-tab" class="auth-tab flex-1 px-4 py-3 rounded-lg font-semibold transition">
                        Sign Up
                    </button>
                </div>

                <!-- Error Message -->
                <div id="auth-error" class="hidden mb-4 p-3 bg-red-900 bg-opacity-20 border border-red-500 rounded-lg text-red-400 text-sm"></div>

                <!-- Login Form -->
                <form id="login-form" class="auth-form space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
                        <input
                            type="email"
                            id="login-email"
                            placeholder="you@example.com"
                            required
                            class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500 transition"
                        >
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
                        <div class="relative">
                            <input
                                type="password"
                                id="login-password"
                                placeholder="••••••••"
                                required
                                class="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500 transition"
                            >
                            <button type="button" class="toggle-password absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition" data-target="login-password">
                                <svg class="h-5 w-5 eye-open" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                </svg>
                                <svg class="h-5 w-5 eye-closed hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        class="w-full px-6 py-3 rounded-lg font-bold text-white transition mt-2"
                        style="background-color: #631BDD;"
                        onmouseover="this.style.backgroundColor='#7a2ef0'"
                        onmouseout="this.style.backgroundColor='#631BDD'"
                    >
                        Sign In
                    </button>
                </form>

                <!-- Signup Form -->
                <form id="signup-form" class="auth-form space-y-4 hidden">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Username</label>
                        <input
                            type="text"
                            id="signup-username"
                            placeholder="your_username"
                            required
                            class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500 transition"
                        >
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
                        <input
                            type="email"
                            id="signup-email"
                            placeholder="you@example.com"
                            required
                            class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500 transition"
                        >
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
                        <div class="relative">
                            <input
                                type="password"
                                id="signup-password"
                                placeholder="••••••••"
                                required
                                minlength="6"
                                class="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500 transition"
                            >
                            <button type="button" class="toggle-password absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition" data-target="signup-password">
                                <svg class="h-5 w-5 eye-open" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                </svg>
                                <svg class="h-5 w-5 eye-closed hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        class="w-full px-6 py-3 rounded-lg font-bold text-white transition mt-2"
                        style="background-color: #00CB97;"
                        onmouseover="this.style.backgroundColor='#00e5af'"
                        onmouseout="this.style.backgroundColor='#00CB97'"
                    >
                        Sign Up
                    </button>
                </form>

                <!-- Cancel -->
                <button
                    onclick="this.closest('.fixed').remove()"
                    class="w-full mt-4 text-gray-400 hover:text-white transition text-sm"
                >
                    Cancel
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Password toggle
        modal.querySelectorAll('.toggle-password').forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.dataset.target;
                const passwordInput = modal.querySelector(`#${targetId}`);
                const eyeOpen = button.querySelector('.eye-open');
                const eyeClosed = button.querySelector('.eye-closed');

                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    eyeOpen.classList.add('hidden');
                    eyeClosed.classList.remove('hidden');
                } else {
                    passwordInput.type = 'password';
                    eyeOpen.classList.remove('hidden');
                    eyeClosed.classList.add('hidden');
                }
            });
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
                modal.remove();
                this.init(); // Refresh app
            } catch (error) {
                errorDiv.textContent = error.message || 'Sign in failed. Please check your credentials.';
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
                    modal.remove();
                    this.init(); // Refresh app
                } catch (signInError) {
                    // Sign in failed (probably email verification required)
                    errorDiv.textContent = 'Account created! Please check your email for verification, then sign in.';
                    errorDiv.classList.remove('hidden', 'bg-red-900', 'border-red-500', 'text-red-400');
                    errorDiv.classList.add('bg-green-900', 'border-green-500', 'text-green-400');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Sign Up';
                    // Switch to login tab after 3 seconds
                    setTimeout(() => {
                        loginTab.click();
                    }, 3000);
                }
            } catch (error) {
                errorDiv.textContent = error.message || 'Sign up failed. Please try again.';
                errorDiv.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign Up';
            }
        });
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
                            style="background-color: #00CB97;"
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

            // Redirect to home page
            if (window.location.pathname.includes('admin.html')) {
                window.location.href = '/';
            } else {
                window.location.reload();
            }
        } catch (error) {
            console.error('Sign out error:', error);
            window.location.reload();
        }
    }

    showMarketDetail(marketId) {
        this.marketDetailModal = new MarketDetailModal(this, marketId);
        this.marketDetailModal.show();
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
                        <h2 class="text-2xl font-bold" style="color: #00CB97;">Edit Market</h2>
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
                                    style="background-color: #00CB97;"
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
                    // Show loading spinner
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<div class="spinner-glow inline-block w-5 h-5 mr-2"></div>Updating...';

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
                    <h2 class="text-2xl font-bold" style="color: #00CB97;">Create New Market</h2>
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
                                style="background-color: #00CB97;"
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
                // Show loading spinner
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<div class="spinner-glow inline-block w-5 h-5 mr-2"></div>Creating...';

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
    });
} else {
    app = new GoatMouth();
    window.app = app;
}
