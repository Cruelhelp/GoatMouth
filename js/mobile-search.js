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

    show() {
        const overlay = document.createElement('div');
        overlay.className = 'fixed left-0 right-0 bg-gray-900 mobile-search-overlay';

        // Position below the mobile header
        const mobileHeader = document.querySelector('.mobile-header');
        const headerHeight = mobileHeader ? mobileHeader.offsetHeight : 0;

        overlay.style.top = headerHeight + 'px';
        overlay.style.bottom = '60px'; // Account for bottom nav
        overlay.style.zIndex = '45';
        overlay.innerHTML = this.getHTML();

        document.body.appendChild(overlay);
        this.attachListeners(overlay);

        // Auto-focus search input
        setTimeout(() => {
            const input = overlay.querySelector('#mobile-search-input');
            if (input) input.focus();
        }, 100);
    }

    getHTML() {
        return `
            <div class="h-full flex flex-col bg-gray-900" style="padding-top: 0;">
                <!-- Search Header with Back Button -->
                <div class="bg-gray-800 border-b border-gray-700 p-3">
                    <div class="flex items-center gap-2">
                        <button class="p-2 text-gray-400 hover:text-white touch-target" data-action="close-search">
                            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                            </svg>
                        </button>
                        <div class="relative flex-1">
                            <input
                                type="text"
                                id="mobile-search-input"
                                placeholder="Search GoatMouth Market..."
                                class="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                style="font-size: 16px;"
                                autocomplete="off"
                            >
                            ${this.searchQuery ? `
                                <button class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white touch-target" data-action="clear-search">
                                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Search Content -->
                <div class="flex-1 overflow-y-auto" id="search-content">
                    ${this.searchQuery ? this.renderResults() : this.renderDefaultView()}
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
                            <h3 class="text-sm font-semibold text-gray-400 uppercase">Recent</h3>
                            <button class="text-xs text-red-400 hover:text-red-300" data-action="clear-recent">
                                Clear All
                            </button>
                        </div>
                        <div class="space-y-2">
                            ${this.recentSearches.map(search => `
                                <button class="w-full flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-750 rounded-lg transition touch-target text-left" data-action="search-recent" data-query="${this.escapeHtml(search)}">
                                    <svg class="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <span class="text-white">${this.escapeHtml(search)}</span>
                                    <button class="ml-auto text-gray-500 hover:text-red-400 p-1" data-action="remove-recent" data-query="${this.escapeHtml(search)}" onclick="event.stopPropagation()">
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
                    <h3 class="text-sm font-semibold text-gray-400 uppercase mb-3">Suggested</h3>
                    <div class="flex flex-wrap gap-2">
                        ${this.suggestedSearches.map(search => `
                            <button class="px-4 py-2 bg-gray-800 hover:bg-gray-750 rounded-full text-sm font-medium transition touch-target" style="color: #00CB97; border: 1px solid rgba(0, 203, 151, 0.3);" data-action="search-suggested" data-query="${search}">
                                ${search}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Popular Categories -->
                <div>
                    <h3 class="text-sm font-semibold text-gray-400 uppercase mb-3">Browse by Category</h3>
                    <div class="grid grid-cols-2 gap-2">
                        ${this.renderCategoryButtons()}
                    </div>
                </div>
            </div>
        `;
    }

    renderCategoryButtons() {
        const categories = [
            { name: 'Politics', color: '#00CB97' },
            { name: 'Sports', color: '#631BDD' },
            { name: 'Finance', color: '#F2C300' },
            { name: 'Crypto', color: '#00CB97' },
            { name: 'Technology', color: '#631BDD' },
            { name: 'Science', color: '#F2C300' }
        ];

        return categories.map(cat => `
            <button class="p-3 bg-gray-800 hover:bg-gray-750 rounded-lg transition touch-target text-left" data-action="search-category" data-category="${cat.name}">
                <div class="font-semibold" style="color: ${cat.color};">${cat.name}</div>
            </button>
        `).join('');
    }

    async renderResults() {
        try {
            // Search markets
            const markets = await this.searchMarkets(this.searchQuery);

            if (markets.length === 0) {
                return `
                    <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <svg class="h-16 w-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <p class="text-gray-400 text-lg mb-2">No markets found</p>
                        <p class="text-gray-500 text-sm">Try searching for something else</p>
                    </div>
                `;
            }

            return `
                <div class="p-4">
                    <p class="text-sm text-gray-400 mb-3">${markets.length} result${markets.length !== 1 ? 's' : ''}</p>
                    <div class="space-y-3">
                        ${markets.map(market => this.renderMarketResult(market)).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Search error:', error);
            return `
                <div class="text-center py-12 text-red-400">
                    Error loading results
                </div>
            `;
        }
    }

    renderMarketResult(market) {
        const yesPercent = (market.yes_price * 100).toFixed(0);

        return `
            <button class="w-full p-3 bg-gray-800 hover:bg-gray-750 rounded-lg transition touch-target text-left" data-action="open-market" data-market-id="${market.id}">
                <div class="flex items-start justify-between gap-3 mb-2">
                    <div class="flex-1 min-w-0">
                        ${market.category ? `<span class="text-xs px-2 py-0.5 rounded mb-1 inline-block" style="background-color: rgba(0, 203, 151, 0.15); color: #00CB97;">${market.category}</span>` : ''}
                        <h4 class="font-semibold text-white mb-1 line-clamp-2">${this.highlightQuery(market.title)}</h4>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <div class="text-xs text-gray-400 mb-1">YES</div>
                        <div class="text-lg font-bold" style="color: #00CB97;">${yesPercent}¢</div>
                    </div>
                </div>
                <div class="flex items-center gap-3 text-xs text-gray-400">
                    <span>Vol: $${parseFloat(market.total_volume).toFixed(0)}</span>
                    <span>•</span>
                    <span>Ends ${new Date(market.end_date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>
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

        // Search input
        let searchTimeout;
        input.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();

            searchTimeout = setTimeout(async () => {
                this.searchQuery = query;
                content.innerHTML = query ? await this.renderResults() : this.renderDefaultView();
                this.attachContentListeners(overlay);
            }, 300);
        });

        // Close button
        overlay.querySelector('[data-action="close-search"]').addEventListener('click', () => {
            overlay.remove();
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
                overlay.remove();
                this.app.filterByCategory(category);
            });
        });

        // Open market
        content.querySelectorAll('[data-action="open-market"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const marketId = btn.dataset.marketId;
                this.saveRecentSearch(this.searchQuery);
                overlay.remove();
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
