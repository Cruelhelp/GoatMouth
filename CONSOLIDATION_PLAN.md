# GoatMouth Code Consolidation Plan
## Step-by-Step Implementation Guide

---

## Overview
This plan consolidates ~1,800 lines of duplicate code across the GoatMouth application, reducing the codebase by 40-50% and improving maintainability.

**Total Estimated Time:** 12-16 hours
**Risk Level:** Medium (requires thorough testing)
**Recommended Approach:** Incremental implementation with testing at each phase

---

## PHASE 1: JavaScript Consolidation (Critical Priority)
**Estimated Time:** 3-4 hours | **Impact:** Eliminates 300+ lines of duplicate code

### Step 1.1: Create Shared Components File (30 mins)

**Action:** Create `/js/shared-components.js`

**File Structure:**
```javascript
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
        if (window.supabaseClient) {
            await window.supabaseClient.auth.signOut();
        }
        localStorage.clear();
        sessionStorage.clear();

        // Clear cookies
        document.cookie.split(";").forEach(function(c) {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });

        // Clear app state if exists
        if (window.app) {
            window.app.currentUser = null;
            window.app.currentProfile = null;
        }

        window.location.replace(window.location.origin + '/index.html');
    } catch (error) {
        console.error('Logout error:', error);
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace(window.location.origin + '/index.html');
    }
}

function showUserProfile() {
    // Check if we're on index.html with app instance
    if (window.app && window.app.navigate) {
        window.app.navigate('activity');
    } else {
        // Redirect to index.html
        window.location.href = 'index.html#activity';
    }
}

function showAuthModal(mode) {
    // Check if we're on index.html with app instance
    if (window.app && window.app.showAuthModal) {
        window.app.showAuthModal(mode);
    } else {
        // Redirect to index.html with auth mode
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
    console.log('🎨 Initializing banner...');

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

    let attempts = 0;
    while ((!window.supabaseClient || !window.GoatMouthAPI || !window.BannerCarousel) && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    if (window.supabaseClient && window.GoatMouthAPI && window.BannerCarousel) {
        try {
            const api = new GoatMouthAPI(window.supabaseClient);
            window.bannerCarousel = new BannerCarousel({ api });

            await window.bannerCarousel.loadBanners();

            const bannerContainer = document.getElementById('banner-container');
            const bannerContent = bannerContainer ? bannerContainer.querySelector('.banner-content') : null;

            if (bannerContainer && bannerContent && window.bannerCarousel.banners.length > 0) {
                window.bannerCarousel.render(bannerContainer);
                console.log('✓ Banner rendered');
            } else {
                const spinner = document.getElementById('bannerSpinner');
                if (spinner) spinner.style.display = 'none';
            }
        } catch (error) {
            console.error('❌ Error initializing banner:', error);
            const spinner = document.getElementById('bannerSpinner');
            if (spinner) spinner.style.display = 'none';
        }
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

    if (authLoading) authLoading.style.display = 'none';

    if (user && profile) {
        // User is logged in
        if (authButtons) authButtons.style.display = 'none';
        if (profileBtn) profileBtn.style.display = 'flex';
        if (logoutBtn) logoutBtn.style.display = 'flex';
        if (userBadge) userBadge.style.display = 'flex';

        // Update username
        const userName = document.getElementById('currentUserName');
        if (userName) userName.textContent = profile.username;

        // Show admin panel button if user is admin
        if (adminPanelBtn && profile.role === 'admin') {
            adminPanelBtn.style.display = 'flex';
        }
    } else {
        // User is not logged in
        if (authButtons) authButtons.style.display = 'flex';
        if (profileBtn) profileBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userBadge) userBadge.style.display = 'none';
        if (adminPanelBtn) adminPanelBtn.style.display = 'none';
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
```

**Files to Create:**
- `/js/shared-components.js` (new file)

---

### Step 1.2: Add Script to All Pages (45 mins)

**Action:** Add `<script src="js/shared-components.js"></script>` to all HTML pages

**Pages to Update:**
1. `index.html` - Add after supabase-client.js, before app.js
2. `voting.html` - Add after supabase-client.js, before voting.js
3. `earn.html` - Add after supabase-client.js
4. `contact.html` - Add after supabase-client.js
5. `privacy.html` - Add after supabase-client.js
6. `how-it-works.html` - Add after supabase-client.js

