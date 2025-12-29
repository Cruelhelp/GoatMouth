// ====================================
// SHARED COMPONENTS - GoatMouth
// Global functions used across all pages
// ====================================

// ============ Mobile Sidebar Functions ============
function toggleMobileSidebar() {
    const sidebar = document.getElementById('mobileSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('mobileSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
}

// ============ Auth Functions ============
async function handleLogout() {
    try {
        // Sign out from Supabase
        if (window.supabaseClient) {
            await window.supabaseClient.auth.signOut();
        }

        // Clear all stored data
        localStorage.clear();
        sessionStorage.clear();

        // Clear all cookies
        document.cookie.split(";").forEach(function(c) {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });

        // Clear app state if exists (for index.html)
        if (window.app) {
            window.app.currentUser = null;
            window.app.currentProfile = null;
        }

        // Redirect using replace to prevent back button
        window.location.replace(window.location.origin + '/index.html');
    } catch (error) {
        console.error('Logout error:', error);
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace(window.location.origin + '/index.html');
    }
}

function showUserProfile() {
    // Navigate to profile page
    window.location.href = 'profile.html';
}

function showAuthModal(mode) {
    // Check if we're on index.html with app instance
    if (window.app && window.app.showAuthModal) {
        window.app.showAuthModal(mode);
    } else {
        // Redirect to index.html with auth mode parameter
        window.location.href = `index.html?auth=${mode}`;
    }
}

// ============ Updates Modal Functions ============
function openUpdatesModal() {
    const modal = document.getElementById('updatesModal');
    const overlay = document.getElementById('updatesModalOverlay');

    if (modal && overlay) {
        overlay.classList.add('active');
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);

        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
    }
}

function closeUpdatesModal() {
    const modal = document.getElementById('updatesModal');
    const overlay = document.getElementById('updatesModalOverlay');

    if (modal && overlay) {
        modal.classList.remove('active');
        setTimeout(() => {
            overlay.classList.remove('active');
        }, 300);

        // Restore body scroll
        document.body.style.overflow = '';
    }
}

// ============ Banner Functions ============
function closeBanner() {
    const bannerContainer = document.getElementById('banner-container');
    const reopenContainer = document.getElementById('banner-reopen-container');
    if (bannerContainer && reopenContainer) {
        bannerContainer.classList.add('hidden');
        reopenContainer.classList.remove('hidden');
        localStorage.setItem('bannerClosed', 'true');
    }
}

function reopenBanner() {
    const bannerContainer = document.getElementById('banner-container');
    const reopenContainer = document.getElementById('banner-reopen-container');
    if (bannerContainer && reopenContainer) {
        bannerContainer.classList.remove('hidden');
        reopenContainer.classList.add('hidden');
        localStorage.removeItem('bannerClosed');
    }
}

