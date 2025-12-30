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

// ============ Profile Dropdown Functions ============
function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdownMenu');
    const button = document.getElementById('profileAvatarBtn');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
    if (button) {
        button.classList.toggle('active');
    }
}

function openProfileDropdown() {
    const dropdown = document.getElementById('profileDropdownMenu');
    const button = document.getElementById('profileAvatarBtn');
    if (dropdown) {
        dropdown.classList.add('active');
    }
    if (button) {
        button.classList.add('active');
    }
}

function closeProfileDropdown() {
    const dropdown = document.getElementById('profileDropdownMenu');
    const button = document.getElementById('profileAvatarBtn');
    if (dropdown) {
        dropdown.classList.remove('active');
    }
    if (button) {
        button.classList.remove('active');
    }
}

// Add hover functionality for profile dropdown
document.addEventListener('DOMContentLoaded', function() {
    const profileDropdown = document.getElementById('userProfileDropdown');

    if (profileDropdown) {
        profileDropdown.addEventListener('mouseenter', openProfileDropdown);
        profileDropdown.addEventListener('mouseleave', closeProfileDropdown);
    }
});

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
    const profileDropdown = document.getElementById('userProfileDropdown');
    const profileDropdownMenu = document.getElementById('profileDropdownMenu');
    const notificationsContainer = document.getElementById('notificationsContainer');
    const notificationsDropdown = document.getElementById('notificationsDropdown');

    // Close profile dropdown
    if (profileDropdown && profileDropdownMenu && !profileDropdown.contains(event.target)) {
        profileDropdownMenu.classList.remove('active');
        const button = document.getElementById('profileAvatarBtn');
        if (button) button.classList.remove('active');
    }

    // Close notifications dropdown
    if (notificationsContainer && notificationsDropdown && !notificationsContainer.contains(event.target)) {
        notificationsDropdown.classList.remove('active');
    }
});

// ============ Notifications Functions ============
let notificationsCache = [];
let notificationsPollInterval = null;

function toggleNotifications() {
    const dropdown = document.getElementById('notificationsDropdown');
    if (dropdown) {
        const isActive = dropdown.classList.contains('active');
        dropdown.classList.toggle('active');

        // Load notifications when opening
        if (!isActive) {
            loadNotifications();
        }
    }
}

function closeNotifications() {
    const dropdown = document.getElementById('notificationsDropdown');
    if (dropdown) {
        dropdown.classList.remove('active');
    }
}

async function loadNotifications() {
    try {
        if (!window.supabaseClient) return;

        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session) return;

        // Get user profile for role-based filtering
        const { data: profile } = await window.supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        // Fetch notifications
        let query = window.supabaseClient
            .from('notifications')
            .select('*')
            .or(`user_id.eq.${session.user.id},target_role.eq.${profile?.role || 'member'},is_global.eq.true`)
            .order('created_at', { ascending: false })
            .limit(20);

        const { data: notifications, error } = await query;

        if (error) {
            console.error('Error loading notifications:', error);
            return;
        }

        notificationsCache = notifications || [];
        renderNotifications(notifications || []);
        updateNotificationBadge();

    } catch (error) {
        console.error('Error in loadNotifications:', error);
    }
}

function renderNotifications(notifications) {
    const listElement = document.getElementById('notificationsList');
    const markAllReadBtn = document.getElementById('markAllReadBtn');

    if (!listElement) return;

    if (!notifications || notifications.length === 0) {
        listElement.innerHTML = `
            <div class="notifications-empty">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="48" height="48">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                <p>No notifications</p>
            </div>
        `;
        if (markAllReadBtn) markAllReadBtn.style.display = 'none';
        return;
    }

    const hasUnread = notifications.some(n => !n.is_read);
    if (markAllReadBtn) {
        markAllReadBtn.style.display = hasUnread ? 'block' : 'none';
    }

    const html = notifications.map(notification => {
        const iconType = notification.type || 'info';
        const timeAgo = getTimeAgo(new Date(notification.created_at));

        return `
            <div class="notification-item ${!notification.is_read ? 'unread' : ''}"
                 onclick="handleNotificationClick('${notification.id}', '${notification.action_url || ''}')">
                <div class="notification-icon ${iconType}">
                    ${getNotificationIcon(iconType)}
                </div>
                <div class="notification-content">
                    <div class="notification-title">
                        ${!notification.is_read ? '<div class="notification-unread-dot"></div>' : ''}
                        ${notification.title}
                    </div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
            </div>
        `;
    }).join('');

    listElement.innerHTML = html;
}

function getNotificationIcon(type) {
    const icons = {
        info: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        success: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        warning: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
        error: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    };
    return icons[type] || icons.info;
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString();
}

async function handleNotificationClick(notificationId, actionUrl) {
    // Mark as read
    await markNotificationRead(notificationId);

    // Navigate if there's an action URL
    if (actionUrl && actionUrl !== 'null' && actionUrl !== '') {
        closeNotifications();
        window.location.href = actionUrl;
    }
}