**Example for each page:**
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/supabase-client.js"></script>
<script src="js/shared-components.js"></script> <!-- ADD THIS LINE -->
<script src="js/app.js"></script> <!-- or voting.js, etc. -->
```

---

### Step 1.3: Remove Duplicate Functions (1 hour)

**Action:** Remove duplicate function definitions from each page

**For each page, remove these inline `<script>` blocks:**

**Pages:** voting.html, earn.html, contact.html, privacy.html, how-it-works.html

**Functions to Remove:**
- `toggleMobileSidebar()`
- `closeMobileSidebar()`
- `handleLogout()`
- `showUserProfile()`
- `openUpdatesModal()` (voting.html, earn.html only)
- `closeUpdatesModal()` (voting.html, earn.html only)
- `closeBanner()` (voting.html, earn.html only)
- `reopenBanner()` (voting.html, earn.html only)
- `initBanner()` (voting.html, earn.html only - replace with shared version)
- `updateHeaderUI()` (all pages)
- `showAuthModal()` (all pages)

**Keep in each page:**
- Page-specific initialization code
- Page-specific event handlers
- Unique functionality

---

### Step 1.4: Update index.html Special Cases (30 mins)

**Action:** Keep index.html functions but ensure they call shared functions when appropriate

**index.html Approach:**
- Keep `app.js` with its methods
- Update `app.showAuthModal()` to match shared implementation
- Ensure logout calls shared `handleLogout()` for consistency
- Keep `app.navigate()` and other app-specific methods

---

### Step 1.5: Test JavaScript Consolidation (1 hour)

**Testing Checklist:**

For **EACH** page (index.html, voting.html, earn.html, contact.html, privacy.html, how-it-works.html):

- [ ] Mobile sidebar opens/closes correctly
- [ ] Logout works and redirects properly
- [ ] Profile button navigates correctly
- [ ] Auth buttons (Login/Signup) work
- [ ] Updates modal opens/closes (where applicable)
- [ ] Banner shows/hides correctly (where applicable)
- [ ] No console errors
- [ ] Admin button shows for admin users only

**Test in browsers:**
- Chrome/Edge (desktop & mobile view)
- Firefox
- Safari (if available)

---

## PHASE 2: HTML Component Templates (High Priority)
**Estimated Time:** 4-5 hours | **Impact:** Eliminates 1,500+ lines of duplicate HTML

### Step 2.1: Create Header Template (1 hour)

**Decision Point:** Choose template approach:
- **Option A:** JavaScript-based component (easier, no server required)
- **Option B:** PHP includes (requires PHP server)
- **Option C:** Static site generator (best long-term, more setup)

**Recommended: Option A (JavaScript-based)**

**Action:** Create `/js/header-component.js`

```javascript
// Header Component - Shared across all pages
function renderHeader(options = {}) {
    const {
        currentPage = 'markets',
        showAdminButton = true,
        logoLink = 'index.html'
    } = options;

    return `
    <!-- Logo Header -->
    <div class="logo-header">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div class="hamburger" id="hamburger" title="Toggle Menu" onclick="toggleMobileSidebar()">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <a href="${logoLink}" class="logo-container">
          <img src="assets/official.png" alt="GoatMouth Logo" class="main-logo">
          <span class="logo-text"><span class="goat">Goat</span><span class="mouth">Mouth</span></span>
        </a>
        <div class="header-search-container">
          <i class="fa-solid fa-search search-icon"></i>
          <input type="text" id="marketSearch" class="search-input" placeholder="Search GoatMouth Markets">
        </div>
      </div>
      <div class="user-info">
        <div class="auth-loading" id="authLoading">
          <div class="auth-spinner"></div>
        </div>
        <div class="user-badge" id="userBadge" style="display: none;">
          <span id="currentUserName">User</span>
          <span id="currentUserRole" class="role-badge">Member</span>
        </div>
        <button class="btn secondary" id="profileBtn" title="Profile" onclick="showUserProfile()" style="display: none;">
          <i class="fa-solid fa-user"></i>
          <span class="btn-text">Profile</span>
        </button>
        ${showAdminButton ? `
        <a href="admin.html" class="btn secondary admin-panel-btn" id="adminPanelBtn" title="Admin Panel" style="display: none;">
          <i class="fa-solid fa-user-shield"></i>
          <span class="btn-text">Admin</span>
        </a>
        ` : ''}
        <button class="btn secondary logout-btn" id="logoutBtn" title="Logout" onclick="handleLogout()" style="display: none;">
          <i class="fa-solid fa-right-from-bracket"></i>
          <span class="btn-text logout-text">Logout</span>
        </button>
        <div class="auth-buttons" id="authButtons" style="display: none;">
          <button class="auth-btn login-btn" onclick="showAuthModal('login')">Login</button>
          <button class="auth-btn signup-btn" onclick="showAuthModal('signup')">Sign Up</button>
        </div>
      </div>
    </div>

    <!-- Navigation Menubar -->
    <div class="menubar">
      <div class="nav-section">
        <a href="index.html" class="nav-btn ${currentPage === 'markets' ? 'active' : ''}">
          <i class="fa-solid fa-house"></i> Markets
        </a>
        <a href="voting.html" class="nav-btn ${currentPage === 'voting' ? 'active' : ''}">
          <i class="fa-solid fa-check-circle"></i> Voting
        </a>
        <a href="earn.html" class="nav-btn ${currentPage === 'earn' ? 'active' : ''}">
          <i class="fa-solid fa-coins"></i> Earn
        </a>
        <a href="index.html#activity" class="nav-btn ${currentPage === 'activity' ? 'active' : ''}">
          <i class="fa-solid fa-chart-line"></i> Activity
        </a>
        <a href="index.html#leaderboard" class="nav-btn ${currentPage === 'leaderboard' ? 'active' : ''}">
          <i class="fa-solid fa-trophy"></i> Leaderboard
        </a>
      </div>
      <div class="category-section desktop-only">
        <span class="category-divider">|</span>
        <a href="index.html#all" class="category-chip" data-category="all">
          <i class="fa-solid fa-chart-line"></i> All
        </a>
        <a href="index.html#Politics" class="category-chip" data-category="Politics">
          <i class="fa-solid fa-landmark"></i> Politics
        </a>
        <a href="index.html#Sports" class="category-chip" data-category="Sports">
          <i class="fa-solid fa-futbol"></i> Sports
        </a>
        <a href="index.html#Finance" class="category-chip" data-category="Finance">
          <i class="fa-solid fa-dollar-sign"></i> Finance
        </a>
        <a href="index.html#Crypto" class="category-chip" data-category="Crypto">
          <i class="fa-brands fa-bitcoin"></i> Crypto
        </a>
        <a href="index.html#Technology" class="category-chip" data-category="Technology">
          <i class="fa-solid fa-microchip"></i> Tech
        </a>
        <a href="index.html#Science" class="category-chip" data-category="Science">
          <i class="fa-solid fa-flask"></i> Science
        </a>
      </div>
    </div>

    <!-- Mobile Sidebar -->
    <div class="mobile-sidebar" id="mobileSidebar">
      <div class="mobile-sidebar-header">
        <h3>Market Categories</h3>
        <button class="close-sidebar" onclick="closeMobileSidebar()">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="mobile-sidebar-content">
        <a href="index.html#all" class="sidebar-category-link" data-category="all">
          <i class="fa-solid fa-chart-line"></i> All Markets
        </a>
        <a href="index.html#Politics" class="sidebar-category-link" data-category="Politics">
          <i class="fa-solid fa-landmark"></i> Politics
        </a>
        <a href="index.html#Sports" class="sidebar-category-link" data-category="Sports">
          <i class="fa-solid fa-futbol"></i> Sports
        </a>
        <a href="index.html#Finance" class="sidebar-category-link" data-category="Finance">
          <i class="fa-solid fa-dollar-sign"></i> Finance
        </a>
        <a href="index.html#Crypto" class="sidebar-category-link" data-category="Crypto">
          <i class="fa-brands fa-bitcoin"></i> Crypto
        </a>
        <a href="index.html#Technology" class="sidebar-category-link" data-category="Technology">
          <i class="fa-solid fa-microchip"></i> Technology
        </a>
        <a href="index.html#Science" class="sidebar-category-link" data-category="Science">
          <i class="fa-solid fa-flask"></i> Science
        </a>
        <div style="border-top: 1px solid rgba(55, 65, 81, 0.5); margin: 16px 0;"></div>
        <a href="how-it-works.html" class="sidebar-category-link">
          <i class="fa-solid fa-circle-info"></i> How It Works
        </a>
      </div>
    </div>

    <!-- Sidebar Overlay -->
    <div class="sidebar-overlay" id="sidebarOverlay" onclick="closeMobileSidebar()"></div>
    `;
}

