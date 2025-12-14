// Main Application Controller
class GoatMouth {
    constructor() {
        this.api = null;
        this.currentUser = null;
        this.currentView = 'markets';
        this.currentCategory = 'all';
        this.marketSort = 'featured';
        this.isMobile = this.detectMobile();
        this.mobileMenuOpen = false;
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

            // Sorting chips
            if (e.target.matches('[data-sort]') || e.target.closest('[data-sort]')) {
                e.preventDefault();
                const sortEl = e.target.matches('[data-sort]') ? e.target : e.target.closest('[data-sort]');
                this.setMarketSort(sortEl.dataset.sort);
            }

            // Auth buttons
            if (e.target.matches('[data-action="connect"]')) {
                this.showAuthModal();
            }

            if (e.target.matches('[data-action="signout"]')) {
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
        this.render();
    }

    setMarketSort(sort) {
        this.marketSort = sort;
        this.currentView = 'markets';
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

        // Mobile Navigation
        if (this.isMobile) {
            mainNav.innerHTML = `
                <!-- Mobile Header - Redesigned -->
                <div class="mobile-header bg-gray-900 border-b border-gray-800">
                    <!-- Top Bar -->
                    <div class="flex items-center justify-between px-3 py-2">
                        <!-- Logo -->
                        <div class="flex-shrink-0 cursor-pointer" data-nav="markets">
                            <img src="assets/mainlogo.png" alt="GoatMouth" class="mobile-logo logo-no-bg" style="height: 100px; width: 100px;">
                        </div>

                        <!-- Right Actions -->
                        <div class="flex items-center gap-2">
                            ${isAuth ? `
                                <!-- Balance -->
                                <div class="px-2.5 py-1.5 rounded-lg border" style="background: rgba(0, 203, 151, 0.1); border-color: rgba(0, 203, 151, 0.3);">
                                    <span class="text-xs font-bold" style="color: #00CB97;" id="user-balance">$0.00</span>
                                </div>
                            ` : ''}

                            <!-- How It Works -->
                            <a href="how-it-works.html" class="p-2 rounded-lg active:bg-gray-800 transition touch-target">
                                <img src="assets/info.png" alt="Info" class="h-7 w-7">
                            </a>

                            ${isAuth ? `
                                <!-- Hamburger Menu -->
                                <button class="p-2 rounded-lg active:bg-gray-800 transition touch-target" onclick="app.toggleMobileMenu()">
                                    <svg class="w-6 h-6" style="color: #00CB97;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16"/>
                                    </svg>
                                </button>
                            ` : `
                                <!-- Login & Sign Up Buttons -->
                                <button class="px-2.5 py-1.5 rounded-lg font-bold text-xs border-2" style="border-color: #00CB97; color: #00CB97;" data-action="connect">Login</button>
                                <button class="px-2.5 py-1.5 rounded-lg font-bold text-xs" style="background: #00CB97; color: white;" data-action="connect">Sign Up</button>
                            `}
                        </div>
                    </div>

                    <!-- Search Bar - Always Visible -->
                    <div class="px-3 pb-2">
                        <div class="relative">
                            <input type="text" placeholder="Search markets..." class="w-full px-3 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-gray-600" style="font-size: 14px;">
                            <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
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
                        <a href="#" class="mobile-nav-item active" data-nav="markets">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                            </svg>
                            <span>Home</span>
                        </a>
                        <a href="voting.html" class="mobile-nav-item">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span>Voting</span>
                        </a>
                        <button class="mobile-nav-item" onclick="document.querySelector('input[type=text]').focus()">
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
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
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
                <div class="flex-shrink-0 cursor-pointer" data-nav="markets">
                    <img src="assets/mainlogo.png" alt="GoatMouth" style="height: 120px; width: 120px;" class="logo-no-bg">
                </div>

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
                                <div class="flex flex-col">
                                    <span class="text-xs font-medium tracking-wide" style="color: rgba(0, 203, 151, 0.8);">BALANCE</span>
                                    <span class="text-lg font-bold leading-none tracking-tight" style="color: #00CB97;" id="user-balance">$0.00</span>
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
            document.getElementById('user-balance').textContent = `$${parseFloat(profile.balance).toFixed(2)}`;
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

            if (this.currentCategory && this.currentCategory !== 'all') {
                filters.category = this.currentCategory;
            }

            const allMarkets = await this.api.getMarkets(filters);

            const closingSoon = allMarkets.filter(market => {
                const end = new Date(market.end_date);
                const now = new Date();
                const diffDays = (end - now) / (1000 * 60 * 60 * 24);
                return diffDays > 0 && diffDays <= 3;
            }).length;

            const totalVolume = allMarkets.reduce((sum, market) => sum + parseFloat(market.total_volume || 0), 0);

            const sortedMarkets = [...allMarkets];
            switch (this.marketSort) {
                case 'ending':
                    sortedMarkets.sort((a, b) => new Date(a.end_date) - new Date(b.end_date));
                    break;
                case 'volume':
                    sortedMarkets.sort((a, b) => parseFloat(b.total_volume || 0) - parseFloat(a.total_volume || 0));
                    break;
                case 'recent': {
                    const toDate = (market) => new Date(market.created_at || market.start_date || market.end_date);
                    sortedMarkets.sort((a, b) => toDate(b) - toDate(a));
                    break;
                }
                default:
                    sortedMarkets.sort((a, b) => parseFloat(b.total_volume || 0) - parseFloat(a.total_volume || 0));
            }

            const markets = sortedMarkets;

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

            const categoryTitle = this.currentCategory === 'all' ? 'Active Markets' : `${this.currentCategory} Markets`;
            const heroMarket = markets[0];
            const topVolumeMarkets = [...markets].sort((a, b) => parseFloat(b.total_volume || 0) - parseFloat(a.total_volume || 0)).slice(0, 6);
            const endingSoonMarkets = [...markets]
                .filter(market => new Date(market.end_date) > new Date())
                .sort((a, b) => new Date(a.end_date) - new Date(b.end_date))
                .slice(0, 6);

            const sortChips = [
                { key: 'featured', label: 'Featured', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />' },
                { key: 'ending', label: 'Ending Soon', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />' },
                { key: 'volume', label: 'Highest Volume', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.002 9.002 0 1021 12h-9V3.055z" />' },
                { key: 'recent', label: 'Recently Added', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c1.657 0 3 .895 3 2s-1.343 2-3 2-3 .895-3 2 1.343 2 3 2m0-12v2m0 8v2m-6-6h2m8 0h2" />' }
            ].map(chip => `
                <button class="gm-chip ${this.marketSort === chip.key ? 'active' : ''}" data-sort="${chip.key}">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">${chip.icon}</svg>
                    ${chip.label}
                </button>
            `).join('');

            container.innerHTML = `
                <section class="pm-hero glass-panel mb-6">
                    <div class="pm-hero__grid">
                        <div class="space-y-4">
                            <div class="flex items-center gap-2">
                                <span class="pm-badge">${categoryTitle}</span>
                                <span class="pm-dot"></span>
                                <span class="text-gray-300 text-sm">Live, updated in real-time</span>
                            </div>
                            <h1 class="pm-hero__headline">Trade narratives like Polymarket and Kalshi</h1>
                            <p class="text-gray-300 text-base md:text-lg leading-relaxed max-w-2xl">We kept the GoatMouth energy but tightened the spacing, readability, and touch targets so it feels like the pro desks on Polymarket and Kalshi.</p>
                            <div class="pm-hero__actions">
                                <button class="pm-cta" data-action="connect">Connect to trade</button>
                                <button class="pm-ghost" data-nav="voting">View voting</button>
                                <div class="pm-quick-meta">
                                    <div>
                                        <p class="text-xs text-gray-400">Active markets</p>
                                        <p class="text-lg font-bold text-white">${markets.length}</p>
                                        <p class="text-[11px] text-gray-500">Live book-style pricing</p>
                                    </div>
                                    <div>
                                        <p class="text-xs text-gray-400">Closing soon</p>
                                        <p class="text-lg font-bold text-white">${closingSoon}</p>
                                        <p class="text-[11px] text-gray-500">Deadline heat pulled forward</p>
                                    </div>
                                    <div>
                                        <p class="text-xs text-gray-400">Total volume</p>
                                        <p class="text-lg font-bold text-white">$${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                        <p class="text-[11px] text-gray-500">24h traction tracker</p>
                                        <p class="text-lg font-bold">${markets.length}</p>
                                    </div>
                                    <div>
                                        <p class="text-xs text-gray-400">Closing soon</p>
                                        <p class="text-lg font-bold">${closingSoon}</p>
                                    </div>
                                    <div>
                                        <p class="text-xs text-gray-400">Total volume</p>
                                        <p class="text-lg font-bold">$${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="pm-hero__market">
                            <div class="pm-hero__card">
                                <div class="flex items-center justify-between mb-3">
                                    <div class="flex items-center gap-2">
                                        <span class="market-card__status">
                                            <span class="live-dot"></span>
                                            Live
                                        </span>
                                        ${heroMarket?.category ? `<span class="pm-pill">${heroMarket.category}</span>` : ''}
                                    </div>
                                    <span class="market-card__time">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        ${heroMarket ? this.getTimeLeft(heroMarket.end_date) : 'Fresh drop'}
                                    </span>
                                </div>
                                <p class="text-sm uppercase tracking-wide text-gray-400 mb-1">Featured market — Polymarket style depth</p>
                                <p class="text-sm uppercase tracking-wide text-gray-400 mb-1">Featured market</p>
                                <p class="text-xl font-bold leading-snug mb-4">${heroMarket?.title || 'Stay tuned for the next catalyst'}</p>
                                <div class="pm-price-row">
                                    <div class="pm-price-chip">
                                        <span class="label">Yes</span>
                                        <span class="value">${heroMarket ? (Number(heroMarket.yes_price ?? 0.5) * 100).toFixed(1) : '50.0'}%</span>
                                    </div>
                                    <div class="pm-price-chip no">
                                        <span class="label">No</span>
                                        <span class="value">${heroMarket ? (Number(heroMarket.no_price ?? 0.5) * 100).toFixed(1) : '50.0'}%</span>
                                    </div>
                                </div>
                                <div class="pm-hero__cta-row">
                                    <button class="pm-trade yes" onclick="app.showMarketDetail('${heroMarket?.id || ''}')">Trade Yes</button>
                                    <button class="pm-trade no" onclick="app.showMarketDetail('${heroMarket?.id || ''}')">Trade No</button>
                                </div>
                                <div class="pm-hero__meta">
                                    <span class="market-chip">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                        </svg>
                                        $${parseFloat(heroMarket?.total_volume || 0).toLocaleString()}
                                    </span>
                                    <span class="market-chip">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                        ${heroMarket ? this.getTimeLeft(heroMarket.end_date) : 'Open' }
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="pm-hero__filters">
                        <div class="pm-filter-chips">
                            ${sortChips}
                        </div>
                        <div class="pm-filter-context">
                            <span class="text-sm text-gray-300">Mirrors Polymarket’s dense layout: decisive typography, premium spacing, and rails that stay finger-friendly on mobile.</span>
                            <span>Streamlined for mobile: tighter gutters, larger tap areas, and a Polymarket-style card rail below.</span>
                        </div>
                    </div>
                </section>

                <section class="pm-rail glass-panel mb-6">
                    <div class="pm-rail__header">
                        <div>
                            <p class="text-sm text-gray-400">Top movers</p>
                            <h2 class="text-xl font-bold">Volume leaders right now</h2>
                        </div>
                        <div class="pm-rail__meta">
                            <span class="pm-pill">$${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })} total</span>
                            <span class="pm-pill">${closingSoon} ending soon</span>
                        </div>
                    </div>
                    <div class="market-rail" role="list">
                        ${topVolumeMarkets.map(market => this.renderRailCard(market)).join('')}
                    </div>
                </section>

                <section class="pm-rail glass-panel mb-6">
                    <div class="pm-rail__header">
                        <div>
                            <p class="text-sm text-gray-400">Deadline heat</p>
                            <h2 class="text-xl font-bold">Ending soon</h2>
                        </div>
                        <div class="pm-rail__meta">
                            <span class="pm-pill">${endingSoonMarkets.length} picks</span>
                        </div>
                    </div>
                    <div class="market-rail" role="list">
                        ${endingSoonMarkets.map(market => this.renderRailCard(market)).join('')}
                    </div>
                </section>

                <div class="market-grid">
                    ${markets.map(market => this.renderMarketCard(market)).join('')}
                </div>
            `;
        } catch (error) {
            container.innerHTML = `<div class="text-red-500">Error loading markets: ${error.message}</div>`;
        }
    }

    renderRailCard(market) {
        const yesPrice = Number(market.yes_price ?? 0.5);
        const noPrice = Number(market.no_price ?? 0.5);
        const yesPercent = (yesPrice * 100).toFixed(1);
        const noPercent = (noPrice * 100).toFixed(1);
        const timeLeft = this.getTimeLeft(market.end_date);
        const totalVolume = Number(market.total_volume ?? 0);
        const volume = parseFloat(market.total_volume || 0);

        return `
            <article class="rail-card" role="listitem" onclick="app.showMarketDetail('${market.id}')">
                <div class="rail-card__top">
                    <div class="rail-card__meta">
                        ${market.category ? `<span class="pm-pill">${market.category}</span>` : ''}
                        <span class="rail-time">${timeLeft}</span>
                    </div>
                    <span class="rail-volume">$${volume.toLocaleString()}</span>
                </div>
                <h3 class="rail-card__title">${market.title}</h3>
                <div class="rail-card__prices">
                    <div class="pm-price-chip">
                        <span class="label">Yes</span>
                        <span class="value">${yesPercent}%</span>
                    </div>
                    <div class="pm-price-chip no">
                        <span class="label">No</span>
                        <span class="value">${noPercent}%</span>
                    </div>
                </div>
                <div class="rail-progress">
                    <div class="rail-progress__bar" style="width: ${yesPercent}%;"></div>
                </div>
            </article>
        `;
    }

    renderMarketCard(market) {
        const yesPrice = Number(market.yes_price ?? 0.5);
        const noPrice = Number(market.no_price ?? 0.5);
        const yesPercent = (yesPrice * 100).toFixed(1);
        const noPercent = (noPrice * 100).toFixed(1);
        const timeLeft = this.getTimeLeft(market.end_date);

        if (this.isMobile) {
            // Mobile-optimized card - Polymarket style
            return `
                <div class="mobile-card market-card bg-gray-800 rounded-xl p-5 border border-gray-700 active:scale-98 transition-all touch-target"
                     onclick="app.showMarketDetail('${market.id}')"
                     style="min-height: 44px; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">

                    <div class="market-card__header mb-3">
                        <span class="market-card__status">
                            <span class="live-dot"></span>
                            Live
                        </span>
                        <span class="market-card__time">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            ${timeLeft}
                        </span>
                    </div>

                    <!-- Category Badge -->
                    ${market.category ? `
                        <div class="mb-3">
                            <span class="text-xs px-2.5 py-1 rounded-md font-medium" style="background-color: rgba(99, 27, 221, 0.15); color: #a78bfa;">${market.category}</span>
                        </div>
                    ` : ''}

                    <!-- Title -->
                    <h3 class="text-base font-bold mb-3 leading-tight line-clamp-2" style="color: #ffffff;">${market.title}</h3>

                    <!-- Probability Display -->
                    <div class="mb-4">
                        <div class="flex items-center gap-4 mb-2">
                            <div class="flex items-baseline gap-1">
                                <span class="text-xs font-semibold uppercase tracking-wide" style="color: #00CB97;">Yes</span>
                                <span class="text-xl font-bold" style="color: #00CB97;">${yesPercent}%</span>
                            </div>
                            <div class="flex items-baseline gap-1">
                                <span class="text-xs font-semibold uppercase tracking-wide" style="color: #ef4444;">No</span>
                                <span class="text-xl font-bold" style="color: #ef4444;">${noPercent}%</span>
                            </div>
                        </div>

                        <!-- Progress Bar -->
                        <div class="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div class="h-full transition-all duration-300"
                                 style="width: ${yesPercent}%; background: linear-gradient(90deg, #00CB97 0%, #00e5af 100%);"></div>
                        </div>
                    </div>

                    <!-- Footer Info -->
                    <div class="market-card__footer">
                        <span class="market-chip">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                            </svg>
                            $${totalVolume.toLocaleString()}
                            $${parseFloat(market.total_volume).toLocaleString()}
                        </span>
                        <span class="market-chip">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            ${timeLeft}
                        </span>
                    </div>
                </div>
            `;
        } else {
            // Desktop card - Polymarket style
            return `
                <div class="market-card bg-gray-800 rounded-xl p-5 transition-all cursor-pointer border border-gray-700 hover:border-gray-600"
                     onclick="app.showMarketDetail('${market.id}')"
                     style="box-shadow: 0 1px 3px rgba(0,0,0,0.2);"
                     onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.3)'; this.style.transform='translateY(-2px)';"
                     onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.2)'; this.style.transform='translateY(0)';">

                    <div class="market-card__header mb-3">
                        <span class="market-card__status">
                            <span class="live-dot"></span>
                            Live
                        </span>
                        <span class="market-card__time">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            ${timeLeft}
                        </span>
                    </div>

                    <!-- Category Badge -->
                    ${market.category ? `
                        <div class="mb-3">
                            <span class="text-xs px-2.5 py-1 rounded-md font-medium" style="background-color: rgba(99, 27, 221, 0.15); color: #a78bfa;">${market.category}</span>
                        </div>
                    ` : ''}

                    <!-- Title -->
                    <h3 class="text-lg font-bold mb-3 leading-snug line-clamp-2" style="color: #ffffff;">${market.title}</h3>

                    <!-- Probability Display -->
                    <div class="mb-4">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-3 flex-1">
                                <div class="flex items-baseline gap-1.5">
                                    <span class="text-xs font-semibold uppercase tracking-wide" style="color: #00CB97;">Yes</span>
                                    <span class="text-2xl font-bold" style="color: #00CB97;">${yesPercent}%</span>
                                </div>
                                <div class="flex items-baseline gap-1.5">
                                    <span class="text-xs font-semibold uppercase tracking-wide" style="color: #ef4444;">No</span>
                                    <span class="text-2xl font-bold" style="color: #ef4444;">${noPercent}%</span>
                                </div>
                            </div>
                        </div>

                        <!-- Progress Bar -->
                        <div class="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                            <div class="h-full transition-all duration-300"
                                 style="width: ${yesPercent}%; background: linear-gradient(90deg, #00CB97 0%, #00e5af 100%);"></div>
                        </div>
                    </div>

                    <!-- Footer Info -->
                    <div class="market-card__footer">
                        <span class="market-chip">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                            </svg>
                            $${totalVolume.toLocaleString()}
                            $${parseFloat(market.total_volume).toLocaleString()}
                        </span>
                        <span class="market-chip">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            ${timeLeft}
                        </span>
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
                                        <p class="font-semibold">$${parseFloat(pos.total_invested).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p class="text-gray-400">Current Value</p>
                                        <p class="font-semibold">$${parseFloat(pos.current_value).toFixed(2)}</p>
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
                                        <p class="text-sm">$${parseFloat(bet.amount).toFixed(2)} @ ${(parseFloat(bet.price) * 100).toFixed(1)}¢</p>
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
                                    <p class="text-2xl font-bold" style="color: #00CB97;">$${parseFloat(this.currentProfile.balance).toFixed(2)}</p>
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
                                        ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)}
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
                                            <p class="text-sm font-semibold">Value: $${parseFloat(pos.current_value).toFixed(2)}</p>
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
                                            <td class="px-4 py-3 font-semibold">${tx.type === 'bet' ? '-' : '+'}$${parseFloat(tx.amount).toFixed(2)}</td>
                                            <td class="px-4 py-3 text-gray-400">$${parseFloat(tx.balance_after).toFixed(2)}</td>
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
                                <h1 class="text-2xl font-bold text-white mb-1">Community Governance</h1>
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

    showCreateMarketModal() {
        alert('Create market functionality coming soon!');
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
