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
    const navItems = [
        {
            id: 'markets',
            icon: 'fa-house',
            label: 'Markets',
            isButton: currentPage === 'markets', // Button on index.html, link elsewhere
            href: 'index.html',
            classes: currentPage === 'markets' ? 'active' : ''
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
            isButton: false,
            href: 'earn.html',
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
            return `<a href="${item.href}" class="${classes}">
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
    const categoryOnclick = currentPage === 'markets'
        ? `onclick="selectCategory(event, '{{CATEGORY}}')"`
        : '';

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
          <input type="text" id="marketSearch" class="search-input" placeholder="Search GoatMouth Markets">
        </div>
      </div>
      <div class="user-info">
        <!-- Auth Loading Spinner -->
        <div class="auth-loading" id="authLoading">
          <div class="auth-spinner"></div>
        </div>
        <div class="user-badge" id="userBadge" style="display: none;">
          <span id="currentUserName">User</span>
          <span id="currentUserRole" class="role-badge">Member</span>
        </div>
        <!-- Bookmarks button (signed-in users only) -->
        <button class="btn secondary" id="bookmarksBtn" title="Bookmarked Markets" onclick="showBookmarks()" style="display: none;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M18 7v14l-6 -4l-6 4v-14a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4z" />
          </svg>
        </button>
        <!-- Profile and session controls -->
        <button class="btn secondary" id="profileBtn" title="Profile" onclick="showUserProfile()" style="display: none;">
          <i class="fa-solid fa-user"></i>
          <span class="btn-text">Profile</span>
        </button>
        ${adminButtonHtml}
        <button class="btn secondary logout-btn" id="logoutBtn" title="Logout" onclick="handleLogout()" style="display: none;">
          <i class="fa-solid fa-right-from-bracket"></i>
          <span class="btn-text logout-text">Logout</span>
        </button>
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
        <a href="${currentPage === 'markets' ? '#' : 'index.html#all'}" class="category-chip active" data-category="all" ${categoryOnclick.replace('{{CATEGORY}}', 'all')}>
          <i class="fa-solid fa-chart-line"></i> All
        </a>
        <a href="${currentPage === 'markets' ? '#' : 'index.html#Politics'}" class="category-chip" data-category="Politics" ${categoryOnclick.replace('{{CATEGORY}}', 'Politics')}>
          <i class="fa-solid fa-landmark"></i> Politics
        </a>
        <a href="${currentPage === 'markets' ? '#' : 'index.html#Sports'}" class="category-chip" data-category="Sports" ${categoryOnclick.replace('{{CATEGORY}}', 'Sports')}>
          <i class="fa-solid fa-futbol"></i> Sports
        </a>
        <a href="${currentPage === 'markets' ? '#' : 'index.html#Finance'}" class="category-chip" data-category="Finance" ${categoryOnclick.replace('{{CATEGORY}}', 'Finance')}>
          <i class="fa-solid fa-dollar-sign"></i> Finance
        </a>
        <a href="${currentPage === 'markets' ? '#' : 'index.html#Crypto'}" class="category-chip" data-category="Crypto" ${categoryOnclick.replace('{{CATEGORY}}', 'Crypto')}>
          <i class="fa-brands fa-bitcoin"></i> Crypto
        </a>
        <a href="${currentPage === 'markets' ? '#' : 'index.html#Technology'}" class="category-chip" data-category="Technology" ${categoryOnclick.replace('{{CATEGORY}}', 'Technology')}>
          <i class="fa-solid fa-microchip"></i> Tech
        </a>
        <a href="${currentPage === 'markets' ? '#' : 'index.html#Science'}" class="category-chip" data-category="Science" ${categoryOnclick.replace('{{CATEGORY}}', 'Science')}>
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
            <a href="${currentPage === 'markets' ? '#' : 'index.html#all'}" class="sidebar-category-link" data-category="all" ${categoryOnclick.replace('{{CATEGORY}}', 'all')}>
                <i class="fa-solid fa-chart-line"></i>
                All Markets
            </a>
            <a href="${currentPage === 'markets' ? '#' : 'index.html#Politics'}" class="sidebar-category-link" data-category="Politics" ${categoryOnclick.replace('{{CATEGORY}}', 'Politics')}>
                <i class="fa-solid fa-landmark"></i>
                Politics
            </a>
            <a href="${currentPage === 'markets' ? '#' : 'index.html#Sports'}" class="sidebar-category-link" data-category="Sports" ${categoryOnclick.replace('{{CATEGORY}}', 'Sports')}>
                <i class="fa-solid fa-futbol"></i>
                Sports
            </a>
            <a href="${currentPage === 'markets' ? '#' : 'index.html#Finance'}" class="sidebar-category-link" data-category="Finance" ${categoryOnclick.replace('{{CATEGORY}}', 'Finance')}>
                <i class="fa-solid fa-dollar-sign"></i>
                Finance
            </a>
            <a href="${currentPage === 'markets' ? '#' : 'index.html#Crypto'}" class="sidebar-category-link" data-category="Crypto" ${categoryOnclick.replace('{{CATEGORY}}', 'Crypto')}>
                <i class="fa-brands fa-bitcoin"></i>
                Crypto
            </a>
            <a href="${currentPage === 'markets' ? '#' : 'index.html#Technology'}" class="sidebar-category-link" data-category="Technology" ${categoryOnclick.replace('{{CATEGORY}}', 'Technology')}>
                <i class="fa-solid fa-microchip"></i>
                Technology
            </a>
            <a href="${currentPage === 'markets' ? '#' : 'index.html#Science'}" class="sidebar-category-link" data-category="Science" ${categoryOnclick.replace('{{CATEGORY}}', 'Science')}>
                <i class="fa-solid fa-flask"></i>
                Science
            </a>

            <!-- Separator -->
            <div style="border-top: 1px solid rgba(55, 65, 81, 0.5); margin: 16px 0;"></div>

            <a href="how-it-works.html" class="sidebar-category-link">
                <i class="fa-solid fa-circle-info"></i>
                How It Works
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
    }
}

console.log('✓ Header component loaded');