// Auto-inject header on page load
document.addEventListener('DOMContentLoaded', () => {
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        const currentPage = headerContainer.dataset.page || 'markets';
        const showAdmin = headerContainer.dataset.showAdmin !== 'false';
        const logoLink = headerContainer.dataset.logoLink || 'index.html';

        headerContainer.innerHTML = renderHeader({
            currentPage,
            showAdminButton: showAdmin,
            logoLink
        });
    }
});
```

**Usage in pages:**
Replace entire header HTML with:
```html
<div id="header-container" data-page="voting" data-show-admin="true"></div>
<script src="js/header-component.js"></script>
```

---

### Step 2.2: Create Footer Template (30 mins)

**Action:** Create `/js/footer-component.js`

```javascript
// Footer Component
function renderFooter() {
    return `
    <footer class="desktop-only fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50" style="padding: 6px 0;">
      <div class="w-full flex items-center justify-between text-xs text-gray-400 font-medium">
        <div class="flex items-center gap-3 pl-6">
          <span>GoatMouth © 2025</span>
          <span style="font-size: 10px;">•</span>
          <a href="privacy.html" class="hover:text-white transition">Privacy</a>
          <span style="font-size: 10px;">•</span>
          <a href="terms.html" class="hover:text-white transition">Terms</a>
          <span style="font-size: 10px;">•</span>
          <a href="how-it-works.html" class="hover:text-white transition">How It Works</a>
          <span style="font-size: 10px;">•</span>
          <a href="contact.html" class="hover:text-white transition">Contact</a>
        </div>
        <div class="flex items-center gap-2 pr-6">
          <a href="#" class="hover:text-white transition">
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
            </svg>
          </a>
          <a href="#" class="hover:text-white transition">
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
    `;
}

