// Market Detail Modal Component
class MarketDetailModal {
    constructor(app, marketId) {
        this.app = app;
        this.marketId = marketId;
        this.market = null;
        this.marketOdds = null;
        this.betAmount = '';
        this.selectedOutcome = null;
        this.quoteTimeout = null;
        this.quoteRequestId = 0;
        this.quoteAbortController = null;
        this.latestQuote = null;
        this.oddsAbortController = null;
    }

    async show() {
        this.render({ isLoading: true });

        try {
            if (this.oddsAbortController) {
                this.oddsAbortController.abort();
            }
            this.oddsAbortController = new AbortController();
            const [market, odds] = await Promise.all([
                this.app.api.getMarket(this.marketId),
                this.app.api.getMarketOddsMultiplier(this.marketId, {
                    signal: this.oddsAbortController.signal
                }).catch(() => null)
            ]);
            this.market = market;
            this.marketOdds = odds ? odds.data : null;
            this.render();
        } catch (error) {
            this.render({ errorMessage: 'Error loading market details. Please try again.' });
        }
    }

    render(options = {}) {
        const { isLoading = false, errorMessage = '' } = options;
        const existingModal = document.querySelector('.modal-backdrop');
        if (existingModal) {
            this.cleanup();
            existingModal.remove();
            document.body.style.overflow = '';
        }

        const modal = document.createElement('div');

        // Traditional centered modal for both mobile and desktop
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-start justify-center z-50 modal-backdrop';

        // Responsive padding - more on mobile to clear nav links
        const isMobile = window.innerWidth <= 768;
        modal.style.paddingTop = isMobile ? '220px' : '150px';
        modal.style.paddingBottom = isMobile ? '20px' : '80px';
        modal.style.overflowY = 'auto';
        modal.style.overflowX = 'hidden';

        if (isLoading) {
            modal.innerHTML = this.getLoadingHTML();
        } else if (errorMessage) {
            modal.innerHTML = this.getErrorHTML(errorMessage);
        } else {
            modal.innerHTML = this.getHTML();
        }

        document.body.appendChild(modal);

        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';

        // Close when clicking the backdrop
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.closeModal(modal);
            }
        });

        this.attachCloseListener(modal);

        if (!isLoading && !errorMessage) {
            // Attach event listeners
            this.attachListeners(modal);

            // Load comments
            this.loadComments(modal);
        }
    }

    closeModal(modal) {
        if (modal) {
            this.cleanup();
            modal.remove();
        }
        document.body.style.overflow = '';
    }

    cleanup() {
        clearTimeout(this.quoteTimeout);
        if (this.quoteAbortController) {
            this.quoteAbortController.abort();
            this.quoteAbortController = null;
        }
        if (this.oddsAbortController) {
            this.oddsAbortController.abort();
            this.oddsAbortController = null;
        }
    }

    attachCloseListener(modal) {
        const closeBtn = modal.querySelector('[data-action="close-modal"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal(modal));
        }
    }

    formatDecimalOdds(odds) {
        if (!odds || !isFinite(odds)) return '-';
        return `${odds.toFixed(2)}x`;
    }

    formatOddsFromProbability(probability) {
        if (!probability || probability <= 0 || probability >= 1) return '-';
        return this.formatDecimalOdds(1 / probability);
    }

    getHTML() {
        const market = this.market;
        const yesPercent = (market.yes_price * 100).toFixed(0);
        const noPercent = (market.no_price * 100).toFixed(0);
        const oddsData = this.marketOdds;
        const yesOdds = oddsData?.yesOdds ?? (market.yes_price ? (1 / market.yes_price) : 0);
        const noOdds = oddsData?.noOdds ?? (market.no_price ? (1 / market.no_price) : 0);
        const yesOddsDisplay = oddsData?.yesOddsFormatted || (yesOdds ? `${yesOdds.toFixed(2)}x` : '--');
        const noOddsDisplay = oddsData?.noOddsFormatted || (noOdds ? `${noOdds.toFixed(2)}x` : '--');
        const timeLeft = this.app.getTimeLeft(market.end_date);

        return `
            <div class="bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto mobile-market-modal" style="margin: 1rem; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); position: relative; scrollbar-width: none; -ms-overflow-style: none;">
                <style>
                    .mobile-market-modal::-webkit-scrollbar {
                        display: none;
                    }
                </style>
                <!-- Close Button - Top Right -->
                <button data-action="close-modal"
                        class="absolute z-50 text-white font-bold transition touch-target"
                        style="top: 12px; right: 12px; width: 40px; height: 40px; background: rgba(239, 68, 68, 0.9); border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; font-size: 24px; line-height: 1; cursor: pointer; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);"
                        onmouseover="this.style.background='rgba(239, 68, 68, 1)'; this.style.transform='scale(1.1)'; this.style.boxShadow='0 6px 16px rgba(239, 68, 68, 0.4)';"
                        onmouseout="this.style.background='rgba(239, 68, 68, 0.9)'; this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(0, 0, 0, 0.3)';">
                    &times;
                </button>

                <!-- Market Image (if available) -->
                ${market.image_url ? `
                    <div style="height: 200px; background: url('${market.image_url}') center/cover; position: relative; border-radius: 0.75rem 0.75rem 0 0;">
                        <div style="position: absolute; inset: 0; background: linear-gradient(180deg, transparent 0%, rgba(31, 41, 55, 0.9) 100%);"></div>
                        ${market.category ? `
                            <div style="position: absolute; top: 16px; left: 16px;">
                                <span class="text-xs px-3 py-1.5 rounded-full font-semibold" style="background-color: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px); color: #00CB97; border: 1px solid rgba(0, 203, 151, 0.3);">${market.category}</span>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                <!-- Header -->
                <div class="p-5 md:p-6 ${!market.image_url ? 'border-b border-gray-700' : ''}">
                    ${!market.image_url && market.category ? `<span class="text-xs px-3 py-1.5 rounded-full mb-3 inline-block font-semibold" style="background-color: rgba(0, 203, 151, 0.15); color: #00CB97; border: 1px solid rgba(0, 203, 151, 0.3);">${escapeHtml(market.category)}</span>` : ''}
                    <h2 class="text-xl md:text-2xl font-extrabold leading-tight mb-3 pr-8 text-center" style="background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-family: system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; letter-spacing: -0.02em;">${escapeHtml(market.title)}</h2>
                    ${market.description ? `<p class="text-sm md:text-base text-gray-300 mb-4 leading-relaxed">${sanitizeMarketDescription(market.description)}</p>` : ''}

                    <!-- Market Stats -->
                    <div class="flex flex-wrap items-center gap-3 text-xs md:text-sm">
                        <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-700">
                            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                            </svg>
                            <span class="text-white font-semibold">J$${parseFloat(market.total_volume).toLocaleString()}</span>
                        </div>
                        <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style="background: rgba(99, 27, 221, 0.15);">
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #631BDD;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                            </svg>
                            <span style="color: #631BDD; font-weight: 600;">${market.bettor_count || 0} ${(market.bettor_count || 0) === 1 ? 'trader' : 'traders'}</span>
                        </div>
                        <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-700">
                            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span class="text-white font-semibold">${timeLeft}</span>
                        </div>
                        ${this.app.currentProfile && this.app.currentProfile.role === 'admin' ? `
                            <button onclick="app.showEditMarketModal('${market.id}')" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-700 transition touch-target" title="Edit market" style="color: #00CB97; border: 1px solid rgba(0, 203, 151, 0.3);">
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                                <span class="font-semibold text-xs">Edit</span>
                            </button>
                        ` : ''}
                        <button id="share-menu-btn" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-700 transition touch-target relative" title="Share market" style="color: #00CB97; border: 1px solid rgba(0, 203, 151, 0.3);">
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                            </svg>
                            <span class="font-semibold text-xs">Share</span>
                        </button>
                    </div>

                    <!-- Social Share Menu (Hidden by default) -->
                    <div id="share-menu" class="hidden mt-3 p-4 rounded-xl border-2" style="background: linear-gradient(135deg, rgba(0, 203, 151, 0.1) 0%, rgba(99, 27, 221, 0.1) 100%); border-color: rgba(0, 203, 151, 0.3);">
                        <p class="text-sm font-semibold mb-3" style="color: #00CB97;">Share this market</p>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <!-- Copy Link -->
                            <button id="copy-link-btn" class="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-700 transition touch-target" style="border: 1px solid rgba(255, 255, 255, 0.1);">
                                <svg class="h-6 w-6" style="color: #00CB97;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                </svg>
                                <span class="text-xs font-semibold">Copy Link</span>
                            </button>

                            <!-- Facebook -->
                            <button onclick="window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href + '?market=${market.id}'), '_blank', 'width=600,height=400')" class="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-700 transition touch-target" style="border: 1px solid rgba(255, 255, 255, 0.1);">
                                <svg class="h-6 w-6" style="color: #1877F2;" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                                <span class="text-xs font-semibold">Facebook</span>
                            </button>

                            <!-- Twitter/X -->
                            <button onclick="window.open('https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href + '?market=${market.id}') + '&text=' + encodeURIComponent('Check out this market on GoatMouth: ${escapeHtml(market.title)}'), '_blank', 'width=600,height=400')" class="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-700 transition touch-target" style="border: 1px solid rgba(255, 255, 255, 0.1);">
                                <svg class="h-6 w-6" style="color: #1DA1F2;" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                                </svg>
                                <span class="text-xs font-semibold">Twitter</span>
                            </button>

                            <!-- WhatsApp -->
                            <button onclick="window.open('https://wa.me/?text=' + encodeURIComponent('Check out this market on GoatMouth: ${escapeHtml(market.title)} ' + window.location.href + '?market=${market.id}'), '_blank')" class="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-700 transition touch-target" style="border: 1px solid rgba(255, 255, 255, 0.1);">
                                <svg class="h-6 w-6" style="color: #25D366;" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                                <span class="text-xs font-semibold">WhatsApp</span>
                            </button>

                            <!-- Telegram -->
                            <button onclick="window.open('https://t.me/share/url?url=' + encodeURIComponent(window.location.href + '?market=${market.id}') + '&text=' + encodeURIComponent('Check out this market on GoatMouth: ${escapeHtml(market.title)}'), '_blank')" class="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-700 transition touch-target" style="border: 1px solid rgba(255, 255, 255, 0.1);">
                                <svg class="h-6 w-6" style="color: #0088cc;" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                                </svg>
                                <span class="text-xs font-semibold">Telegram</span>
                            </button>

                            <!-- LinkedIn -->
                            <button onclick="window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(window.location.href + '?market=${market.id}'), '_blank', 'width=600,height=400')" class="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-700 transition touch-target" style="border: 1px solid rgba(255, 255, 255, 0.1);">
                                <svg class="h-6 w-6" style="color: #0A66C2;" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                </svg>
                                <span class="text-xs font-semibold">LinkedIn</span>
                            </button>

                            <!-- Reddit -->
                            <button onclick="window.open('https://reddit.com/submit?url=' + encodeURIComponent(window.location.href + '?market=${market.id}') + '&title=' + encodeURIComponent('${escapeHtml(market.title)}'), '_blank', 'width=600,height=400')" class="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-700 transition touch-target" style="border: 1px solid rgba(255, 255, 255, 0.1);">
                                <svg class="h-6 w-6" style="color: #FF4500;" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                                </svg>
                                <span class="text-xs font-semibold">Reddit</span>
                            </button>

                            <!-- Email -->
                            <button onclick="window.location.href='mailto:?subject=' + encodeURIComponent('Check out this market on GoatMouth') + '&body=' + encodeURIComponent('${escapeHtml(market.title)}\\n\\n' + window.location.href + '?market=${market.id}')" class="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-700 transition touch-target" style="border: 1px solid rgba(255, 255, 255, 0.1);">
                                <svg class="h-6 w-6" style="color: #00CB97;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                </svg>
                                <span class="text-xs font-semibold">Email</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Voting Analytics Visualization -->
                <div class="p-5 md:p-6 border-t border-gray-700" style="background: linear-gradient(180deg, rgba(31, 41, 55, 0.3) 0%, transparent 100%);">
                    <h3 class="font-bold mb-4 text-base md:text-lg">Market Odds</h3>

                    <!-- Vertical Voting Bars -->
                    <div style="display: flex; gap: 20px; align-items: flex-end; height: 180px; padding: 0 20px; margin-bottom: 20px; overflow: hidden;">
                        <!-- YES Bar -->
                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; min-width: 0; overflow: hidden;">
                            <div style="margin-bottom: auto; padding-bottom: 10px; overflow: hidden;">
                                <span style="font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #00CB97; white-space: nowrap;">YES</span>
                            </div>
                            <div style="width: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; position: relative; height: 100%; overflow: hidden;">
                                <div style="position: absolute; bottom: 0; width: 100%; height: 100%; background: repeating-linear-gradient(0deg, rgba(0, 203, 151, 0.05) 0px, rgba(0, 203, 151, 0.05) 12px, transparent 12px, transparent 24px); border-radius: 10px; opacity: 0.3;"></div>
                                <div style="width: 100%; background: linear-gradient(180deg, #03924d 0%, #027A40 100%); border-radius: 10px 10px 0 0; transition: all 0.5s ease; box-shadow: 0 -6px 20px rgba(2, 122, 64, 0.6); height: ${yesPercent}%; min-height: 45px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; z-index: 10; padding: 8px; overflow: hidden;">
                                    <span style="font-size: 1.75rem; font-weight: 800; color: white; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4); line-height: 1; white-space: nowrap;">${yesPercent}%</span>
                                    <span style="font-size: 0.7rem; color: rgba(255, 255, 255, 0.9); margin-top: 4px; white-space: nowrap;">${(100 - parseFloat(yesPercent)).toFixed(0)}% profit</span>
                                </div>
                            </div>
                        </div>

                        <!-- NO Bar -->
                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; min-width: 0; overflow: hidden;">
                            <div style="margin-bottom: auto; padding-bottom: 10px; overflow: hidden;">
                                <span style="font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #ef4444; white-space: nowrap;">NO</span>
                            </div>
                            <div style="width: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; position: relative; height: 100%; overflow: hidden;">
                                <div style="position: absolute; bottom: 0; width: 100%; height: 100%; background: repeating-linear-gradient(0deg, rgba(239, 68, 68, 0.05) 0px, rgba(239, 68, 68, 0.05) 12px, transparent 12px, transparent 24px); border-radius: 10px; opacity: 0.3;"></div>
                                <div style="width: 100%; background: linear-gradient(180deg, #f87171 0%, #ef4444 100%); border-radius: 10px 10px 0 0; transition: all 0.5s ease; box-shadow: 0 -6px 20px rgba(239, 68, 68, 0.6); height: ${noPercent}%; min-height: 45px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; z-index: 10; padding: 8px; overflow: hidden;">
                                    <span style="font-size: 1.75rem; font-weight: 800; color: white; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4); line-height: 1; white-space: nowrap;">${noPercent}%</span>
                                    <span style="font-size: 0.7rem; color: rgba(255, 255, 255, 0.9); margin-top: 4px; white-space: nowrap;">${(100 - parseFloat(noPercent)).toFixed(0)}% profit</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Betting Interface -->
                ${this.app.currentUser ? `
                    <div class="p-5 md:p-6 border-t border-gray-700" style="background: rgba(31, 41, 55, 0.3);">
                        <h3 class="font-bold mb-4 text-base md:text-lg">Place Your Bet</h3>

                        <!-- Outcome Selection - Large Buttons -->
                        <div class="grid grid-cols-2 gap-3 mb-4">
                            <button
                                data-outcome="yes"
                                class="outcome-btn px-4 py-5 border-2 rounded-xl transition touch-target ${this.selectedOutcome === 'yes' ? 'border-green-500 bg-green-900 bg-opacity-30' : 'border-gray-600 hover:border-green-500 bg-gray-700'}"
                                style="min-height: 90px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);"
                            >
                                <div class="flex flex-col items-center gap-2">
                                    <span class="text-xl font-bold" style="color: #00CB97;">YES</span>
                                    <span class="text-2xl font-black" style="color: #00CB97;">${yesOddsDisplay}</span>
                                    <span class="text-xs text-gray-400">${(100 - parseFloat(yesPercent)).toFixed(0)}% profit</span>
                                </div>
                            </button>
                            <button
                                data-outcome="no"
                                class="outcome-btn px-4 py-5 border-2 rounded-xl transition touch-target ${this.selectedOutcome === 'no' ? 'border-red-500 bg-red-900 bg-opacity-30' : 'border-gray-600 hover:border-red-500 bg-gray-700'}"
                                style="min-height: 90px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);"
                            >
                                <div class="flex flex-col items-center gap-2">
                                    <span class="text-xl font-bold" style="color: #ef4444;">NO</span>
                                    <span class="text-2xl font-black" style="color: #ef4444;">${noOddsDisplay}</span>
                                    <span class="text-xs text-gray-400">${(100 - parseFloat(noPercent)).toFixed(0)}% profit</span>
                                </div>
                            </button>
                        </div>

                        <!-- Amount Input with Quick Select -->
                        <div class="mb-4">
                            <label class="block text-sm font-semibold mb-3" style="color: #00CB97;">Bet Amount (J$)</label>

                            <!-- Quick Amount Buttons -->
                            <div class="grid grid-cols-4 gap-2 mb-3">
                                <button class="quick-amount-btn px-3 py-2 rounded-lg border border-gray-600 hover:border-green-500 hover:bg-gray-700 transition text-sm font-semibold touch-target" data-amount="10">$10</button>
                                <button class="quick-amount-btn px-3 py-2 rounded-lg border border-gray-600 hover:border-green-500 hover:bg-gray-700 transition text-sm font-semibold touch-target" data-amount="25">$25</button>
                                <button class="quick-amount-btn px-3 py-2 rounded-lg border border-gray-600 hover:border-green-500 hover:bg-gray-700 transition text-sm font-semibold touch-target" data-amount="50">$50</button>
                                <button class="quick-amount-btn px-3 py-2 rounded-lg border border-gray-600 hover:border-green-500 hover:bg-gray-700 transition text-sm font-semibold touch-target" data-amount="100">$100</button>
                            </div>

                            <!-- Custom Amount Input -->
                            <input
                                type="number"
                                step="0.01"
                                min="1"
                                placeholder="Or enter custom amount..."
                                class="w-full px-4 py-3 bg-gray-700 border-2 border-gray-600 rounded-lg text-base font-semibold touch-target focus:outline-none"
                                style="font-size: 16px;"
                                id="bet-amount"
                            >
                        </div>

                        <!-- Bet Summary - Enhanced -->
                        <div id="bet-summary" class="mb-4 p-4 rounded-xl hidden" style="background: linear-gradient(135deg, rgba(0, 203, 151, 0.1) 0%, rgba(99, 27, 221, 0.1) 100%); border: 2px solid rgba(0, 203, 151, 0.3);">
                            <div class="flex justify-between items-center mb-3">
                                <span class="text-sm text-gray-400">You'll receive</span>
                                <span id="shares-amount" class="text-lg font-bold" style="color: #00CB97;">-</span>
                            </div>
                            <div class="flex justify-between items-center mb-3">
                                <span class="text-sm text-gray-400">Avg. price</span>
                                <span id="avg-cost" class="text-lg font-bold">-</span>
                            </div>
                            <div class="pt-3 border-t border-gray-600">
                                <div class="flex justify-between items-center">
                                    <span class="font-semibold text-base">Profit</span>
                                    <span id="potential-return" class="text-2xl font-black" style="color: #00CB97;">-</span>
                                </div>
                            </div>
                        </div>

                        <!-- Place Bet Button - Large & Prominent -->
                        <button
                            id="place-bet-btn"
                            disabled
                            class="w-full px-6 py-4 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed text-white transition touch-target text-base md:text-lg"
                            style="background: linear-gradient(135deg, #00CB97 0%, #00e5af 100%); min-height: 56px; box-shadow: 0 4px 20px rgba(0, 203, 151, 0.3);"
                            onmouseover="if(!this.disabled) this.style.boxShadow='0 6px 30px rgba(0, 203, 151, 0.5)'"
                            onmouseout="if(!this.disabled) this.style.boxShadow='0 4px 20px rgba(0, 203, 151, 0.3)'"
                        >
                            Place Bet
                        </button>

                        <!-- User Balance -->
                        <div class="mt-3 text-center text-sm text-gray-400">
                            Available balance: <span class="font-semibold text-white">J$${this.app.currentProfile ? parseFloat(this.app.currentProfile.balance).toFixed(2) : '0.00'}</span>
                        </div>
                    </div>
                ` : `
                    <div class="p-5 md:p-6 border-t border-gray-700 text-center" style="background: rgba(31, 41, 55, 0.3);">
                        <div class="mb-4">
                            <svg class="h-16 w-16 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                            </svg>
                            <p class="text-lg font-semibold mb-2">Sign In to Place Bets</p>
                            <p class="text-sm text-gray-400">Create an account or sign in to start betting on this market</p>
                        </div>
                        <button data-action="open-auth" class="px-6 py-3 rounded-xl text-white font-bold transition touch-target text-base" style="background: linear-gradient(135deg, #027A40 0%, #03924d 100%); min-height: 50px; box-shadow: 0 4px 20px rgba(2, 122, 64, 0.3);" onmouseover="this.style.boxShadow='0 6px 30px rgba(2, 122, 64, 0.5)'" onmouseout="this.style.boxShadow='0 4px 20px rgba(2, 122, 64, 0.3)'">
                            Sign In / Sign Up
                        </button>
                    </div>
                `}

                <!-- Comments Section -->
                <div class="p-4 md:p-6 border-t-2 border-gray-700/50">
                    <!-- Section Header -->
                    <div class="flex items-center gap-2 mb-4">
                        <div class="w-1 h-6 rounded-full" style="background: linear-gradient(180deg, #00CB97 0%, #027A40 100%);"></div>
                        <h3 class="font-bold text-lg" style="color: #00CB97;">
                            <i class="fa-solid fa-comments mr-2"></i>Discussion
                        </h3>
                    </div>

                    <!-- Comment Form -->
                    ${this.app.currentUser ? `
                        <div class="mb-5 p-4 rounded-lg border" style="background: linear-gradient(135deg, rgba(31, 41, 55, 0.4) 0%, rgba(17, 24, 39, 0.2) 100%); border: 1px solid rgba(75, 85, 99, 0.4);">
                            <textarea
                                id="comment-input"
                                placeholder="Share your thoughts on this market..."
                                class="w-full px-4 py-3 rounded-lg focus:outline-none resize-none text-sm transition border"
                                style="background: rgba(17, 24, 39, 0.6); border: 1px solid rgba(75, 85, 99, 0.5); color: rgb(229, 231, 235); font-size: 16px;"
                                rows="3"
                                maxlength="1000"
                                onfocus="this.style.borderColor='#00CB97'"
                                onblur="this.style.borderColor='rgba(75, 85, 99, 0.5)'"
                            ></textarea>
                            <div class="flex justify-between items-center mt-3">
                                <span class="text-xs flex items-center gap-1" style="color: rgb(156, 163, 175);">
                                    <i class="fa-solid fa-circle-info"></i> Max 1000 characters
                                </span>
                                <button
                                    id="post-comment-btn"
                                    class="px-4 py-2 rounded-lg font-semibold transition text-white touch-target text-sm flex items-center gap-2 shadow-lg"
                                    style="background: linear-gradient(135deg, #00CB97 0%, #027A40 100%); min-height: 36px;"
                                    onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(0, 203, 151, 0.3)'"
                                    onmouseout="this.style.transform=''; this.style.boxShadow='0 2px 8px rgba(0, 0, 0, 0.3)'"
                                >
                                    <i class="fa-solid fa-paper-plane"></i>
                                    Post Comment
                                </button>
                            </div>
                        </div>
                    ` : `
                        <div class="mb-5 p-4 rounded-lg text-center border" style="background: linear-gradient(135deg, rgba(31, 41, 55, 0.4) 0%, rgba(17, 24, 39, 0.2) 100%); border: 1px solid rgba(75, 85, 99, 0.4);">
                            <div class="mb-3">
                                <i class="fa-solid fa-lock text-4xl" style="color: rgba(156, 163, 175, 0.5);"></i>
                            </div>
                            <p class="mb-3 text-sm" style="color: rgb(156, 163, 175);">
                                <i class="fa-solid fa-user-plus mr-1"></i>
                                Sign in to join the discussion
                            </p>
                            <button data-action="open-auth"
                                    class="px-4 py-2 rounded-lg text-white transition touch-target text-sm font-semibold shadow-lg"
                                    style="background: linear-gradient(135deg, #027A40 0%, #025a30 100%); min-height: 36px;"
                                    onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(2, 122, 64, 0.3)'"
                                    onmouseout="this.style.transform=''; this.style.boxShadow='0 2px 8px rgba(0, 0, 0, 0.3)'">
                                <i class="fa-solid fa-right-to-bracket mr-2"></i>Sign In
                            </button>
                        </div>
                    `}

                    <!-- Comments List -->
                    <div id="comments-list">
                        <div class="text-center py-8 rounded-lg" style="background: linear-gradient(135deg, rgba(31, 41, 55, 0.3) 0%, rgba(17, 24, 39, 0.2) 100%);">
                            <div class="inline-block animate-spin mb-3">
                                <i class="fa-solid fa-spinner text-2xl" style="color: #00CB97;"></i>
                            </div>
                            <p class="text-sm" style="color: rgb(156, 163, 175);">Loading comments...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getLoadingHTML() {
        return `
            <div class="bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto mobile-market-modal" style="margin: 1rem; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); position: relative; scrollbar-width: none; -ms-overflow-style: none;">
                <style>
                    .mobile-market-modal::-webkit-scrollbar {
                        display: none;
                    }
                </style>
                <button data-action="close-modal"
                        class="absolute z-50 text-white font-bold transition touch-target"
                        style="top: 12px; right: 12px; width: 40px; height: 40px; background: rgba(239, 68, 68, 0.9); border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; font-size: 24px; line-height: 1; cursor: pointer; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
                    &times;
                </button>
                <div class="p-6">
                    <div class="text-center py-16">
                        <div class="inline-block animate-spin mb-4">
                            <i class="fa-solid fa-spinner text-3xl" style="color: #00CB97;"></i>
                        </div>
                        <p class="text-sm" style="color: rgb(156, 163, 175);">Loading market details...</p>
                    </div>
                </div>
            </div>
        `;
    }

    getErrorHTML(message) {
        return `
            <div class="bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto mobile-market-modal" style="margin: 1rem; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); position: relative; scrollbar-width: none; -ms-overflow-style: none;">
                <style>
                    .mobile-market-modal::-webkit-scrollbar {
                        display: none;
                    }
                </style>
                <button data-action="close-modal"
                        class="absolute z-50 text-white font-bold transition touch-target"
                        style="top: 12px; right: 12px; width: 40px; height: 40px; background: rgba(239, 68, 68, 0.9); border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; font-size: 24px; line-height: 1; cursor: pointer; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
                    &times;
                </button>
                <div class="p-6">
                    <div class="text-center py-12 rounded-lg border" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%); border: 1px solid rgba(239, 68, 68, 0.3);">
                        <i class="fa-solid fa-exclamation-triangle text-3xl mb-3" style="color: rgb(248, 113, 113);"></i>
                        <p style="color: rgb(248, 113, 113);">${this.escapeHtml(message)}</p>
                    </div>
                </div>
            </div>
        `;
    }

    attachListeners(modal) {
        this.attachCloseListener(modal);

        // Share menu toggle
        const shareMenuBtn = modal.querySelector('#share-menu-btn');
        const shareMenu = modal.querySelector('#share-menu');
        if (shareMenuBtn && shareMenu) {
            shareMenuBtn.addEventListener('click', () => {
                shareMenu.classList.toggle('hidden');
            });
        }

        // Copy link button
        const copyLinkBtn = modal.querySelector('#copy-link-btn');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', async () => {
                const shareUrl = window.location.href + '?market=' + this.marketId;
                try {
                    await navigator.clipboard.writeText(shareUrl);
                    // Visual feedback
                    const originalText = copyLinkBtn.innerHTML;
                    copyLinkBtn.innerHTML = `
                        <svg class="h-6 w-6" style="color: #00CB97;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        <span class="text-xs font-semibold">Copied!</span>
                    `;
                    setTimeout(() => {
                        copyLinkBtn.innerHTML = originalText;
                    }, 2000);
                } catch (err) {
                    alert('Failed to copy link. Please try again.');
                }
            });
        }

        modal.querySelectorAll('[data-action="open-auth"]').forEach((button) => {
            button.addEventListener('click', () => {
                this.closeModal(modal);
                if (typeof app !== 'undefined' && typeof app.showAuthModal === 'function') {
                    app.showAuthModal();
                }
            });
        });

        if (!this.app.currentUser) return;

        // Outcome selection
        modal.querySelectorAll('.outcome-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedOutcome = btn.dataset.outcome;

                // Update UI
                modal.querySelectorAll('.outcome-btn').forEach(b => {
                    b.classList.remove('border-green-500', 'border-red-500', 'bg-green-900', 'bg-red-900', 'bg-opacity-30');
                    b.classList.add('border-gray-600', 'bg-gray-700');
                });

                if (this.selectedOutcome === 'yes') {
                    btn.classList.remove('border-gray-600', 'bg-gray-700');
                    btn.classList.add('border-green-500', 'bg-green-900', 'bg-opacity-30');
                } else {
                    btn.classList.remove('border-gray-600', 'bg-gray-700');
                    btn.classList.add('border-red-500', 'bg-red-900', 'bg-opacity-30');
                }

                this.updateBetSummary(modal);
            });
        });

        // Quick amount buttons
        modal.querySelectorAll('.quick-amount-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = btn.dataset.amount;
                const amountInput = modal.querySelector('#bet-amount');
                amountInput.value = amount;
                this.betAmount = amount;
                this.updateBetSummary(modal);
            });
        });

        // Amount input
        const amountInput = modal.querySelector('#bet-amount');
        amountInput.addEventListener('input', (e) => {
            this.betAmount = e.target.value;
            this.updateBetSummary(modal);
        });

        // Place bet button
        modal.querySelector('#place-bet-btn').addEventListener('click', () => {
            this.handlePlaceBet(modal);
        });

        // Comment post button
        const postCommentBtn = modal.querySelector('#post-comment-btn');
        if (postCommentBtn) {
            postCommentBtn.addEventListener('click', () => {
                this.handlePostComment(modal);
            });
        }
    }


    updateBetSummary(modal) {
        const summary = modal.querySelector('#bet-summary');
        const placeBtn = modal.querySelector('#place-bet-btn');

        if (!this.selectedOutcome || !this.betAmount || parseFloat(this.betAmount) < 1) {
            summary.classList.add('hidden');
            placeBtn.disabled = true;
            placeBtn.textContent = 'Place Bet';
            return;
        }

        summary.classList.remove('hidden');
        modal.querySelector('#shares-amount').textContent = '...';
        modal.querySelector('#avg-cost').textContent = '...';
        modal.querySelector('#potential-return').textContent = '...';

        placeBtn.disabled = true;
        placeBtn.textContent = 'Calculating...';

        this.scheduleBetQuote(modal);
    }

    scheduleBetQuote(modal) {
        clearTimeout(this.quoteTimeout);

        const amount = parseFloat(this.betAmount);
        if (!amount || amount < 1) return;

        const outcome = this.selectedOutcome;
        this.quoteTimeout = setTimeout(async () => {
            const requestId = ++this.quoteRequestId;
            if (this.quoteAbortController) {
                this.quoteAbortController.abort();
            }
            this.quoteAbortController = new AbortController();

            try {
                const quote = await this.app.api.getBetQuoteWithOdds(this.marketId, outcome, amount, {
                    signal: this.quoteAbortController.signal
                });
                if (requestId != this.quoteRequestId) return;

                this.latestQuote = quote.data;
                this.applyQuoteToSummary(modal, quote.data, amount);
            } catch (error) {
                if (error?.name === 'AbortError') {
                    return;
                }
                if (requestId != this.quoteRequestId) return;
                this.latestQuote = null;
                this.applyFallbackSummary(modal, amount);
            }
        }, 250);
    }


    applyQuoteToSummary(modal, quote, amount) {
        const placeBtn = modal.querySelector('#place-bet-btn');

        const payout = parseFloat(quote.potentialPayout || 0);
        const profit = parseFloat(quote.potentialProfit || 0);
        const oddsFormatted = quote.currentOddsFormatted || this.formatDecimalOdds(parseFloat(quote.currentOdds || 0));

        modal.querySelector('#shares-amount').textContent = `J$${payout.toFixed(2)}`;
        modal.querySelector('#avg-cost').textContent = oddsFormatted;
        modal.querySelector('#potential-return').textContent = `+J$${profit.toFixed(2)}`;

        placeBtn.disabled = false;
        placeBtn.textContent = `Place Bet: J$${amount.toFixed(2)}`;
    }


    applyFallbackSummary(modal, amount) {
        const placeBtn = modal.querySelector('#place-bet-btn');

        const probability = this.selectedOutcome === 'yes' ? this.market.yes_price : this.market.no_price;
        const odds = probability ? (1 / probability) : 0;
        const payout = odds ? amount * odds : 0;
        const profit = payout - amount;

        modal.querySelector('#shares-amount').textContent = `J$${payout.toFixed(2)}`;
        modal.querySelector('#avg-cost').textContent = this.formatDecimalOdds(odds);
        modal.querySelector('#potential-return').textContent = `+J$${profit.toFixed(2)}`;

        placeBtn.disabled = false;
        placeBtn.textContent = `Place Bet: J$${amount.toFixed(2)}`;
    }

    async handlePlaceBet(modal) {
        const amount = parseFloat(this.betAmount);
        const price = this.selectedOutcome === 'yes' ? this.market.yes_price : this.market.no_price;
        const oddsDisplay = this.latestQuote?.currentOddsFormatted || this.formatOddsFromProbability(price);

        if (!confirm(`Confirm bet: J$${amount.toFixed(2)} on ${this.selectedOutcome.toUpperCase()} @ ${oddsDisplay}?`)) {
            return;
        }

        try {
            modal.querySelector('#place-bet-btn').disabled = true;
            modal.querySelector('#place-bet-btn').textContent = 'Placing bet...';

            await this.app.api.placeBetWithOdds(this.marketId, this.selectedOutcome, amount);

            alert('Bet placed successfully!');
            this.closeModal(modal);

            // Refresh views
            this.app.render();
        } catch (error) {
            alert('Error placing bet: ' + error.message);
            modal.querySelector('#place-bet-btn').disabled = false;
            modal.querySelector('#place-bet-btn').textContent = 'Place Bet';
        }
    }

    async loadComments(modal) {
        const commentsList = modal.querySelector('#comments-list');
        try {
            const comments = await this.app.api.getMarketComments(this.marketId);

            if (comments.length === 0) {
                commentsList.innerHTML = `
                    <div class="text-center py-12 rounded-lg" style="background: linear-gradient(135deg, rgba(31, 41, 55, 0.3) 0%, rgba(17, 24, 39, 0.2) 100%);">
                        <div class="mb-3">
                            <i class="fa-regular fa-comments text-5xl" style="color: rgba(156, 163, 175, 0.4);"></i>
                        </div>
                        <p class="font-medium mb-1" style="color: rgb(156, 163, 175);">No comments yet</p>
                        <p class="text-sm" style="color: rgba(156, 163, 175, 0.7);">Be the first to share your thoughts!</p>
                    </div>
                `;
                return;
            }

            commentsList.innerHTML = comments.map(comment => this.renderComment(comment)).join('');
        } catch (error) {
            commentsList.innerHTML = `
                <div class="text-center py-8 rounded-lg border" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%); border: 1px solid rgba(239, 68, 68, 0.3);">
                    <i class="fa-solid fa-exclamation-triangle text-3xl mb-3" style="color: rgb(248, 113, 113);"></i>
                    <p style="color: rgb(248, 113, 113);">Error loading comments</p>
                </div>
            `;
        }
    }

    renderComment(comment) {
        const timeAgo = this.getTimeAgo(comment.created_at);
        const isCurrentUser = this.app.currentUser && comment.user_id === this.app.currentUser.id;

        // Generate user initials and color
        const safeUsername = escapeHtml(comment.user.username);
        const initial = safeUsername.charAt(0).toUpperCase();
        const userColor = this.getUserColor(comment.user.username);

        return `
            <div class="mb-3 p-4 rounded-lg border transition-all hover:border-gray-600"
                 style="background: linear-gradient(135deg, rgba(31, 41, 55, 0.6) 0%, rgba(17, 24, 39, 0.4) 100%); border: 1px solid rgba(75, 85, 99, 0.3); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);"
                 data-comment-id="${comment.id}">
                <div class="flex items-start gap-3">
                    <!-- User Avatar -->
                    <div class="flex-shrink-0">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-lg"
                             style="background: linear-gradient(135deg, ${userColor} 0%, ${this.darkenColor(userColor)} 100%);">
                            ${initial}
                        </div>
                    </div>

                    <!-- Comment Content -->
                    <div class="flex-1 min-w-0">
                        <!-- Header -->
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-semibold text-sm" style="color: #00CB97;">@${safeUsername}</span>
                                <span class="text-xs px-2 py-0.5 rounded-full" style="background: rgba(75, 85, 99, 0.3); color: rgb(156, 163, 175);">
                                    <i class="fa-regular fa-clock" style="font-size: 10px;"></i> ${timeAgo}
                                </span>
                            </div>
                            ${isCurrentUser ? `
                                <button onclick="event.stopPropagation(); app.marketDetailModal.deleteComment('${comment.id}')"
                                        class="text-xs px-2 py-1 rounded transition hover:bg-red-500/20 text-red-400 hover:text-red-300 flex items-center gap-1"
                                        style="min-height: 28px;">
                                    <i class="fa-solid fa-trash" style="font-size: 10px;"></i>
                                    <span class="hidden md:inline">Delete</span>
                                </button>
                            ` : ''}
                        </div>

                        <!-- Comment Text -->
                        <p class="text-sm leading-relaxed whitespace-pre-wrap" style="color: rgb(229, 231, 235);">
                            ${this.escapeHtml(comment.content)}
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    getUserColor(username) {
        // Generate consistent color from username
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = hash % 360;
        return `hsl(${hue}, 65%, 50%)`;
    }

    darkenColor(hslColor) {
        // Darken the color for gradient
        const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        if (match) {
            return `hsl(${match[1]}, ${match[2]}%, ${Math.max(0, parseInt(match[3]) - 15)}%)`;
        }
        return hslColor;
    }

    async handlePostComment(modal) {
        const input = modal.querySelector('#comment-input');
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
            const button = modal.querySelector('#post-comment-btn');
            button.disabled = true;
            button.textContent = 'Posting...';

            await this.app.api.createComment(this.marketId, content);

            input.value = '';
            button.disabled = false;
            button.textContent = 'Post Comment';

            // Reload comments
            this.loadComments(modal);
        } catch (error) {
            alert('Error posting comment: ' + error.message);
            const button = modal.querySelector('#post-comment-btn');
            button.disabled = false;
            button.textContent = 'Post Comment';
        }
    }

    async deleteComment(commentId) {
        if (!confirm('Are you sure you want to delete this comment?')) {
            return;
        }

        try {
            await this.app.api.deleteComment(commentId);
            const modal = document.querySelector('.modal-backdrop');
            this.loadComments(modal);
        } catch (error) {
            alert('Error deleting comment: ' + error.message);
        }
    }

    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export to window
window.MarketDetailModal = MarketDetailModal;
