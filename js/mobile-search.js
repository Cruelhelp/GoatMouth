// Mobile Search Component
class MobileSearch {
    constructor(app) {
        this.app = app;
        this.searchQuery = '';
        this.recentSearches = this.loadRecentSearches();
        this.suggestedSearches = [
            'Trump',
            'Bitcoin',
            'Elections',
            'Sports',
            'Technology',
            'Finance'
        ];
    }

    loadRecentSearches() {
        try {
            const stored = localStorage.getItem('goatmouth_recent_searches');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            return [];
        }
    }

    saveRecentSearch(query) {
        if (!query || query.trim().length < 2) return;

        // Remove if already exists
        this.recentSearches = this.recentSearches.filter(s => s.toLowerCase() !== query.toLowerCase());

        // Add to beginning
        this.recentSearches.unshift(query.trim());

        // Keep only last 10
        this.recentSearches = this.recentSearches.slice(0, 10);

        // Save to localStorage
        try {
            localStorage.setItem('goatmouth_recent_searches', JSON.stringify(this.recentSearches));
        } catch (error) {
            console.error('Error saving recent searches:', error);
        }
    }

    clearRecentSearches() {
        this.recentSearches = [];
        localStorage.removeItem('goatmouth_recent_searches');
    }

    async show() {
        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'mobile-search-backdrop';
        backdrop.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); z-index: 44; backdrop-filter: blur(4px);';
        backdrop.onclick = () => this.close();

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'fixed left-0 right-0 bg-gray-900 mobile-search-overlay';
        overlay.id = 'mobile-search-overlay-active';

        // Position below the logo header AND menubar
        const logoHeader = document.querySelector('.logo-header');
        const menubar = document.querySelector('.menubar');
        const headerHeight = (logoHeader ? logoHeader.offsetHeight : 0) + (menubar ? menubar.offsetHeight : 0);

        overlay.style.top = headerHeight + 'px';
        overlay.style.bottom = '0';
        overlay.style.zIndex = '45';
        overlay.innerHTML = await this.getHTML();

        document.body.appendChild(backdrop);
        document.body.appendChild(overlay);
        this.currentOverlay = overlay;
        this.currentBackdrop = backdrop;
        this.attachListeners(overlay);

