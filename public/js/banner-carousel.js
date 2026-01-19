// Banner Carousel Component
class BannerCarousel {
    constructor(app) {
        this.app = app;
        this.banners = [];
        this.currentIndex = 0;
        this.autoplayInterval = null;
        this.autoplayDelay = 5000; // 5 seconds
        this.visibilityHandlerBound = false;
    }

    async loadBanners() {
        try {
            const { data, error } = await this.app.api.db
                .from('banners')
                .select('*')
                .eq('active', true)
                .order('order_index', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.banners = (data || []).filter((banner) => this.isValidImageUrl(banner.image_url));
            return this.banners;
        } catch (error) {
            console.error('Error loading banners:', error);
            return [];
        }
    }

    render(container) {
        if (!this.banners || this.banners.length === 0) {
            // Hide banner container if no banners
            const bannerContent = container.querySelector('.banner-content');
            if (bannerContent) {
                bannerContent.innerHTML = '';
            }
            container.classList.add('hidden');
            return;
        }

        const isMobile = window.innerWidth <= 768;

        // Find the banner-content div or use container directly
        const targetDiv = container.querySelector('.banner-content') || container;

        targetDiv.innerHTML = `
            <div class="banner-carousel mb-8 relative overflow-hidden rounded-2xl" style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%);">
                <!-- Banner Container -->
                <div class="banner-slides relative" style="height: ${isMobile ? '100px' : '120px'};">
                    ${this.banners.map((banner, index) => this.renderBannerSlide(banner, index)).join('')}
                </div>

                <!-- Navigation Arrows (Desktop Only) -->
                ${this.banners.length > 1 && !isMobile ? `
                    <button class="banner-nav banner-prev absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-3 rounded-full transition">
                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    <button class="banner-nav banner-next absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-3 rounded-full transition">
                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                        </svg>
                    </button>
                ` : ''}

                <!-- Dots Indicator -->
                ${this.banners.length > 1 ? `
                    <div class="banner-dots absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                        ${this.banners.map((_, index) => `
                            <button class="banner-dot w-2 h-2 rounded-full transition ${index === 0 ? 'bg-white' : 'bg-white bg-opacity-40'}" data-slide-index="${index}"></button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        // Make sure container is visible
        container.classList.remove('hidden');

        // Show close button
        const closeBtn = container.querySelector('.banner-close-btn');
        if (closeBtn) {
            closeBtn.classList.remove('hidden');
        }

        // Check if banner was previously closed
        this.checkBannerState();

        // Attach event listeners
        this.attachEventListeners(container);

        this.startAutoplay();
    }

    checkBannerState() {
        // Use shared isBannerClosed function if available, otherwise check manually
        const bannerClosed = typeof isBannerClosed === 'function' ? isBannerClosed() : (localStorage.getItem('bannerClosed') === 'true');
        if (bannerClosed) {
            const bannerContainer = document.getElementById('banner-container');
            const reopenContainer = document.getElementById('banner-reopen-container');

            if (bannerContainer && reopenContainer) {
                bannerContainer.classList.add('hidden');
                reopenContainer.classList.remove('hidden');
            }
        }
    }

    renderBannerSlide(banner, index) {
        const isActive = index === this.currentIndex;
        const isMobile = window.innerWidth <= 768;
        const imageUrl = this.isValidImageUrl(banner.image_url) ? banner.image_url : '';

        const imageFit = banner.image_fit || 'cover';
        const imageScale = Number.isFinite(banner.image_scale) ? banner.image_scale : 100;
        let backgroundSize = imageFit;

        if (imageFit === 'fill') {
            backgroundSize = '100% 100%';
        } else if (imageFit === 'none') {
            backgroundSize = `${imageScale}% auto`;
        } else if (imageFit === 'cover') {
            backgroundSize = isMobile ? '100% 100%' : 'cover';
        } else if (imageFit === 'contain') {
            backgroundSize = 'contain';
        }

        // Use mobile or desktop position values based on screen size
        let posX, posY;
        if (isMobile) {
            // Use mobile-specific positions if available, fallback to desktop positions
            posX = banner.custom_position_x_mobile !== null && banner.custom_position_x_mobile !== undefined
                ? banner.custom_position_x_mobile
                : (banner.custom_position_x !== null && banner.custom_position_x !== undefined ? banner.custom_position_x : 50);
            posY = banner.custom_position_y_mobile !== null && banner.custom_position_y_mobile !== undefined
                ? banner.custom_position_y_mobile
                : (banner.custom_position_y !== null && banner.custom_position_y !== undefined ? banner.custom_position_y : 50);
        } else {
            // Use desktop positions (default to center if not set)
            posX = banner.custom_position_x !== null && banner.custom_position_x !== undefined ? banner.custom_position_x : 50;
            posY = banner.custom_position_y !== null && banner.custom_position_y !== undefined ? banner.custom_position_y : 50;
        }
        const cssPosition = `${posX}% ${posY}%`;

        return `
            <div class="banner-slide absolute inset-0 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}" data-index="${index}">
                <!-- Background Image -->
                <div class="absolute inset-0" style="background-image: url('${imageUrl}'); background-size: ${backgroundSize}; background-position: ${cssPosition}; background-repeat: no-repeat; filter: brightness(0.85);"></div>

                <!-- Gradient Overlay -->
                <div class="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent opacity-40"></div>

                <!-- Content -->
                <div class="relative h-full flex items-center px-8 ${isMobile ? 'px-4' : 'px-12'}">
                    <div class="max-w-2xl banner-text-panel">
                        ${banner.title ? `
                            <h2 class="text-white font-bold mb-3 ${isMobile ? 'text-2xl' : 'text-4xl'}" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">
                                ${this.escapeHtml(banner.title)}
                            </h2>
                        ` : ''}
                        ${banner.description ? `
                            <p class="text-gray-200 mb-6 ${isMobile ? 'text-sm' : 'text-lg'}" style="text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">
                                ${this.escapeHtml(banner.description)}
                            </p>
                        ` : ''}
                        ${this.renderBannerAction(banner, isMobile)}
                    </div>
                </div>
            </div>
        `;
    }

    isValidImageUrl(url) {
        if (typeof url !== 'string') return false;
        const trimmed = url.trim();
        if (!trimmed) return false;
        if (trimmed.includes('${') || trimmed.includes('%7B') || trimmed.includes('%7D')) return false;
        return true;
    }

    renderBannerAction(banner, isMobile) {
        if (banner.link_type === 'market' && banner.link_id) {
            return `
                <button class="banner-action-btn px-6 py-3 rounded-lg font-bold transition ${isMobile ? 'text-sm' : 'text-base'} bg-[#00CB97] hover:bg-[#00e5af] text-white" data-market-id="${banner.link_id}">
                    View Market →
                </button>
            `;
        } else if (banner.link_type === 'external' && banner.link_url) {
            return `
                <a href="${this.escapeHtml(banner.link_url)}" target="_blank" rel="noopener noreferrer" class="inline-block px-6 py-3 rounded-lg font-bold transition ${isMobile ? 'text-sm' : 'text-base'} bg-[#00CB97] hover:bg-[#00e5af] text-white">
                    Learn More →
                </a>
            `;
        }
        return '';
    }

    attachEventListeners(container) {
        // Close button
        const closeBtn = container.querySelector('.banner-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (typeof closeBanner === 'function') {
                    closeBanner();
                }
            });
        }

        // Previous button
        const prevBtn = container.querySelector('.banner-prev');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prevSlide());
        }

        // Next button
        const nextBtn = container.querySelector('.banner-next');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextSlide());
        }

        // Dot indicators
        const dots = container.querySelectorAll('.banner-dot');
        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const index = parseInt(dot.dataset.slideIndex);
                this.goToSlide(index);
            });
        });

        // Market action buttons
        const actionBtns = container.querySelectorAll('.banner-action-btn');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const marketId = btn.dataset.marketId;
                if (window.app && window.app.showMarketDetail) {
                    window.app.showMarketDetail(marketId);
                }
            });
        });
    }

    nextSlide() {
        this.currentIndex = (this.currentIndex + 1) % this.banners.length;
        this.updateSlides();
        this.resetAutoplay();
    }

    prevSlide() {
        this.currentIndex = (this.currentIndex - 1 + this.banners.length) % this.banners.length;
        this.updateSlides();
        this.resetAutoplay();
    }

    goToSlide(index) {
        this.currentIndex = index;
        this.updateSlides();
        this.resetAutoplay();
    }

    updateSlides() {
        const slides = document.querySelectorAll('.banner-slide');
        const dots = document.querySelectorAll('.banner-dot');

        slides.forEach((slide, index) => {
            if (index === this.currentIndex) {
                slide.classList.remove('opacity-0');
                slide.classList.add('opacity-100');
            } else {
                slide.classList.remove('opacity-100');
                slide.classList.add('opacity-0');
            }
        });

        dots.forEach((dot, index) => {
            if (index === this.currentIndex) {
                dot.classList.remove('bg-opacity-40');
                dot.classList.add('bg-white');
            } else {
                dot.classList.add('bg-opacity-40');
                dot.classList.remove('bg-white');
            }
        });
    }

    startAutoplay() {
        if (this.banners.length <= 1) return;

        this.stopAutoplay();
        this.bindVisibilityHandlers();

        if (document.hidden) {
            return;
        }

        this.autoplayInterval = setInterval(() => {
            this.nextSlide();
        }, this.autoplayDelay);
    }

    stopAutoplay() {
        if (this.autoplayInterval) {
            clearInterval(this.autoplayInterval);
            this.autoplayInterval = null;
        }
    }

    resetAutoplay() {
        this.stopAutoplay();
        this.startAutoplay();
    }

    bindVisibilityHandlers() {
        if (this.visibilityHandlerBound) return;
        this.visibilityHandlerBound = true;

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopAutoplay();
            } else {
                this.startAutoplay();
            }
        });
    }

    destroy() {
        this.stopAutoplay();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export to window
window.BannerCarousel = BannerCarousel;
