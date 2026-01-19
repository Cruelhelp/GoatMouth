// ====================================
// HEADER COMPONENT - GoatMouth
// Shared header, navigation, and sidebar
// ====================================

function renderHeader(options = {}) {
    const {
        currentPage = 'markets',
        showViewModeToggle = false,
        logoIsLink = true,
        showAdminButton = true
    } = options;

    const logoHtml = logoIsLink
        ? `<a href="index.html" class="logo-container">
            <img src="assets/official.png" alt="GoatMouth Logo" class="main-logo">
            <span class="logo-text"><span class="goat">Goat</span><span class="mouth">Mouth</span></span>
          </a>`
        : `<div class="logo-container">
            <img src="assets/official.png" alt="GoatMouth Logo" class="main-logo">
            <span class="logo-text"><span class="goat">Goat</span><span class="mouth">Mouth</span></span>
          </div>`;

    // Determine navigation type for each nav item
    const isMarketsPage = currentPage === 'markets';
    const isMarketDetailPage = currentPage === 'market';
    const isMarketsContext = isMarketsPage || isMarketDetailPage;
    const isOnIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '';

    const navItems = [
        {
            id: 'markets',
            icon: 'fa-house',
            label: 'Markets',
            isButton: isMarketsPage, // Button only on index.html, link elsewhere
            href: 'index.html',
            classes: isMarketsContext ? 'active' : ''
        },
        {
            id: 'voting',
            icon: 'fa-check-circle',
            label: 'Voting',
            isButton: false,
            href: 'voting.html',
            classes: currentPage === 'voting' ? 'active' : '',
            desktopOnly: true
        },
        {
            id: 'earn',
            icon: 'fa-coins',
            label: 'Earn',
            isButton: currentPage === 'markets', // Button on index.html
            href: 'index.html#earn',
            classes: currentPage === 'earn' ? 'active' : ''
        },
        {
            id: 'activity',
            icon: 'fa-chart-line',
            label: 'Activity',
            isButton: currentPage === 'markets', // Button on index.html
            href: 'index.html#activity',
            classes: currentPage === 'activity' ? 'active' : ''
        },
        {
            id: 'leaderboard',
            icon: 'fa-trophy',
            label: 'Leaderboard',
            isButton: currentPage === 'markets', // Button on index.html
            href: 'index.html#leaderboard',
            classes: currentPage === 'leaderboard' ? 'active' : ''
        }
    ];

    const navHtml = navItems.map(item => {
        const classes = `nav-btn ${item.classes} ${item.desktopOnly ? 'desktop-only' : ''}`.trim();

        if (item.isButton) {
            return `<button class="${classes}" data-nav="${item.id}" onclick="navigateAndSetActive('${item.id}')">
                <i class="fa-solid ${item.icon}"></i> ${item.label}
            </button>`;
        } else {
            return `<a href="${item.href}" class="${classes}" data-nav="${item.id}">
                <i class="fa-solid ${item.icon}"></i> ${item.label}
            </a>`;
        }
    }).join('\n        ');

    const viewModeToggleHtml = showViewModeToggle ? `
        <span class="category-divider">|</span>
        <!-- View Mode Toggle -->
        <div id="viewModeToggle" class="flex gap-1 bg-gray-800 rounded-lg p-1 border border-gray-700" style="margin-left: auto;">
          <button id="gridViewBtn" class="px-2 py-1.5 rounded bg-gray-700 text-white transition" onclick="setViewMode('grid')" title="Grid View">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
            </svg>
          </button>
          <button id="listViewBtn" class="px-2 py-1.5 rounded text-gray-400 hover:text-white transition" onclick="setViewMode('list')" title="List View">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
            </svg>
          </button>
        </div>` : '';

    const adminButtonHtml = showAdminButton ? `
        <a href="admin.html" class="btn secondary admin-panel-btn" id="adminPanelBtn" title="Admin Panel" style="display: none;">
          <i class="fa-solid fa-user-shield"></i>
          <span class="btn-text">Admin</span>
        </a>` : '';

    // Category onclick handler - use app function on index.html, simple link elsewhere
    const categoryOnclick = (isMarketsPage && isOnIndexPage)
        ? `onclick="selectCategory(event, '{{CATEGORY}}')"`
        : `onclick="navigateToCategory(event, '{{CATEGORY}}')"`;
    const categoryHref = (category) => (isOnIndexPage ? '#' : 'index.html#markets');

    return `
    <!-- Logo Header -->
    <div class="logo-header">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div class="hamburger" id="hamburger" title="Toggle Menu" onclick="toggleMobileSidebar()">
          <span></span>
          <span></span>
          <span></span>
        </div>
        ${logoHtml}
        <!-- Search Bar in Header -->
        <div class="header-search-container">
          <i class="fa-solid fa-search search-icon"></i>
          <input type="text" id="marketSearch" class="search-input" placeholder="Search GoatMouth Markets" autocomplete="search">
        </div>
      </div>
      <div class="user-info">
        <!-- Auth Loading Spinner -->
        <div class="auth-loading" id="authLoading">
          <div class="auth-spinner"></div>
        </div>

        <!-- Balance Counter (signed-in users only) -->
        <div class="balance-counter desktop-only" id="balanceCounter" style="display: none;">
          <div class="balance-label">Cash</div>
          <div class="balance-amount" id="headerBalance">
            <div class="balance-spinner" id="headerBalanceSpinner">
              <svg class="spinner-icon" viewBox="0 0 24 24">
                <circle class="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none"/>
              </svg>
            </div>
            <span id="headerBalanceText">J$0.00</span>
          </div>
        </div>

        <!-- Deposit Button (desktop only, signed-in users) -->
        <a href="deposit.html" class="deposit-btn desktop-only" id="depositBtn" style="display: none;">
          Deposit
        </a>

        <!-- Notifications Bell (signed-in users only) -->
        <div class="notifications-container" id="notificationsContainer" style="display: none;">
          <button class="notification-bell-btn" id="notificationBellBtn" onclick="toggleNotifications()">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="22" height="22">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            <span class="notification-badge" id="notificationBadge" style="display: none;">0</span>
          </button>

          <div class="notifications-dropdown" id="notificationsDropdown">
            <div class="notifications-header">
              <h3>Notifications</h3>
              <button class="mark-all-read-btn" onclick="markAllNotificationsRead()" id="markAllReadBtn" style="display: none;">
                Mark all read
              </button>
            </div>
            <div class="notifications-list" id="notificationsList">
              <div class="notifications-empty">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="48" height="48">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                <p>No notifications</p>
              </div>
            </div>
            <div class="notifications-footer">
              <a href="#" onclick="event.preventDefault(); viewAllNotifications();">View all notifications</a>
            </div>
          </div>
        </div>

        <!-- Separator -->
        <div class="header-separator desktop-only" id="profileSeparator" style="display: none;"></div>

        <!-- User Profile Dropdown (signed-in users only) -->
        <div class="user-profile-dropdown" id="userProfileDropdown" style="display: none;">
          <button class="profile-avatar-btn" id="profileAvatarBtn" onclick="toggleProfileDropdown()">
            <img id="userAvatarImg" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%231f2937'/%3E%3Cpath d='M50 45c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm0 10c-13.807 0-25 8.059-25 18v7h50v-7c0-9.941-11.193-18-25-18z' fill='%2300CB97'/%3E%3C/svg%3E" alt="Profile" class="avatar-img">
            <div class="online-indicator"></div>
            <div class="dropdown-chevron">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </button>

          <div class="profile-dropdown-menu" id="profileDropdownMenu">
            <div class="dropdown-header">
              <img id="dropdownAvatarImg" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%231f2937'/%3E%3Cpath d='M50 45c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm0 10c-13.807 0-25 8.059-25 18v7h50v-7c0-9.941-11.193-18-25-18z' fill='%2300CB97'/%3E%3C/svg%3E" alt="Profile" class="dropdown-avatar">
              <div class="dropdown-user-info">
                <span id="dropdownUserName" class="dropdown-name">User</span>
                <span id="dropdownUserRole" class="dropdown-role">Member</span>
              </div>
            </div>
            <div class="dropdown-divider"></div>
            <a href="#" class="dropdown-item" onclick="event.preventDefault(); closeProfileDropdown(); showUserProfile();">
              <i class="fa-solid fa-user"></i>
              <span>My Profile</span>
            </a>
            <a href="#" class="dropdown-item" onclick="event.preventDefault(); closeProfileDropdown(); showBookmarks();">
              <i class="fa-solid fa-bookmark"></i>
              <span>Bookmarks</span>
            </a>
            <a href="admin.html" class="dropdown-item" id="dropdownAdminBtn" style="display: none;" onclick="closeProfileDropdown();">
              <i class="fa-solid fa-user-shield"></i>
              <span>Admin Panel</span>
            </a>
            <div class="dropdown-divider"></div>
            <a href="#" class="dropdown-item dropdown-item-danger" onclick="event.preventDefault(); closeProfileDropdown(); handleLogout();">
              <i class="fa-solid fa-right-from-bracket"></i>
              <span>Logout</span>
            </a>
          </div>
        </div>

        <!-- Login/Signup buttons for non-authenticated users -->
        <div class="auth-buttons" id="authButtons" style="display: none;">
          <button class="auth-btn login-btn" onclick="showAuthModal('login')">
            Login
          </button>
          <button class="auth-btn signup-btn" onclick="showAuthModal('signup')">
            Sign Up
          </button>
        </div>
      </div>
    </div>

    <!-- Single Unified Navigation Bar -->
    <div class="menubar">
      <!-- Main Navigation -->
      <div class="nav-section">
        ${navHtml}
      </div>

      <!-- Category Navigation (Desktop Only) -->
      <div class="category-section desktop-only">
        <span class="category-divider">|</span>
        <a href="${categoryHref('all')}" class="category-chip active" data-category="all" ${categoryOnclick.replace('{{CATEGORY}}', 'all')}>
          <i class="fa-solid fa-chart-line"></i> All
        </a>
        <a href="${categoryHref('Politics')}" class="category-chip" data-category="Politics" ${categoryOnclick.replace('{{CATEGORY}}', 'Politics')}>
          <i class="fa-solid fa-landmark"></i> Politics
        </a>
        <a href="${categoryHref('Sports')}" class="category-chip" data-category="Sports" ${categoryOnclick.replace('{{CATEGORY}}', 'Sports')}>
          <i class="fa-solid fa-futbol"></i> Sports
        </a>
        <a href="${categoryHref('Finance')}" class="category-chip" data-category="Finance" ${categoryOnclick.replace('{{CATEGORY}}', 'Finance')}>
          <i class="fa-solid fa-dollar-sign"></i> Finance
        </a>
        <a href="${categoryHref('Crypto')}" class="category-chip" data-category="Crypto" ${categoryOnclick.replace('{{CATEGORY}}', 'Crypto')}>
          <i class="fa-brands fa-bitcoin"></i> Crypto
        </a>
        <a href="${categoryHref('Technology')}" class="category-chip" data-category="Technology" ${categoryOnclick.replace('{{CATEGORY}}', 'Technology')}>
          <i class="fa-solid fa-microchip"></i> Tech
        </a>
        <a href="${categoryHref('Science')}" class="category-chip" data-category="Science" ${categoryOnclick.replace('{{CATEGORY}}', 'Science')}>
          <i class="fa-solid fa-flask"></i> Science
        </a>
        ${viewModeToggleHtml}
      </div>
    </div>

    ${currentPage === 'markets' ? `<!-- Hidden placeholders for JS compatibility -->
    <div id="main-nav" style="display: none;"></div>
    <div id="category-nav" style="display: none;"></div>` : ''}

    <!-- Mobile Sidebar -->
    <div class="mobile-sidebar" id="mobileSidebar">
        <div class="mobile-sidebar-header">
            <h3>Market Categories</h3>
            <button class="close-sidebar" onclick="closeMobileSidebar()">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        <div class="mobile-sidebar-content">
            <a href="${categoryHref('all')}" class="sidebar-category-link" data-category="all" ${categoryOnclick.replace('{{CATEGORY}}', 'all')}>
                <i class="fa-solid fa-chart-line"></i>
                All Markets
            </a>
            <a href="${categoryHref('Politics')}" class="sidebar-category-link" data-category="Politics" ${categoryOnclick.replace('{{CATEGORY}}', 'Politics')}>
                <i class="fa-solid fa-landmark"></i>
                Politics
            </a>
            <a href="${categoryHref('Sports')}" class="sidebar-category-link" data-category="Sports" ${categoryOnclick.replace('{{CATEGORY}}', 'Sports')}>
                <i class="fa-solid fa-futbol"></i>
                Sports
            </a>
            <a href="${categoryHref('Finance')}" class="sidebar-category-link" data-category="Finance" ${categoryOnclick.replace('{{CATEGORY}}', 'Finance')}>
                <i class="fa-solid fa-dollar-sign"></i>
                Finance
            </a>
            <a href="${categoryHref('Crypto')}" class="sidebar-category-link" data-category="Crypto" ${categoryOnclick.replace('{{CATEGORY}}', 'Crypto')}>
                <i class="fa-brands fa-bitcoin"></i>
                Crypto
            </a>
            <a href="${categoryHref('Technology')}" class="sidebar-category-link" data-category="Technology" ${categoryOnclick.replace('{{CATEGORY}}', 'Technology')}>
                <i class="fa-solid fa-microchip"></i>
                Technology
            </a>
            <a href="${categoryHref('Science')}" class="sidebar-category-link" data-category="Science" ${categoryOnclick.replace('{{CATEGORY}}', 'Science')}>
                <i class="fa-solid fa-flask"></i>
                Science
            </a>

            <!-- Separator -->
            <div style="border-top: 1px solid rgba(55, 65, 81, 0.5); margin: 16px 0;"></div>

            <a href="how-it-works.html" class="sidebar-category-link">
                <i class="fa-solid fa-circle-info"></i>
                How It Works
            </a>
            <a href="contact.html" class="sidebar-category-link">
                <i class="fa-solid fa-envelope"></i>
                Contact
            </a>
            <a href="privacy.html" class="sidebar-category-link">
                <i class="fa-solid fa-shield-halved"></i>
                Privacy
            </a>
            <a href="terms.html" class="sidebar-category-link">
                <i class="fa-solid fa-file-contract"></i>
                Terms
            </a>
        </div>
    </div>

    <!-- Sidebar Overlay -->
    <div class="sidebar-overlay" id="sidebarOverlay" onclick="closeMobileSidebar()"></div>
    `;
}

