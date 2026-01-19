// Mobile Search Component
class MobileSearch {
    constructor(app) {
        this.app = app;
        this.searchQuery = '';
        this.recentSearches = this.loadRecentSearches();
        this.categorySuggestions = [];
        this.categorySuggestionLimit = 8;
        this.fallbackCategories = [
            'Politics',
            'Sports',
            'Finance',
            'Crypto',
            'Technology',
            'Science',
            'Culture'
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

    getFallbackCategorySuggestions() {
        return this.fallbackCategories.map((name) => ({ name, count: null, volume: 0 }));
    }

    buildCategorySuggestions(markets) {
        if (!Array.isArray(markets) || markets.length === 0) return [];

        const stats = new Map();
        markets.forEach((market) => {
            const category = (market.category || '').trim();
            if (!category) return;

            const totalVolume = Number(market.total_volume || 0);
            const existing = stats.get(category) || { name: category, count: 0, volume: 0 };
            existing.count += 1;
            if (Number.isFinite(totalVolume)) {
                existing.volume += totalVolume;
            }
            stats.set(category, existing);
        });

        return Array.from(stats.values())
            .sort((a, b) => {
                if (b.volume !== a.volume) return b.volume - a.volume;
                if (b.count !== a.count) return b.count - a.count;
                return a.name.localeCompare(b.name);
            })
            .slice(0, this.categorySuggestionLimit);
    }

    async ensureCategorySuggestions() {
        const fromApp = this.buildCategorySuggestions(this.app && this.app.markets);
        if (fromApp.length) {
            this.categorySuggestions = fromApp;
            return;
        }

        if (this.categorySuggestions.length) return;

        try {
            if (!this.app || !this.app.api || !this.app.api.db) return;

            const { data, error } = await this.app.api.db
                .from('markets')
                .select('category, total_volume')
                .eq('status', 'active')
                .order('total_volume', { ascending: false })
                .limit(200);

            if (error) throw error;

            const fromApi = this.buildCategorySuggestions(data || []);
            if (fromApi.length) {
                this.categorySuggestions = fromApi;
                return;
            }
        } catch (error) {
            console.error('Error loading category suggestions:', error);
        }

        this.categorySuggestions = this.getFallbackCategorySuggestions();
    }

    formatCategoryCount(count) {
        if (typeof count !== 'number') return 'Browse';
        return `${count} market${count === 1 ? '' : 's'}`;
    }

    async show() {
        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'mobile-search-backdrop';
        backdrop.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(6, 10, 20, 0.7); z-index: 44; backdrop-filter: blur(6px);';
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
        this.updateHeaderState(overlay, this.searchQuery);
        const content = overlay.querySelector('#search-content');
        const initialNode = this.searchQuery ? await this.renderResults() : this.renderDefaultView();
        this.setSearchContent(content, initialNode);

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
        await this.ensureCategorySuggestions();
        return `
            <div class="h-full flex flex-col" style="padding-top: 0; padding-bottom: 60px; background: linear-gradient(160deg, #0b1220 0%, #111827 55%, #0b1220 100%);">
                <!-- Search Header -->
                <div class="border-b p-4" style="background: rgba(17, 24, 39, 0.98); border-color: rgba(0, 203, 151, 0.18); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);">
                    <div class="relative">
                        <svg class="h-5 w-5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" data-role="search-icon" style="color: #00CB97; ${this.searchQuery ? 'display: none;' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                        <input
                            type="text"
                            id="mobile-search-input"
                            name="mobile-search"
                            placeholder="Search markets..."
                            value="${this.escapeHtml(this.searchQuery)}"
                            style="font-size: 16px; background: #0b1220; border: 1.5px solid #1f2937; color: #f9fafb; border-radius: 14px; padding: 12px 44px 12px 14px; width: 100%; transition: all 0.3s ease;"
                            onfocus="this.style.borderColor='#00CB97'; this.style.boxShadow='0 0 0 3px rgba(0, 203, 151, 0.12)'"
                            onblur="this.style.borderColor='#1f2937'; this.style.boxShadow='none'"
                            autocomplete="off"
                        >
                        <button class="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full touch-target transition" style="color: #9ca3af; ${this.searchQuery ? '' : 'display: none;'}" data-action="clear-search" onmouseover="this.style.color='#00CB97'" onmouseout="this.style.color='#9ca3af'">
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Search Content -->
                <div class="flex-1 overflow-y-auto" id="search-content" style="background: #0b1220;">
                </div>
            </div>
        `;
    }

    updateHeaderState(overlay, query) {
        const icon = overlay.querySelector('[data-role="search-icon"]');
        const clearBtn = overlay.querySelector('[data-action="clear-search"]');
        const hasQuery = !!query;

        if (icon) {
            icon.style.display = hasQuery ? 'none' : '';
        }
        if (clearBtn) {
            clearBtn.style.display = hasQuery ? 'inline-flex' : 'none';
        }
    }

    setSearchContent(content, node) {
        if (!content) return;
        content.replaceChildren(node);
    }

    ensureSpinnerStyles() {
        if (document.getElementById('mobile-search-spinner-style')) return;
        const style = document.createElement('style');
        style.id = 'mobile-search-spinner-style';
        style.textContent = `
            @keyframes mobileSearchSpin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    buildLoadingState() {
        this.ensureSpinnerStyles();
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center justify-center py-12';
        wrapper.innerHTML = `
            <div class="flex flex-col items-center gap-3">
                <div class="w-12 h-12 border-4 rounded-full" style="border-color: #00CB97; border-top-color: transparent; animation: mobileSearchSpin 1s linear infinite;"></div>
                <p class="text-sm font-medium" style="color: #9ca3af;">Searching...</p>
            </div>
        `;
        return wrapper;
    }

    buildEmptyResultsState() {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex flex-col items-center justify-center py-16 px-4 text-center';
        wrapper.innerHTML = `
            <div class="w-20 h-20 rounded-full flex items-center justify-center mb-4" style="background: linear-gradient(135deg, rgba(0, 203, 151, 0.1) 0%, rgba(0, 203, 151, 0.05) 100%);">
                <svg class="h-10 w-10" style="color: #00CB97;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
            </div>
            <p class="text-white text-lg font-bold mb-2">No markets found</p>
            <p class="text-gray-400 text-sm">Try different keywords or browse categories</p>
        `;
        return wrapper;
    }

    buildErrorResultsState() {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex flex-col items-center justify-center py-16 px-4 text-center';
        wrapper.innerHTML = `
            <div class="w-20 h-20 rounded-full flex items-center justify-center mb-4" style="background: rgba(239, 68, 68, 0.1);">
                <svg class="h-10 w-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </div>
            <p class="text-red-400 font-bold">Error loading results</p>
            <p class="text-gray-400 text-sm mt-2">Please try again</p>
        `;
        return wrapper;
    }

    renderDefaultView() {
        const categorySuggestions = this.categorySuggestions.length
            ? this.categorySuggestions
            : this.getFallbackCategorySuggestions();

        const wrapper = document.createElement('div');
        wrapper.className = 'p-4';

        if (this.recentSearches.length > 0) {
            const section = document.createElement('div');
            section.className = 'mb-6';

            const header = document.createElement('div');
            header.className = 'flex items-center justify-between mb-3';

            const title = document.createElement('h3');
            title.className = 'text-xs font-bold uppercase tracking-wider';
            title.style.color = '#9ca3af';
            title.textContent = 'Recent Searches';

            const clearBtn = document.createElement('button');
            clearBtn.className = 'text-xs font-semibold transition';
            clearBtn.dataset.action = 'clear-recent';
            clearBtn.style.color = '#ef4444';
            clearBtn.setAttribute('onmouseover', "this.style.color='#dc2626'");
            clearBtn.setAttribute('onmouseout', "this.style.color='#ef4444'");
            clearBtn.textContent = 'Clear All';

            header.appendChild(title);
            header.appendChild(clearBtn);

            const list = document.createElement('div');
            list.className = 'space-y-2';

            this.recentSearches.forEach(search => {
                const row = document.createElement('div');
                row.className = 'flex items-center gap-2';

                const searchBtn = document.createElement('button');
                searchBtn.className = 'w-full flex items-center gap-3 p-3.5 rounded-xl transition touch-target text-left';
                searchBtn.dataset.action = 'search-recent';
                searchBtn.dataset.query = search;
                searchBtn.style.background = '#1f2937';
                searchBtn.style.border = '1px solid #374151';
                searchBtn.setAttribute('onmouseover', "this.style.borderColor='#00CB97'; this.style.background='#252f3f'");
                searchBtn.setAttribute('onmouseout', "this.style.borderColor='#374151'; this.style.background='#1f2937'");
                searchBtn.innerHTML = `
                    <svg class="h-5 w-5 flex-shrink-0" style="color: #00CB97;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span class="text-white font-medium flex-1">${this.escapeHtml(search)}</span>
                `;

                const removeBtn = document.createElement('button');
                removeBtn.className = 'p-1.5 rounded-lg transition';
                removeBtn.dataset.action = 'remove-recent';
                removeBtn.dataset.query = search;
                removeBtn.style.color = '#6b7280';
                removeBtn.setAttribute('onmouseover', "this.style.color='#ef4444'; this.style.background='rgba(239, 68, 68, 0.1)'");
                removeBtn.setAttribute('onmouseout', "this.style.color='#6b7280'; this.style.background='transparent'");
                removeBtn.innerHTML = `
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                `;

                row.appendChild(searchBtn);
                row.appendChild(removeBtn);
                list.appendChild(row);
            });

            section.appendChild(header);
            section.appendChild(list);
            wrapper.appendChild(section);
        }

        const categorySection = document.createElement('div');
        categorySection.className = 'mb-6';

        const categoryTitle = document.createElement('h3');
        categoryTitle.className = 'text-xs font-bold uppercase tracking-wider mb-3';
        categoryTitle.style.color = '#9ca3af';
        categoryTitle.textContent = 'Top Categories';

        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-2 gap-2';

        categorySuggestions.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'p-3 rounded-xl transition touch-target text-left';
            btn.dataset.action = 'search-category';
            btn.dataset.category = category.name;
            btn.style.background = '#111827';
            btn.style.border = '1.5px solid rgba(0, 203, 151, 0.2)';
            btn.setAttribute('onmouseover', "this.style.borderColor='#00CB97'; this.style.boxShadow='0 6px 16px rgba(0, 203, 151, 0.12)'");
            btn.setAttribute('onmouseout', "this.style.borderColor='rgba(0, 203, 151, 0.2)'; this.style.boxShadow='none'");
            btn.innerHTML = `
                <div class="text-sm font-bold text-white mb-1">${this.escapeHtml(category.name)}</div>
                <div class="text-xs font-semibold" style="color: #9ca3af;">${this.formatCategoryCount(category.count)}</div>
            `;
            grid.appendChild(btn);
        });

        categorySection.appendChild(categoryTitle);
        categorySection.appendChild(grid);
        wrapper.appendChild(categorySection);

        return wrapper;
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
            const markets = await this.searchMarkets(this.searchQuery);

            if (markets.length === 0) {
                return this.buildEmptyResultsState();
            }

            const wrapper = document.createElement('div');
            wrapper.className = 'p-4';

            const header = document.createElement('div');
            header.className = 'flex items-center gap-2 mb-4 pb-3';
            header.style.borderBottom = '1px solid #374151';
            header.innerHTML = `
                <svg class="h-5 w-5" style="color: #00CB97;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <p class="text-sm font-bold" style="color: #00CB97;">${markets.length} Result${markets.length !== 1 ? 's' : ''}</p>
            `;

            const list = document.createElement('div');
            list.className = 'space-y-3';
            const fragment = document.createDocumentFragment();
            markets.forEach(market => {
                fragment.appendChild(this.renderMarketResult(market));
            });
            list.appendChild(fragment);

            wrapper.appendChild(header);
            wrapper.appendChild(list);

            return wrapper;
        } catch (error) {
            console.error('Search error:', error);
            return this.buildErrorResultsState();
        }
    }

    renderMarketResult(market) {
        const yesPercent = (market.yes_price * 100).toFixed(0);
        const button = document.createElement('button');
        button.className = 'w-full p-4 rounded-xl transition touch-target text-left';
        button.dataset.action = 'open-market';
        button.dataset.marketId = market.id;
        button.style.background = '#1f2937';
        button.style.border = '1.5px solid #374151';
        button.setAttribute('onmouseover', "this.style.borderColor='#00CB97'; this.style.background='#252f3f'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0, 203, 151, 0.1)'");
        button.setAttribute('onmouseout', "this.style.borderColor='#374151'; this.style.background='#1f2937'; this.style.transform='translateY(0)'; this.style.boxShadow='none'");
        button.innerHTML = `
            <div class="flex items-start justify-between gap-3 mb-3">
                <div class="flex-1 min-w-0">
                    ${market.category ? `<span class="text-xs px-2.5 py-1 rounded-full mb-2 inline-block font-bold" style="background: linear-gradient(135deg, rgba(0, 203, 151, 0.2) 0%, rgba(0, 203, 151, 0.1) 100%); color: #00CB97; border: 1px solid rgba(0, 203, 151, 0.3);">${market.category}</span>` : ''}
                    <h4 class="font-bold text-white mb-1 line-clamp-2" style="font-size: 15px; line-height: 1.4;">${this.highlightQuery(market.title)}</h4>
                </div>
                <div class="text-right flex-shrink-0">
                    <div class="text-xs font-semibold mb-1" style="color: #9ca3af;">YES</div>
                    <div class="text-xl font-black" style="color: #00CB97;">${yesPercent}A?</div>
                </div>
            </div>
            <div class="flex items-center gap-3 text-xs font-medium" style="color: #6b7280;">
                <span class="flex items-center gap-1">
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                    </svg>
                    $${parseFloat(market.total_volume).toFixed(0)}
                </span>
                <span>???</span>
                <span class="flex items-center gap-1">
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    ${new Date(market.end_date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
                </span>
            </div>
        `;

        return button;
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

        let searchTimeout;
        input.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            this.updateHeaderState(overlay, query);

            if (!query) {
                this.searchQuery = '';
                this.setSearchContent(content, this.renderDefaultView());
                return;
            }

            this.setSearchContent(content, this.buildLoadingState());

            searchTimeout = setTimeout(async () => {
                this.searchQuery = query;
                const results = await this.renderResults();
                this.setSearchContent(content, results);
            }, 200);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
            if (e.key === 'Enter') {
                clearTimeout(searchTimeout);
                const query = input.value.trim();
                if (query) {
                    this.searchQuery = query;
                    this.performSearch(overlay);
                }
            }
        });

        overlay.addEventListener('click', (e) => {
            const actionEl = e.target.closest('[data-action]');
            if (!actionEl) return;

            const action = actionEl.dataset.action;

            if (action === 'clear-search') {
                e.preventDefault();
                input.value = '';
                input.focus();
                this.searchQuery = '';
                this.updateHeaderState(overlay, '');
                this.setSearchContent(content, this.renderDefaultView());
                return;
            }

            if (action === 'search-recent' || action === 'search-suggested') {
                const query = actionEl.dataset.query;
                if (!query) return;
                input.value = query;
                this.searchQuery = query;
                this.updateHeaderState(overlay, query);
                this.performSearch(overlay);
                return;
            }

            if (action === 'remove-recent') {
                e.stopPropagation();
                const query = actionEl.dataset.query;
                if (!query) return;
                this.recentSearches = this.recentSearches.filter(s => s !== query);
                localStorage.setItem('goatmouth_recent_searches', JSON.stringify(this.recentSearches));
                this.setSearchContent(content, this.renderDefaultView());
                return;
            }

            if (action === 'clear-recent') {
                this.clearRecentSearches();
                this.setSearchContent(content, this.renderDefaultView());
                return;
            }

            if (action === 'search-category') {
                const category = actionEl.dataset.category;
                if (!category) return;
                this.saveRecentSearch(category);
                this.close();
                this.app.filterByCategory(category);
                return;
            }

            if (action === 'open-market') {
                const marketId = actionEl.dataset.marketId;
                if (!marketId) return;
                if (this.searchQuery) {
                    this.saveRecentSearch(this.searchQuery);
                }
                this.close();
                this.app.showMarketDetail(marketId);
            }
        });
    }

    async performSearch(overlay) {
        const content = overlay.querySelector('#search-content');
        const results = await this.renderResults();
        this.setSearchContent(content, results);
        this.updateHeaderState(overlay, this.searchQuery);
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