// ============ Banner Initialization ============
async function initSharedBanner() {
    console.log('🎨 Initializing shared banner...');

    // Check banner state from localStorage
    const bannerClosed = localStorage.getItem('bannerClosed') === 'true';
    if (bannerClosed) {
        const bannerContainer = document.getElementById('banner-container');
        const reopenContainer = document.getElementById('banner-reopen-container');
        if (bannerContainer && reopenContainer) {
            bannerContainer.classList.add('hidden');
            reopenContainer.classList.remove('hidden');
        }
        console.log('✓ Banner was previously closed');
        return;
    }

    // Wait for required scripts to load
    let attempts = 0;
    while ((!window.supabaseClient || !window.GoatMouthAPI || !window.BannerCarousel) && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    console.log('✓ Scripts loaded:', {
        supabaseClient: !!window.supabaseClient,
        GoatMouthAPI: !!window.GoatMouthAPI,
        BannerCarousel: !!window.BannerCarousel
    });

    // Initialize banner carousel
    if (window.supabaseClient && window.GoatMouthAPI && window.BannerCarousel) {
        try {
            const api = new GoatMouthAPI(window.supabaseClient);
            window.bannerCarousel = new BannerCarousel({ api });

            console.log('✓ BannerCarousel instance created');
            await window.bannerCarousel.loadBanners();
            console.log('✓ Banners loaded:', window.bannerCarousel.banners.length);

            const bannerContainer = document.getElementById('banner-container');
            const bannerContent = bannerContainer ? bannerContainer.querySelector('.banner-content') : null;

            if (bannerContainer && bannerContent && window.bannerCarousel.banners.length > 0) {
                window.bannerCarousel.render(bannerContainer);
                console.log('✓ Banner rendered');
            } else {
                console.log('ℹ No banners to display');
                // Hide spinner if no banners
                const spinner = document.getElementById('bannerSpinner');
                if (spinner) spinner.style.display = 'none';
            }
        } catch (error) {
            console.error('❌ Error initializing banner:', error);
            const spinner = document.getElementById('bannerSpinner');
            if (spinner) spinner.style.display = 'none';
        }
    } else {
        console.error('❌ Required scripts not loaded');
    }
}

// ============ Header UI Update ============
function updateHeaderUI(user = null, profile = null) {
    const authLoading = document.getElementById('authLoading');
    const authButtons = document.getElementById('authButtons');
    const profileBtn = document.getElementById('profileBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userBadge = document.getElementById('userBadge');
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    const bookmarksBtn = document.getElementById('bookmarksBtn');

    if (authLoading) authLoading.style.display = 'none';

    if (user && profile) {
        // User is logged in
        if (authButtons) authButtons.style.display = 'none';
        if (profileBtn) profileBtn.style.display = 'inline-flex';
        if (logoutBtn) logoutBtn.style.display = 'inline-flex';
        if (userBadge) userBadge.style.display = 'flex';
        if (bookmarksBtn) bookmarksBtn.style.display = 'inline-flex';

        // Update username - use profile.username if available, otherwise extract from email
        const userName = document.getElementById('currentUserName');
        if (userName) {
            if (profile.username) {
                userName.textContent = profile.username;
            } else if (user.email) {
                // Fallback to email-based display name
                const displayName = user.email.split('@')[0];
                userName.textContent = displayName.charAt(0).toUpperCase() + displayName.slice(1);
            }
        }

        // Update role badge
        const userRole = document.getElementById('currentUserRole');
        if (userRole) {
            userRole.textContent = profile.role === 'admin' ? 'Admin' : 'Member';
        }

        // Show admin panel button if user is admin
        if (adminPanelBtn && profile.role === 'admin') {
            adminPanelBtn.style.display = 'inline-flex';
        }
    } else {
        // User is not logged in
        if (authButtons) authButtons.style.display = 'flex';
        if (profileBtn) profileBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userBadge) userBadge.style.display = 'none';
        if (adminPanelBtn) adminPanelBtn.style.display = 'none';
        if (bookmarksBtn) bookmarksBtn.style.display = 'none';
    }
}

// ============ Navigation Helper ============
function navigateAndSetActive(view) {
    // If on index.html with app instance, use app navigation
    if (window.app && window.app.navigate) {
        window.app.navigate(view);
    } else {
        // Otherwise, redirect to index.html with hash
        window.location.href = `index.html#${view}`;
    }
}

// ============ Bookmarks Helper ============
function showBookmarks() {
    // If on index.html with app instance, use app's showBookmarksModal
    if (window.app && window.app.showBookmarksModal) {
        window.app.showBookmarksModal();
    } else {
        // Otherwise, redirect to index.html and trigger bookmarks modal
        // Store intent in sessionStorage
        sessionStorage.setItem('showBookmarksOnLoad', 'true');
        window.location.href = 'index.html';
    }
}

// ============ Global Initialization ============
// Auto-initialize banner on pages that have banner container
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('banner-container')) {
            initSharedBanner();
        }
    });
} else {
    if (document.getElementById('banner-container')) {
        initSharedBanner();
    }
}

console.log('✓ Shared components loaded');
