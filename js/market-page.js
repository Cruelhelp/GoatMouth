// ====================================
// MARKET PAGE - GoatMouth
// Dedicated market detail page (Polymarket-style)
// ====================================

class MarketPage {
    constructor() {
        this.api = new GoatMouthAPI(window.supabaseClient);
        this.marketId = null;
        this.market = null;
        this.currentUser = null;
        this.currentProfile = null;
        this.selectedOutcome = 'yes';
        this.betAmount = '';
        this.priceChart = null;

        this.init();
    }

    async init() {
        try {
            // Get market ID from URL
            const urlParams = new URLSearchParams(window.location.search);
            this.marketId = urlParams.get('id');

            if (!this.marketId) {
                this.showError();
                return;
            }

            // Check authentication
            this.currentUser = await this.api.getCurrentUser();
            if (this.currentUser) {
                this.currentProfile = await this.api.getProfile(this.currentUser.id);
            }

            // Update header UI
            updateHeaderUI(this.currentUser, this.currentProfile);

            // Load market data
            await this.loadMarket();

            // Setup event listeners
            this.setupEventListeners();

            // Update UI based on auth status
            this.updateAuthUI();

        } catch (error) {
            console.error('Market page initialization error:', error);
            this.showError();
        }
    }

    async loadMarket() {
        try {
            // Fetch market data
            this.market = await this.api.getMarket(this.marketId);

            if (!this.market) {
                this.showError();
                return;
            }

            // Hide loading, show content
            document.getElementById('loading-state').classList.add('hidden');
            document.getElementById('market-content').classList.remove('hidden');

            // Populate page
            this.populateMarketData();

            // Wait for chart library to load before initializing
            await this.waitForChartLibrary();
            this.initializeChart();

            await this.loadComments();
            await this.loadActivity();

            // Update page title
            document.title = `${this.market.title} - GoatMouth`;

        } catch (error) {
            console.error('Error loading market:', error);
            this.showError();
        }
    }