async function markNotificationRead(notificationId) {
    try {
        if (!window.supabaseClient) return;

        await window.supabaseClient
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        // Update local cache
        const notification = notificationsCache.find(n => n.id === notificationId);
        if (notification) {
            notification.is_read = true;
            renderNotifications(notificationsCache);
            updateNotificationBadge();
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function markAllNotificationsRead() {
    try {
        if (!window.supabaseClient) return;

        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session) return;

        await window.supabaseClient
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', session.user.id)
            .eq('is_read', false);

        // Update local cache
        notificationsCache.forEach(n => n.is_read = true);
        renderNotifications(notificationsCache);
        updateNotificationBadge();
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const bellBtn = document.getElementById('notificationBellBtn');

    const unreadCount = notificationsCache.filter(n => !n.is_read).length;

    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    if (bellBtn) {
        if (unreadCount > 0) {
            bellBtn.classList.add('has-unread');
        } else {
            bellBtn.classList.remove('has-unread');
        }
    }
}

function viewAllNotifications() {
    // Navigate to notifications page (to be created)
    closeNotifications();
    // For now, just close the dropdown
    // TODO: Create a dedicated notifications page
}

// Start polling for notifications when user is logged in
function startNotificationsPolling() {
    if (notificationsPollInterval) {
        clearInterval(notificationsPollInterval);
    }

    // Poll every 30 seconds
    notificationsPollInterval = setInterval(() => {
        loadNotifications();
    }, 30000);

    // Load immediately
    loadNotifications();
}

function stopNotificationsPolling() {
    if (notificationsPollInterval) {
        clearInterval(notificationsPollInterval);
        notificationsPollInterval = null;
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
    const userProfileDropdown = document.getElementById('userProfileDropdown');
    const notificationsContainer = document.getElementById('notificationsContainer');
    const dropdownAdminBtn = document.getElementById('dropdownAdminBtn');

    // Mark user-info as ready to prevent flash
    const userInfo = document.querySelector('.user-info');
    if (userInfo) {
        userInfo.classList.add('auth-ready');
    }

    if (authLoading) authLoading.style.display = 'none';

    if (user && profile) {
        // User is logged in - show dropdown and notifications
        if (authButtons) authButtons.style.display = 'none';
        if (userProfileDropdown) userProfileDropdown.style.display = 'block';
        if (notificationsContainer) notificationsContainer.style.display = 'block';

        // Show balance counter and update amount (desktop only)
        const balanceCounter = document.getElementById('balanceCounter');
        const headerBalanceText = document.getElementById('headerBalanceText');
        const headerBalanceSpinner = document.getElementById('headerBalanceSpinner');

        if (balanceCounter) balanceCounter.style.display = 'flex';

        if (headerBalanceText && profile && profile.balance !== undefined) {
            const balance = profile.balance;

            // Hide spinner, show balance
            if (headerBalanceSpinner) headerBalanceSpinner.classList.add('hidden');
            headerBalanceText.textContent = `J$${balance.toFixed(2)}`;
            headerBalanceText.style.display = 'inline';

            // Update mobile nav balance if function exists
            if (typeof window.updateMobileNavBalance === 'function') {
                window.updateMobileNavBalance(balance);
            }
        } else if (headerBalanceText) {
            // Show spinner while loading
            if (headerBalanceSpinner) headerBalanceSpinner.classList.remove('hidden');
            headerBalanceText.style.display = 'none';
        }

        // Show deposit button and separator (desktop only)
        const depositBtn = document.getElementById('depositBtn');
        const profileSeparator = document.getElementById('profileSeparator');
        if (depositBtn) depositBtn.style.display = 'flex';
        if (profileSeparator) profileSeparator.style.display = 'block';

        // Update username in dropdown - use profile.username if available, otherwise extract from email
        let displayName = 'User';
        if (profile.username) {
            displayName = profile.username;
        } else if (user.email) {
            // Fallback to email-based display name
            displayName = user.email.split('@')[0];
            displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
        }

        // Update dropdown header
        const dropdownUserName = document.getElementById('dropdownUserName');
        if (dropdownUserName) {
            dropdownUserName.textContent = displayName;
        }

        // Update role badge in dropdown
        const dropdownUserRole = document.getElementById('dropdownUserRole');
        if (dropdownUserRole) {
            dropdownUserRole.textContent = profile.role === 'admin' ? 'Admin' : 'Member';
        }

        // Update avatar images
        const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%231f2937"/%3E%3Cpath d="M50 45c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm0 10c-13.807 0-25 8.059-25 18v7h50v-7c0-9.941-11.193-18-25-18z" fill="%2300CB97"/%3E%3C/svg%3E';
        const avatarUrl = profile.avatar_url || defaultAvatar;
        const userAvatarImg = document.getElementById('userAvatarImg');
        const dropdownAvatarImg = document.getElementById('dropdownAvatarImg');
        if (userAvatarImg) userAvatarImg.src = avatarUrl;
        if (dropdownAvatarImg) dropdownAvatarImg.src = avatarUrl;

        // Show admin panel button in dropdown if user is admin
        if (dropdownAdminBtn) {
            dropdownAdminBtn.style.display = profile.role === 'admin' ? 'flex' : 'none';
        }

        // Start notifications polling
        startNotificationsPolling();
    } else {
        // User is not logged in
        if (authButtons) authButtons.style.display = 'flex';
        if (userProfileDropdown) userProfileDropdown.style.display = 'none';
        if (notificationsContainer) notificationsContainer.style.display = 'none';

        // Hide balance counter, deposit button and separator
        const balanceCounter = document.getElementById('balanceCounter');
        const depositBtn = document.getElementById('depositBtn');
        const profileSeparator = document.getElementById('profileSeparator');
        if (balanceCounter) balanceCounter.style.display = 'none';
        if (depositBtn) depositBtn.style.display = 'none';
        if (profileSeparator) profileSeparator.style.display = 'none';

        // Stop notifications polling
        stopNotificationsPolling();
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