// Auto-inject footer
document.addEventListener('DOMContentLoaded', () => {
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
        footerContainer.innerHTML = renderFooter();
    }
});
```

**Usage:**
```html
<div id="footer-container"></div>
<script src="js/footer-component.js"></script>
```

---

### Step 2.3: Create Sidebar Template (30 mins)

**Action:** Create `/js/sidebar-component.js`

```javascript
// Sidebar Component (Updates + Live Feed)
function renderSidebar() {
    return `
    <aside class="sidebar-column">
      <!-- Get Daily Updates Box -->
      <div class="updates-box">
        <div>
          <div class="updates-header">
            <i class="fa-solid fa-bell"></i>
            <h3>Get daily updates</h3>
          </div>
          <p class="updates-description">We'll send you an email every day with what's moving on GoatMouth</p>
        </div>
        <div class="updates-form">
          <input type="email" id="sidebar-email-input" name="sidebar-email" class="updates-input" placeholder="Enter your email" autocomplete="email">
          <button class="updates-button">
            <i class="fa-solid fa-paper-plane"></i>
            Get updates
          </button>
        </div>
      </div>

      <!-- Live Feed Placeholder -->
      <div class="live-feed-box">
        <div class="live-feed-header">
          <i class="fa-solid fa-rss"></i>
          <h3>Live Feed</h3>
        </div>
        <div class="live-feed-content">
          <div class="live-feed-placeholder">
            <i class="fa-brands fa-twitter" style="font-size: 32px; color: #1DA1F2; margin-bottom: 12px;"></i>
            <p>Social media feed placeholder</p>
            <span class="feed-subtext">Your social media updates will appear here</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Updates Bottom Sheet Modal -->
    <div class="updates-modal-overlay" id="updatesModalOverlay" onclick="closeUpdatesModal()"></div>
    <div class="updates-modal" id="updatesModal">
      <div class="updates-modal-header">
        <div class="updates-modal-drag-handle"></div>
        <button class="updates-modal-close" onclick="closeUpdatesModal()" style="overflow: hidden;">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="updates-modal-content" style="padding: 1.5rem;">
        <div class="updates-modal-title" style="margin-bottom: 0.75rem;">
          <i class="fa-solid fa-bell"></i>
          <h2 style="font-size: 1.25rem;">Get Daily Updates</h2>
        </div>
        <p class="updates-modal-description" style="font-size: 0.875rem; margin-bottom: 1.25rem;">Get market trends and predictions delivered to your inbox.</p>
        <div class="updates-modal-form">
          <input type="email" id="modal-email-input" name="modal-email" class="updates-modal-input" placeholder="Enter your email address" style="margin-bottom: 0.75rem;" autocomplete="email">
          <button class="updates-modal-button">
            <i class="fa-solid fa-paper-plane"></i>
            Subscribe
          </button>
        </div>
      </div>
    </div>
    `;
}