// Auto-inject header on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const headerContainer = document.getElementById('header-container');
        if (headerContainer) {
            const currentPage = headerContainer.dataset.page || 'markets';
            const showViewMode = headerContainer.dataset.showViewMode === 'true';
            const logoLink = headerContainer.dataset.logoLink !== 'false';
            const showAdmin = headerContainer.dataset.showAdmin !== 'false';

            headerContainer.innerHTML = renderHeader({
                currentPage,
                showViewModeToggle: showViewMode,
                logoIsLink: logoLink,
                showAdminButton: showAdmin
            });
            applyActiveNavState();
            if (typeof updateHeaderUI === 'function' && typeof getAuthState === 'function') {
                const state = getAuthState();
                updateHeaderUI(state?.user || null, state?.profile || null);
            }
        }
    });
} else {
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        const currentPage = headerContainer.dataset.page || 'markets';
        const showViewMode = headerContainer.dataset.showViewMode === 'true';
        const logoLink = headerContainer.dataset.logoLink !== 'false';
        const showAdmin = headerContainer.dataset.showAdmin !== 'false';

        headerContainer.innerHTML = renderHeader({
            currentPage,
            showViewModeToggle: showViewMode,
            logoIsLink: logoLink,
            showAdminButton: showAdmin
        });
        applyActiveNavState();
        if (typeof updateHeaderUI === 'function' && typeof getAuthState === 'function') {
            const state = getAuthState();
            updateHeaderUI(state?.user || null, state?.profile || null);
        }
    }
}

console.log('✓ Header component loaded');
function applyActiveNavState() {
    const hash = window.location.hash.replace('#', '');
    const path = window.location.pathname;
    let activeView = null;

    if (['portfolio', 'markets', 'voting', 'leaderboard', 'activity', 'earn'].includes(hash)) {
        activeView = hash;
    } else if (path.includes('voting.html')) {
        activeView = 'voting';
    } else if (path.includes('earn.html')) {
        activeView = 'earn';
    } else if (path.includes('market.html')) {
        activeView = 'markets';
    } else if (path.includes('index.html') || path === '/' || path === '') {
        activeView = 'markets';
    }

    if (!activeView) return;

    document.querySelectorAll('.menubar .nav-btn').forEach((btn) => {
        btn.classList.remove('active');
    });

    const target = document.querySelector(`.menubar .nav-btn[data-nav="${activeView}"]`);
    if (target) {
        target.classList.add('active');
    }
}

window.addEventListener('hashchange', () => {
    applyActiveNavState();
});
