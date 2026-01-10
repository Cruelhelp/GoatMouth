// ====================================
// SIDEBAR COMPONENT - GoatMouth
// Shared right sidebar (Updates + Live Feed) and Updates Modal
// ====================================

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
            <div class="live-feed-content" id="twitter-feed-container">
                <!-- Twitter feed will load here -->
            </div>
        </div>
    </aside>
    `;
}

function renderUpdatesModal() {
    return `
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

            <!-- Email Form -->
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

// Auto-inject sidebar on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const sidebarContainer = document.getElementById('sidebar-container');
        if (sidebarContainer) {
            sidebarContainer.innerHTML = renderSidebar();
        }

        const modalContainer = document.getElementById('updates-modal-container');
        if (modalContainer) {
            modalContainer.innerHTML = renderUpdatesModal();
        }
    });
} else {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer) {
        sidebarContainer.innerHTML = renderSidebar();
    }

    const modalContainer = document.getElementById('updates-modal-container');
    if (modalContainer) {
        modalContainer.innerHTML = renderUpdatesModal();
    }
}

console.log('✓ Sidebar component loaded');