        // Mark search button as active and remove active from others
        const navItems = document.querySelectorAll('.mobile-nav-item');
        navItems.forEach(btn => {
            const span = btn.querySelector('span');
            if (span && span.textContent.trim() === 'Search') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Auto-focus search input
        setTimeout(() => {
            const input = overlay.querySelector('#mobile-search-input');
            if (input) input.focus();
        }, 100);
    }

    close() {
        // Remove active class from search button and restore to appropriate page
        const navItems = document.querySelectorAll('.mobile-nav-item');
        const isOnIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '';
        const isOnVotingPage = window.location.pathname.includes('voting.html');

        navItems.forEach(btn => {
            const span = btn.querySelector('span');
            if (span) {
                const text = span.textContent.trim();
                if (text === 'Search') {
                    btn.classList.remove('active');
                } else if (text === 'Home' && isOnIndexPage) {
                    btn.classList.add('active');
                } else if (text === 'Voting' && isOnVotingPage) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });

        if (this.currentOverlay) this.currentOverlay.remove();
        if (this.currentBackdrop) this.currentBackdrop.remove();
        this.currentOverlay = null;
        this.currentBackdrop = null;
    }

    async getHTML() {
        const initialContent = this.searchQuery ? await this.renderResults() : this.renderDefaultView();

        return `
            <div class="h-full flex flex-col" style="padding-top: 0; padding-bottom: 60px; background: linear-gradient(135deg, #111827 0%, #1f2937 100%);">
                <!-- Search Header -->
                <div class="border-b p-4" style="background: #1f2937; border-color: rgba(0, 203, 151, 0.2);">
                    <div class="relative">
                        ${!this.searchQuery ? `
                            <svg class="h-5 w-5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style="color: #00CB97;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                        ` : ''}
                        <input
                            type="text"
                            id="mobile-search-input"
                            name="mobile-search"
                            placeholder="Search markets..."
                            value="${this.escapeHtml(this.searchQuery)}"
                            style="font-size: 16px; background: #111827; border: 2px solid #374151; color: white; border-radius: 12px; padding: 12px 44px 12px 12px; width: 100%; transition: all 0.3s ease;"
                            onfocus="this.style.borderColor='#00CB97'; this.style.boxShadow='0 0 0 3px rgba(0, 203, 151, 0.1)'"
                            onblur="this.style.borderColor='#374151'; this.style.boxShadow='none'"
                            autocomplete="off"
                        >
                        ${this.searchQuery ? `
                            <button class="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full touch-target transition" style="color: #9ca3af;" data-action="clear-search" onmouseover="this.style.color='#00CB97'" onmouseout="this.style.color='#9ca3af'">
                                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Search Content -->
                <div class="flex-1 overflow-y-auto" id="search-content" style="background: #111827;">
                    ${initialContent}
                </div>
            </div>
        `;
    }

    renderDefaultView() {
        return `
            <div class="p-4">
                <!-- Recent Searches -->
                ${this.recentSearches.length > 0 ? `
                    <div class="mb-6">
                        <div class="flex items-center justify-between mb-3">
                            <h3 class="text-xs font-bold uppercase tracking-wider" style="color: #9ca3af;">Recent Searches</h3>
                            <button class="text-xs font-semibold transition" style="color: #ef4444;" data-action="clear-recent" onmouseover="this.style.color='#dc2626'" onmouseout="this.style.color='#ef4444'">
                                Clear All
                            </button>
                        </div>
                        <div class="space-y-2">
                            ${this.recentSearches.map(search => `
                                <button class="w-full flex items-center gap-3 p-3.5 rounded-xl transition touch-target text-left" style="background: #1f2937; border: 1px solid #374151;" data-action="search-recent" data-query="${this.escapeHtml(search)}" onmouseover="this.style.borderColor='#00CB97'; this.style.background='#252f3f'" onmouseout="this.style.borderColor='#374151'; this.style.background='#1f2937'">
                                    <svg class="h-5 w-5 flex-shrink-0" style="color: #00CB97;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <span class="text-white font-medium flex-1">${this.escapeHtml(search)}</span>
                                    <button class="p-1.5 rounded-lg transition" style="color: #6b7280;" data-action="remove-recent" data-query="${this.escapeHtml(search)}" onclick="event.stopPropagation()" onmouseover="this.style.color='#ef4444'; this.style.background='rgba(239, 68, 68, 0.1)'" onmouseout="this.style.color='#6b7280'; this.style.background='transparent'">
                                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                        </svg>
                                    </button>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Suggested Searches -->
                <div class="mb-6">
                    <h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color: #9ca3af;">Trending Searches</h3>
                    <div class="flex flex-wrap gap-2">
                        ${this.suggestedSearches.map(search => `
                            <button class="px-4 py-2.5 rounded-full text-sm font-semibold transition touch-target" style="background: linear-gradient(135deg, rgba(0, 203, 151, 0.1) 0%, rgba(0, 203, 151, 0.05) 100%); color: #00CB97; border: 1.5px solid rgba(0, 203, 151, 0.3);" data-action="search-suggested" data-query="${search}" onmouseover="this.style.background='linear-gradient(135deg, rgba(0, 203, 151, 0.2) 0%, rgba(0, 203, 151, 0.1) 100%)'; this.style.borderColor='#00CB97'" onmouseout="this.style.background='linear-gradient(135deg, rgba(0, 203, 151, 0.1) 0%, rgba(0, 203, 151, 0.05) 100%)'; this.style.borderColor='rgba(0, 203, 151, 0.3)'">
                                ${search}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderCategoryButtons() {
        const categories = [
            { name: 'Politics', color: '#00CB97', icon: '🏛️', gradient: 'linear-gradient(135deg, rgba(0, 203, 151, 0.15) 0%, rgba(0, 203, 151, 0.05) 100%)' },
            { name: 'Sports', color: '#631BDD', icon: '⚽', gradient: 'linear-gradient(135deg, rgba(99, 27, 221, 0.15) 0%, rgba(99, 27, 221, 0.05) 100%)' },
            { name: 'Finance', color: '#F2C300', icon: '💰', gradient: 'linear-gradient(135deg, rgba(242, 195, 0, 0.15) 0%, rgba(242, 195, 0, 0.05) 100%)' },
            { name: 'Crypto', color: '#00CB97', icon: '₿', gradient: 'linear-gradient(135deg, rgba(0, 203, 151, 0.15) 0%, rgba(0, 203, 151, 0.05) 100%)' },
            { name: 'Technology', color: '#631BDD', icon: '💻', gradient: 'linear-gradient(135deg, rgba(99, 27, 221, 0.15) 0%, rgba(99, 27, 221, 0.05) 100%)' },
            { name: 'Science', color: '#F2C300', icon: '🔬', gradient: 'linear-gradient(135deg, rgba(242, 195, 0, 0.15) 0%, rgba(242, 195, 0, 0.05) 100%)' }
        ];

        return categories.map(cat => `
            <button class="p-4 rounded-xl transition touch-target text-left" style="background: ${cat.gradient}; border: 1.5px solid rgba(55, 65, 81, 0.5);" data-action="search-category" data-category="${cat.name}" onmouseover="this.style.borderColor='${cat.color}'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0, 0, 0, 0.3)'" onmouseout="this.style.borderColor='rgba(55, 65, 81, 0.5)'; this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                <div class="text-2xl mb-1.5">${cat.icon}</div>
                <div class="font-bold text-sm" style="color: ${cat.color};">${cat.name}</div>
            </button>
        `).join('');
    }

    async renderResults() {
        try {
            // Search markets
            const markets = await this.searchMarkets(this.searchQuery);

            if (markets.length === 0) {
                return `
                    <div class="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div class="w-20 h-20 rounded-full flex items-center justify-center mb-4" style="background: linear-gradient(135deg, rgba(0, 203, 151, 0.1) 0%, rgba(0, 203, 151, 0.05) 100%);">
                            <svg class="h-10 w-10" style="color: #00CB97;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                        </div>
                        <p class="text-white text-lg font-bold mb-2">No markets found</p>
                        <p class="text-gray-400 text-sm">Try different keywords or browse categories</p>
                    </div>
                `;
            }

            return `
                <div class="p-4">
                    <div class="flex items-center gap-2 mb-4 pb-3" style="border-bottom: 1px solid #374151;">
                        <svg class="h-5 w-5" style="color: #00CB97;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                        <p class="text-sm font-bold" style="color: #00CB97;">${markets.length} Result${markets.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div class="space-y-3">
                        ${markets.map(market => this.renderMarketResult(market)).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Search error:', error);
            return `
                <div class="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div class="w-20 h-20 rounded-full flex items-center justify-center mb-4" style="background: rgba(239, 68, 68, 0.1);">
                        <svg class="h-10 w-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <p class="text-red-400 font-bold">Error loading results</p>
                    <p class="text-gray-400 text-sm mt-2">Please try again</p>
                </div>
            `;
        }
    }

    renderMarketResult(market) {
        const yesPercent = (market.yes_price * 100).toFixed(0);

        return `
            <button class="w-full p-4 rounded-xl transition touch-target text-left" style="background: #1f2937; border: 1.5px solid #374151;" data-action="open-market" data-market-id="${market.id}" onmouseover="this.style.borderColor='#00CB97'; this.style.background='#252f3f'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0, 203, 151, 0.1)'" onmouseout="this.style.borderColor='#374151'; this.style.background='#1f2937'; this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                <div class="flex items-start justify-between gap-3 mb-3">
                    <div class="flex-1 min-w-0">
                        ${market.category ? `<span class="text-xs px-2.5 py-1 rounded-full mb-2 inline-block font-bold" style="background: linear-gradient(135deg, rgba(0, 203, 151, 0.2) 0%, rgba(0, 203, 151, 0.1) 100%); color: #00CB97; border: 1px solid rgba(0, 203, 151, 0.3);">${market.category}</span>` : ''}
                        <h4 class="font-bold text-white mb-1 line-clamp-2" style="font-size: 15px; line-height: 1.4;">${this.highlightQuery(market.title)}</h4>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <div class="text-xs font-semibold mb-1" style="color: #9ca3af;">YES</div>
                        <div class="text-xl font-black" style="color: #00CB97;">${yesPercent}¢</div>
                    </div>
                </div>
                <div class="flex items-center gap-3 text-xs font-medium" style="color: #6b7280;">
                    <span class="flex items-center gap-1">
                        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                        </svg>
                        $${parseFloat(market.total_volume).toFixed(0)}
                    </span>
                    <span>•</span>
                    <span class="flex items-center gap-1">
                        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        ${new Date(market.end_date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
                    </span>
                </div>
            </button>
        `;
    }

    highlightQuery(text) {
        if (!this.searchQuery) return this.escapeHtml(text);

        const regex = new RegExp(`(${this.escapeRegex(this.searchQuery)})`, 'gi');
        return this.escapeHtml(text).replace(regex, '<mark style="background-color: #00CB97; color: black; padding: 0 2px; border-radius: 2px;">$1</mark>');
    }

    async searchMarkets(query) {
        try {
            const { data, error } = await this.app.api.db
                .from('markets')
                .select('*')
                .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
                .eq('status', 'active')
                .order('total_volume', { ascending: false })
                .limit(20);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error searching markets:', error);
            return [];
        }
    }

    attachListeners(overlay) {
        const input = overlay.querySelector('#mobile-search-input');
        const content = overlay.querySelector('#search-content');

        // Search input with optimized debouncing
        let searchTimeout;
        input.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();

            // Immediate feedback for empty search
            if (!query) {
                this.searchQuery = '';
                content.innerHTML = this.renderDefaultView();
                this.attachContentListeners(overlay);
                return;
            }

            // Show loading state
            if (query.length > 0) {
                content.innerHTML = `
                    <div class="flex items-center justify-center py-12">
                        <div class="flex flex-col items-center gap-3">
                            <div class="w-12 h-12 border-4 rounded-full" style="border-color: #00CB97; border-top-color: transparent; animation: spin 1s linear infinite;"></div>
                            <p class="text-sm font-medium" style="color: #9ca3af;">Searching...</p>
                        </div>
                    </div>
                    <style>
                        @keyframes spin {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                    </style>
                `;
            }

            // Debounce actual search (200ms for faster response)
            searchTimeout = setTimeout(async () => {
                this.searchQuery = query;
                content.innerHTML = await this.renderResults();
                this.attachContentListeners(overlay);
            }, 200);
        });

        // Keyboard shortcuts
        input.addEventListener('keydown', (e) => {
            // Escape to close overlay
            if (e.key === 'Escape') {
                this.close();
            }
            // Enter to search immediately (skip debounce)
            if (e.key === 'Enter') {
                clearTimeout(searchTimeout);
                const query = input.value.trim();
                if (query) {
                    this.searchQuery = query;
                    this.performSearch(overlay);
                }
            }
        });


        // Content listeners
        this.attachContentListeners(overlay);
    }

    attachContentListeners(overlay) {
        const content = overlay.querySelector('#search-content');

        // Clear search
        const clearBtn = overlay.querySelector('[data-action="clear-search"]');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                const input = overlay.querySelector('#mobile-search-input');
                input.value = '';
                input.focus();
                this.searchQuery = '';
                content.innerHTML = this.renderDefaultView();
                this.attachContentListeners(overlay);

                // Update the clear button visibility
                clearBtn.style.display = 'none';
            });
        }

        // Recent search click
        content.querySelectorAll('[data-action="search-recent"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const query = btn.dataset.query;
                const input = overlay.querySelector('#mobile-search-input');
                input.value = query;
                this.searchQuery = query;
                this.performSearch(overlay);
            });
        });

        // Remove recent search
        content.querySelectorAll('[data-action="remove-recent"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const query = btn.dataset.query;
                this.recentSearches = this.recentSearches.filter(s => s !== query);
                localStorage.setItem('goatmouth_recent_searches', JSON.stringify(this.recentSearches));
                content.innerHTML = this.renderDefaultView();
                this.attachContentListeners(overlay);
            });
        });

        // Clear all recent
        const clearAllBtn = content.querySelector('[data-action="clear-recent"]');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                this.clearRecentSearches();
                content.innerHTML = this.renderDefaultView();
                this.attachContentListeners(overlay);
            });
        }

        // Suggested search
        content.querySelectorAll('[data-action="search-suggested"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const query = btn.dataset.query;
                const input = overlay.querySelector('#mobile-search-input');
                input.value = query;
                this.searchQuery = query;
                this.performSearch(overlay);
            });
        });

        // Category browse
        content.querySelectorAll('[data-action="search-category"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                this.saveRecentSearch(category);
                this.close();
                this.app.filterByCategory(category);
            });
        });

        // Open market
        content.querySelectorAll('[data-action="open-market"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const marketId = btn.dataset.marketId;
                this.saveRecentSearch(this.searchQuery);
                this.close();
                this.app.showMarketDetail(marketId);
            });
        });
    }

    async performSearch(overlay) {
        const content = overlay.querySelector('#search-content');
        content.innerHTML = await this.renderResults();
        this.attachContentListeners(overlay);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// Export to window
window.MobileSearch = MobileSearch;