    async waitForChartLibrary(maxAttempts = 10) {
        for (let i = 0; i < maxAttempts; i++) {
            if (typeof LightweightCharts !== 'undefined') {
                console.log('✓ Chart library loaded');
                return true;
            }
            console.log(`Waiting for chart library... (${i + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.error('Chart library failed to load after', maxAttempts, 'attempts');
        return false;
    }

    populateMarketData() {
        const market = this.market;

        // Breadcrumb
        const breadcrumbTitle = document.getElementById('breadcrumb-market-title');
        if (breadcrumbTitle) {
            breadcrumbTitle.textContent = market.title;
        }
        const breadcrumbCategory = document.getElementById('breadcrumb-category');
        if (breadcrumbCategory) {
            breadcrumbCategory.textContent = market.category || 'General';
        }

        // Hero section
        document.getElementById('market-title').textContent = market.title;
        document.getElementById('market-description').textContent = market.description || 'No description provided.';
        document.getElementById('category-badge').textContent = market.category || 'General';
        document.getElementById('market-id').textContent = market.id;

        // Background image
        if (market.image_url) {
            const heroBg = document.getElementById('hero-bg-image');
            heroBg.style.backgroundImage = `url('${market.image_url}')`;
            heroBg.style.backgroundSize = 'cover';
            heroBg.style.backgroundPosition = 'center';
            heroBg.style.filter = 'blur(4px)';
            // Fade in the background
            setTimeout(() => {
                heroBg.style.opacity = '1';
            }, 100);
        }

        // Stats
        document.getElementById('stat-volume').textContent = `J$${parseFloat(market.total_volume || 0).toLocaleString()}`;
        document.getElementById('stat-traders').textContent = market.bettor_count || 0;
        document.getElementById('stat-time').textContent = this.getTimeLeft(market.end_date);

        // Resolution date (if element exists)
        const resolutionDateEl = document.getElementById('resolution-date');
        if (resolutionDateEl) {
            resolutionDateEl.textContent = this.formatDate(market.end_date);
        }

        // Prices
        const yesPercent = (market.yes_price * 100).toFixed(0);
        const noPercent = (market.no_price * 100).toFixed(0);

        document.getElementById('yes-price').textContent = `${yesPercent}¢`;
        document.getElementById('no-price').textContent = `${noPercent}¢`;
        document.getElementById('yes-profit').textContent = `${(100 - yesPercent)}% profit`;
        document.getElementById('no-profit').textContent = `${(100 - noPercent)}% profit`;

        // Sidebar info
        document.getElementById('info-category').textContent = market.category || 'General';
        document.getElementById('info-volume').textContent = `J$${parseFloat(market.total_volume || 0).toLocaleString()}`;
        document.getElementById('info-24h-volume').textContent = `J$${parseFloat(market.volume_24h || 0).toLocaleString()}`;
        document.getElementById('info-liquidity').textContent = `J$${parseFloat(market.liquidity || 0).toLocaleString()}`;

        // Resolution criteria
        document.getElementById('resolution-criteria').textContent = market.resolution_criteria ||
            'This market will resolve based on official announcements and verified sources.';

        // About section description
        const aboutDesc = document.getElementById('about-description');
        if (aboutDesc) {
            aboutDesc.textContent = market.description || 'This market allows traders to speculate on the outcome of this event.';
        }

        // Market created date
        const marketCreated = document.getElementById('market-created');
        if (marketCreated) {
            marketCreated.textContent = this.formatDate(market.created_at);
        }

        // Market closes date
        const marketCloses = document.getElementById('market-closes');
        if (marketCloses) {
            const closesDate = new Date(market.end_date);
            const now = new Date();
            if (closesDate > now) {
                marketCloses.textContent = this.formatDate(market.end_date);
            } else {
                marketCloses.textContent = 'Closed';
                marketCloses.classList.add('text-red-400');
            }
        }
    }

    initializeChart() {
        const chartContainer = document.getElementById('priceChart');

        // Check if LightweightCharts is available
        if (typeof LightweightCharts === 'undefined') {
            console.error('TradingView Lightweight Charts library not loaded');
            console.log('Available window properties:', Object.keys(window).filter(k => k.toLowerCase().includes('chart')));
            chartContainer.innerHTML = window.SkeletonLoaders.chart(300);
            return;
        }

        console.log('LightweightCharts object:', LightweightCharts);
        console.log('LightweightCharts methods:', Object.keys(LightweightCharts));

        // Create chart with dark green theme
        this.priceChart = LightweightCharts.createChart(chartContainer, {
            width: chartContainer.clientWidth,
            height: 400,
            layout: {
                background: { color: 'transparent' },
                textColor: '#9ca3af',
                fontFamily: 'Inter, sans-serif',
            },
            grid: {
                vertLines: {
                    color: 'rgba(0, 203, 151, 0.15)',
                    style: LightweightCharts.LineStyle.Solid,
                    visible: true,
                },
                horzLines: {
                    color: 'rgba(0, 203, 151, 0.15)',
                    style: LightweightCharts.LineStyle.Solid,
                    visible: true,
                },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
                vertLine: {
                    color: '#027A40',
                    width: 1,
                    style: LightweightCharts.LineStyle.Dashed,
                },
                horzLine: {
                    color: '#027A40',
                    width: 1,
                    style: LightweightCharts.LineStyle.Dashed,
                },
            },
            rightPriceScale: {
                borderColor: 'rgba(0, 203, 151, 0.3)',
                borderVisible: true,
                scaleMargins: {
                    top: 0.05,
                    bottom: 0.05,
                },
                autoScale: true,
                entireTextOnly: false,
            },
            timeScale: {
                borderColor: 'rgba(0, 203, 151, 0.3)',
                borderVisible: true,
                timeVisible: true,
                secondsVisible: false,
                fixLeftEdge: true,
                fixRightEdge: true,
            },
        });

        // Generate sample data
        const data = this.generateChartData();

        // Add YES line (area series with green)
        const yesSeries = this.priceChart.addAreaSeries({
            topColor: 'rgba(2, 122, 64, 0.4)',
            bottomColor: 'rgba(2, 122, 64, 0.01)',
            lineColor: '#027A40',
            lineWidth: 2,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 4,
            priceLineVisible: false,
        });

        // Add NO line (area series with red)
        const noSeries = this.priceChart.addAreaSeries({
            topColor: 'rgba(220, 38, 38, 0.3)',
            bottomColor: 'rgba(220, 38, 38, 0.01)',
            lineColor: '#dc2626',
            lineWidth: 2,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 4,
            priceLineVisible: false,
        });

        // Set data
        yesSeries.setData(data.yesData);
        noSeries.setData(data.noData);

        // Make chart responsive
        window.addEventListener('resize', () => {
            this.priceChart.applyOptions({
                width: chartContainer.clientWidth
            });
        });

        // Store series for updates
        this.yesSeries = yesSeries;
        this.noSeries = noSeries;
    }

    generateChartData(timeframe = '24h') {
        // Generate sample data in TradingView format (replace with real API data)
        let hours = 24;

        // Adjust data points based on timeframe
        switch(timeframe) {
            case '7d':
                hours = 7 * 24;
                break;
            case '30d':
                hours = 30 * 24;
                break;
            case 'all':
                hours = 90 * 24; // 90 days
                break;
            default:
                hours = 24;
        }

        const yesData = [];
        const noData = [];

        const currentYes = this.market.yes_price * 100;
        const currentNo = this.market.no_price * 100;

        for (let i = hours; i >= 0; i--) {
            const timestamp = Math.floor((Date.now() - (i * 60 * 60 * 1000)) / 1000);

            // Generate realistic fluctuation around current price
            const yesVariation = (Math.random() - 0.5) * 10;
            const noVariation = (Math.random() - 0.5) * 10;

            yesData.push({
                time: timestamp,
                value: Math.max(0, Math.min(100, currentYes + yesVariation))
            });

            noData.push({
                time: timestamp,
                value: Math.max(0, Math.min(100, currentNo + noVariation))
            });
        }

        return { yesData, noData };
    }

    async loadActivity() {
        const activityFeed = document.getElementById('activity-feed');

        try {
            // Fetch recent bets for this market
            const { data: bets, error } = await window.supabaseClient
                .from('bets')
                .select(`
                    *,
                    user:profiles(username, avatar_url)
                `)
                .eq('market_id', this.marketId)
                .order('created_at', { ascending: false })
                .limit(15);

            if (error) throw error;

            if (!bets || bets.length === 0) {
                activityFeed.innerHTML = `
                    <div class="text-center py-8 text-gray-400">
                        <i class="ri-history-line text-4xl mb-2"></i>
                        <p>No recent activity</p>
                    </div>
                `;
                return;
            }

            activityFeed.innerHTML = bets.map(bet => this.renderActivityItem(bet)).join('');

        } catch (error) {
            console.error('Error loading activity:', error);
            activityFeed.innerHTML = `
                <div class="text-center py-8 text-red-400">
                    <p>Error loading activity</p>
                </div>
            `;
        }
    }

    renderActivityItem(bet) {
        const timeAgo = this.getTimeAgo(bet.created_at);
        const outcome = bet.outcome.toUpperCase();
        const outcomeColor = bet.outcome === 'yes' ? '#00CB97' : '#ef4444';
        const outcomeBg = bet.outcome === 'yes' ? 'rgba(0, 203, 151, 0.1)' : 'rgba(239, 68, 68, 0.1)';
        const shares = parseFloat(bet.shares).toFixed(2);
        const price = (parseFloat(bet.price) * 100).toFixed(0);
        const totalAmount = (parseFloat(bet.amount) || 0).toFixed(2);

        const avatarUrl = bet.user?.avatar_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%231f2937'/%3E%3Cpath d='M50 45c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm0 10c-13.807 0-25 8.059-25 18v7h50v-7c0-9.941-11.193-18-25-18z' fill='%2300CB97'/%3E%3C/svg%3E";

        return `
            <div class="activity-item">
                <div class="flex items-start gap-3 flex-1 min-w-0">
                    <img src="${avatarUrl}" alt="${bet.user?.username || 'User'}" class="w-10 h-10 rounded-full object-cover flex-shrink-0" style="background: #1f2937; border: 2px solid ${outcomeColor};">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1 flex-wrap">
                            <span class="font-semibold text-sm" style="color: #00CB97;">@${bet.user?.username || 'Anonymous'}</span>
                            <span class="text-xs text-gray-500">•</span>
                            <span class="text-xs text-gray-400 whitespace-nowrap">${timeAgo}</span>
                        </div>
                        <div class="text-sm text-gray-300 mb-1">
                            Bought <span class="font-semibold whitespace-nowrap" style="color: ${outcomeColor};">${shares} ${outcome}</span> shares
                        </div>
                        <div class="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                            <span class="whitespace-nowrap">Price: <span class="font-semibold text-white">${price}¢</span></span>
                            <span>•</span>
                            <span class="whitespace-nowrap">Total: <span class="font-semibold text-white">J$${totalAmount}</span></span>
                        </div>
                    </div>
                </div>
                <div class="flex-shrink-0">
                    <div class="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap" style="background: ${outcomeBg}; color: ${outcomeColor};">
                        ${outcome}
                    </div>
                </div>
            </div>
        `;
    }

    async loadComments() {
        const commentsList = document.getElementById('comments-list');

        try {
            const comments = await this.api.getMarketComments(this.marketId);

            if (!comments || comments.length === 0) {
                commentsList.innerHTML = `
                    <div class="text-center py-8 text-gray-400">
                        <i class="ri-chat-3-line text-4xl mb-2"></i>
                        <p>No comments yet. Be the first to share your thoughts!</p>
                    </div>
                `;
                return;
            }

            commentsList.innerHTML = comments.map(comment => this.renderComment(comment)).join('');

        } catch (error) {
            console.error('Error loading comments:', error);
            commentsList.innerHTML = `
                <div class="text-center py-8 text-red-400">
                    <p>Error loading comments</p>
                </div>
            `;
        }
    }

    renderComment(comment) {
        const timeAgo = this.getTimeAgo(comment.created_at);
        const isCurrentUser = this.currentUser && comment.user_id === this.currentUser.id;

        const avatarUrl = comment.user.avatar_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%231f2937'/%3E%3Cpath d='M50 45c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm0 10c-13.807 0-25 8.059-25 18v7h50v-7c0-9.941-11.193-18-25-18z' fill='%2300CB97'/%3E%3C/svg%3E";

        return `
            <div class="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div class="flex items-start justify-between mb-2">
                    <div class="flex items-center gap-2">
                        <img src="${avatarUrl}" alt="${comment.user.username}" class="w-10 h-10 rounded-full object-cover" style="background: #1f2937;">
                        <div>
                            <div class="font-semibold" style="color: #00CB97;">@${comment.user.username}</div>
                            <div class="text-xs text-gray-400">${timeAgo}</div>
                        </div>
                    </div>
                    ${isCurrentUser ? `
                        <button onclick="marketPage.deleteComment('${comment.id}')" class="text-xs text-red-400 hover:text-red-300 px-2 py-1">
                            Delete
                        </button>
                    ` : ''}
                </div>
                <p class="text-gray-200 whitespace-pre-wrap">${this.escapeHtml(comment.content)}</p>
            </div>
        `;
    }

    setupEventListeners() {
        // Bet outcome tabs
        document.querySelectorAll('.bet-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.selectedOutcome = tab.dataset.outcome;

                // Update active state
                document.querySelectorAll('.bet-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update bet form colors based on outcome
                this.updateBetColors();

                this.updateBetSummary();
            });
        });

        // Quick bet amounts
        document.querySelectorAll('.quick-bet-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.betAmount = btn.dataset.amount;
                document.getElementById('bet-amount').value = this.betAmount;
                this.updateBetSummary();
            });
        });

        // Bet amount input
        const betAmountInput = document.getElementById('bet-amount');
        if (betAmountInput) {
            betAmountInput.addEventListener('input', (e) => {
                this.betAmount = e.target.value;
                this.updateBetSummary();
            });
        }

        // Place bet button
        const placeBetBtn = document.getElementById('place-bet-btn');
        if (placeBetBtn) {
            placeBetBtn.addEventListener('click', () => this.handlePlaceBet());
        }

        // Timeframe selector
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateChartTimeframe(btn.dataset.timeframe);
            });
        });

        // Share buttons
        document.querySelectorAll('[title="Copy Link"]')[0]?.addEventListener('click', () => this.copyShareLink());
        document.querySelectorAll('[title="Twitter"]')[0]?.addEventListener('click', () => this.shareToTwitter());
        document.querySelectorAll('[title="WhatsApp"]')[0]?.addEventListener('click', () => this.shareToWhatsApp());
    }

    updateAuthUI() {
        const commentFormContainer = document.getElementById('comment-form-container');

        if (this.currentUser) {
            // Show betting form
            document.getElementById('bet-login-prompt')?.classList.add('hidden');
            document.getElementById('bet-form')?.classList.remove('hidden');

            // Update balance
            if (this.currentProfile) {
                document.getElementById('user-balance').textContent = `J$${parseFloat(this.currentProfile.balance).toFixed(2)}`;
            }

            // Initialize bet colors (default to YES/green)
            this.updateBetColors();

            // Show comment form
            commentFormContainer.innerHTML = `
                <div class="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <textarea
                        id="comment-input"
                        placeholder="Share your thoughts on this market..."
                        class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-green-500 resize-none"
                        rows="3"
                        maxlength="1000"
                        style="font-size: 16px;"
                    ></textarea>
                    <div class="flex justify-between items-center mt-3">
                        <span class="text-xs text-gray-400">Max 1000 characters</span>
                        <button
                            onclick="marketPage.postComment()"
                            class="px-4 py-2 bg-green-600 rounded-lg font-semibold hover:bg-green-700 transition text-sm"
                        >
                            Post Comment
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Show login prompt
            commentFormContainer.innerHTML = `
                <div class="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700 text-center">
                    <p class="text-gray-400 mb-3">Sign in to join the discussion</p>
                    <button onclick="window.location.href='index.html#login'" class="px-4 py-2 bg-green-600 rounded-lg font-semibold hover:bg-green-700 transition text-sm">
                        Sign In
                    </button>
                </div>
            `;
        }
    }

    updateBetColors() {
        const betForm = document.getElementById('bet-form');
        const betSummary = document.getElementById('bet-summary');
        const placeBetBtn = document.getElementById('place-bet-btn');

        if (!betForm) return;

        // Update bet form wrapper for quick bet button colors
        betForm.classList.remove('outcome-yes', 'outcome-no');
        betForm.classList.add(`outcome-${this.selectedOutcome}`);

        // Update bet summary colors
        if (betSummary) {
            betSummary.classList.remove('bet-summary-yes', 'bet-summary-no');
            betSummary.classList.add(`bet-summary-${this.selectedOutcome}`);
        }

        // Update place bet button colors
        if (placeBetBtn) {
            placeBetBtn.classList.remove('place-bet-yes', 'place-bet-no', 'bg-green-600', 'hover:bg-green-700');
            placeBetBtn.classList.add(`place-bet-${this.selectedOutcome}`);
        }
    }

    updateBetSummary() {
        const summary = document.getElementById('bet-summary');
        const placeBtn = document.getElementById('place-bet-btn');

        if (!this.betAmount || parseFloat(this.betAmount) < 1) {
            summary?.classList.add('hidden');
            if (placeBtn) {
                placeBtn.disabled = true;
                placeBtn.textContent = 'Place Bet';
            }
            return;
        }

        const amount = parseFloat(this.betAmount);
        const price = this.selectedOutcome === 'yes' ? this.market.yes_price : this.market.no_price;
        const shares = amount / price;
        const potentialProfit = shares - amount;

        summary?.classList.remove('hidden');

        const summaryShares = document.getElementById('summary-shares');
        const summaryPrice = document.getElementById('summary-price');
        const summaryProfit = document.getElementById('summary-profit');

        if (summaryShares) summaryShares.textContent = shares.toFixed(2);
        if (summaryPrice) summaryPrice.textContent = (price * 100).toFixed(1) + '¢';
        if (summaryProfit) summaryProfit.textContent = '+J$' + potentialProfit.toFixed(2);

        if (placeBtn) {
            placeBtn.disabled = false;
            placeBtn.textContent = `Place Bet: J$${amount.toFixed(2)}`;
        }
    }

    async handlePlaceBet() {
        if (!this.currentUser) {
            window.location.href = 'index.html#login';
            return;
        }

        const amount = parseFloat(this.betAmount);
        const price = this.selectedOutcome === 'yes' ? this.market.yes_price : this.market.no_price;

        if (!confirm(`Confirm bet: J$${amount.toFixed(2)} on ${this.selectedOutcome.toUpperCase()} @ ${(price * 100).toFixed(1)}¢?`)) {
            return;
        }

        const placeBtn = document.getElementById('place-bet-btn');

        try {
            placeBtn.disabled = true;
            placeBtn.textContent = 'Placing bet...';

            await this.api.placeBet(this.marketId, this.selectedOutcome, amount, price);

            // Success - reload market data
            alert('Bet placed successfully!');
            await this.loadMarket();

            // Reset form
            this.betAmount = '';
            document.getElementById('bet-amount').value = '';
            this.updateBetSummary();

        } catch (error) {
            alert('Error placing bet: ' + error.message);
            placeBtn.disabled = false;
            placeBtn.textContent = 'Place Bet';
        }
    }

    async postComment() {
        const input = document.getElementById('comment-input');
        const content = input.value.trim();

        if (!content) {
            alert('Please enter a comment');
            return;
        }

        if (content.length > 1000) {
            alert('Comment is too long (max 1000 characters)');
            return;
        }

        try {
            await this.api.createComment(this.marketId, content);
            input.value = '';
            await this.loadComments();
        } catch (error) {
            alert('Error posting comment: ' + error.message);
        }
    }

    async deleteComment(commentId) {
        if (!confirm('Are you sure you want to delete this comment?')) {
            return;
        }

        try {
            await this.api.deleteComment(commentId);
            await this.loadComments();
        } catch (error) {
            alert('Error deleting comment: ' + error.message);
        }
    }

    updateChartTimeframe(timeframe) {
        // Update chart data based on timeframe
        // In production, fetch historical data for the selected timeframe
        console.log('Updating chart to:', timeframe);

        // Regenerate data with new timeframe
        const data = this.generateChartData(timeframe);

        // Update both series with new data
        if (this.yesSeries && this.noSeries) {
            this.yesSeries.setData(data.yesData);
            this.noSeries.setData(data.noData);

            // Fit content to show all data
            this.priceChart.timeScale().fitContent();
        }
    }

    copyShareLink() {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copied to clipboard!');
        }).catch(() => {
            alert('Failed to copy link');
        });
    }

    shareToTwitter() {
        const url = window.location.href;
        const text = `Check out this market on GoatMouth: ${this.market.title}`;
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
    }

    shareToWhatsApp() {
        const url = window.location.href;
        const text = `Check out this market on GoatMouth: ${this.market.title} ${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }

    showError() {
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('error-state').classList.remove('hidden');
    }

    // Utility functions
    getTimeLeft(endDate) {
        const now = new Date();
        const end = new Date(endDate);
        const diff = end - now;

        if (diff < 0) return 'Ended';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h`;
        return 'Ending soon';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return this.formatDate(dateString);
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize market page
let marketPage;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        marketPage = new MarketPage();
    });
} else {
    marketPage = new MarketPage();
}

console.log('✓ Market page loaded');