// Auto-inject sidebar
document.addEventListener('DOMContentLoaded', () => {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer) {
        sidebarContainer.innerHTML = renderSidebar();
    }
});
```

**Usage:**
```html
<div id="sidebar-container"></div>
<script src="js/sidebar-component.js"></script>
```

---

### Step 2.4: Update All Pages to Use Components (2 hours)

**For EACH page:**

1. **Replace header HTML** with:
   ```html
   <div id="header-container" data-page="PAGE_NAME"></div>
   ```

2. **Replace footer HTML** with:
   ```html
   <div id="footer-container"></div>
   ```

3. **Replace sidebar HTML** (if applicable) with:
   ```html
   <div id="sidebar-container"></div>
   ```

4. **Add component scripts** before closing `</body>`:
   ```html
   <script src="js/header-component.js"></script>
   <script src="js/footer-component.js"></script>
   <script src="js/sidebar-component.js"></script> <!-- if page has sidebar -->
   ```

**Page-specific data-page values:**
- index.html: `data-page="markets"`
- voting.html: `data-page="voting"`
- earn.html: `data-page="earn"`
- contact.html: `data-page="contact"`
- privacy.html: `data-page="privacy"`
- how-it-works.html: `data-page="how-it-works"`

---

### Step 2.5: Test HTML Consolidation (1 hour)

**Testing Checklist for EACH page:**

- [ ] Header renders correctly
- [ ] Logo and navigation visible
- [ ] Mobile sidebar works
- [ ] Footer displays (desktop only)
- [ ] Sidebar displays (where applicable)
- [ ] Current page highlighted in nav
- [ ] Admin button shows/hides correctly
- [ ] All links work
- [ ] No layout issues or overlaps
- [ ] Mobile responsive
- [ ] No console errors

---

## PHASE 3: Standardization & Cleanup (Medium Priority)
**Estimated Time:** 3-4 hours | **Impact:** Consistency and maintainability

### Step 3.1: Standardize Navigation (1 hour)

**Action:** Ensure consistent navigation approach

**index.html - Keep as is:**
- Uses buttons with `app.navigate()` for in-page views
- This is correct for SPA behavior

**All other pages - Use `<a href>`:**
- Already mostly standardized
- Verify all pages use proper links

**Admin Button Visibility:**
- Now handled by header-component.js
- Shows automatically for admin users

---

### Step 3.2: Consolidate Auth State Checking (1.5 hours)

**Action:** Create `/js/auth-state.js` for unified auth checking

```javascript
// Unified Auth State Management
class AuthStateManager {
    constructor() {
        this.currentUser = null;
        this.currentProfile = null;
    }

    async checkAuthState() {
        if (!window.supabaseClient || !window.GoatMouthAPI) {
            console.error('Required libraries not loaded');
            return null;
        }

        try {
            const api = new GoatMouthAPI(window.supabaseClient);
            this.currentUser = await api.getCurrentUser();

            if (this.currentUser) {
                this.currentProfile = await api.getProfile(this.currentUser.id);
            }

            updateHeaderUI(this.currentUser, this.currentProfile);
            return { user: this.currentUser, profile: this.currentProfile };
        } catch (error) {
            console.error('Auth check error:', error);
            updateHeaderUI(null, null);
            return null;
        }
    }
}

// Global instance
window.authManager = new AuthStateManager();

// Auto-check auth on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => window.authManager.checkAuthState(), 500);
    });
} else {
    setTimeout(() => window.authManager.checkAuthState(), 500);
}
```

**Add to all pages:**
```html
<script src="js/auth-state.js"></script>
```

---

### Step 3.3: Clean Up Script Loading (30 mins)

**Remove unnecessary scripts from pages:**

**voting.html:**
- Remove: `<script src="js/app.js"></script>` (if present)

**earn.html:**
- Remove: `<script src="js/voting.js"></script>` (if present)

**index.html:**
- Keep all current scripts (voting.js is used)

**Verify script order on all pages:**
```html
<!-- External libraries -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Core libraries -->
<script src="js/supabase-client.js"></script>
<script src="js/toast.js"></script>
<script src="js/api.js"></script>

<!-- Shared components (NEW) -->
<script src="js/shared-components.js"></script>
<script src="js/auth-state.js"></script>

<!-- Components (NEW) -->
<script src="js/header-component.js"></script>
<script src="js/footer-component.js"></script>
<script src="js/sidebar-component.js"></script> <!-- if needed -->

<!-- Page-specific -->
<script src="js/app.js"></script> <!-- index.html only -->
<script src="js/voting.js"></script> <!-- voting.html only -->
<!-- etc. -->
```

---

### Step 3.4: Final Testing (1 hour)

**Complete System Test:**

Test **ALL** features on **ALL** pages:

**Functional Tests:**
- [ ] Login/Signup flow
- [ ] Logout
- [ ] Profile navigation
- [ ] Mobile sidebar
- [ ] Updates modal
- [ ] Banner show/hide
- [ ] Navigation between pages
- [ ] Admin features (as admin user)
- [ ] Search functionality
- [ ] Category filtering

**Cross-Browser Tests:**
- [ ] Chrome (desktop)
- [ ] Chrome (mobile view)
- [ ] Firefox
- [ ] Safari
- [ ] Edge

**Performance Check:**
- [ ] No console errors
- [ ] Page load times acceptable
- [ ] No duplicate network requests
- [ ] Proper caching

---

## PHASE 4: Documentation & Cleanup (Low Priority)
**Estimated Time:** 1-2 hours

### Step 4.1: Update Documentation

**Create `/docs/ARCHITECTURE.md`:**
- Document component system
- Explain shared-components.js
- List all global functions
- Describe auth flow

**Update README.md** (if exists):
- Note consolidation changes
- Update file structure
- Add development guidelines

---

### Step 4.2: Code Cleanup

**Remove old backup code:**
- Search for commented-out duplicate functions
- Remove unused variables
- Clean up console.logs

**Verify file structure:**
```
/GoatMouth-main/
  /css/
  /js/
    - shared-components.js (NEW)
    - auth-state.js (NEW)
    - header-component.js (NEW)
    - footer-component.js (NEW)
    - sidebar-component.js (NEW)
    - app.js
    - voting.js
    - admin.js
    - api.js
    - etc.
  /assets/
  - index.html
  - voting.html
  - earn.html
  - etc.
  - CONSOLIDATION_PLAN.md (this file)
```

---

## ROLLBACK PLAN

**If issues occur:**

1. **Git Rollback** (if using version control):
   ```bash
   git checkout -- .
   git clean -fd
   ```

2. **Manual Rollback:**
   - Keep backups of original files before changes
   - Remove new component JS files
   - Restore original HTML files
   - Remove `<script>` references to new files

3. **Incremental Rollback:**
   - Phase 3 issues? Revert Phase 3 only
   - Phase 2 issues? Revert to shared-components.js only
   - Phase 1 issues? Remove shared-components.js

---

## SUCCESS CRITERIA

**Consolidation is successful when:**

✅ All 6 main pages load without errors
✅ All navigation works correctly
✅ Auth flow works (login/logout/profile)
✅ Mobile sidebar functions on all pages
✅ Admin features work for admin users
✅ No duplicate code in HTML files
✅ No duplicate functions across JS files
✅ Banner/updates/footer consistent across pages
✅ Code reduction of 40%+ achieved
✅ No performance degradation

---

## TIMELINE ESTIMATE

**Aggressive (focused work):**
- Phase 1: 3-4 hours
- Phase 2: 4-5 hours
- Phase 3: 3-4 hours
- Phase 4: 1-2 hours
- **Total: 11-15 hours**

**Conservative (with breaks/testing):**
- Phase 1: 5-6 hours
- Phase 2: 6-7 hours
- Phase 3: 4-5 hours
- Phase 4: 2-3 hours
- **Total: 17-21 hours**

---

## NEXT STEPS

**To Begin Implementation:**

1. ✅ Review this plan
2. ✅ Create backup of current codebase
3. ✅ Create feature branch (if using Git)
4. ✅ Start with Phase 1, Step 1.1
5. ✅ Test after each step
6. ✅ Commit changes incrementally

**Ready to start? Proceed to Phase 1, Step 1.1**

---

*End of Consolidation Plan*
