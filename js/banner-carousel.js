// Banner Carousel Component
class BannerCarousel {
    constructor(app) {
        this.app = app;
        this.banners = [];
        this.currentIndex = 0;
        this.autoplayInterval = null;
        this.autoplayDelay = 5000; // 5 seconds
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
            this.banners = data || [];
            return this.banners;
        } catch (error) {
            console.error('Error loading banners:', error);
            return [];
        }
    }

    render(container) {
        if (!this.banners || this.banners.length === 0) {
            container.innerHTML = '';
            return;
        }

        const isMobile = window.innerWidth <= 768;

        container.innerHTML = `
            <div class="banner-carousel mb-8 relative overflow-hidden rounded-2xl" style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%);">
                <!-- Close Button -->
                <button class="banner-close-btn" onclick="closeBanner()" title="Close banner">
                    <i class="fa-solid fa-xmark"></i>
                </button>

                <!-- Loading Spinner -->
                <div class="banner-loading hidden absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-20">
                    <div class="spinner-glow"></div>
                </div>

                <!-- Banner Container -->
                <div class="banner-slides relative" style="height: ${isMobile ? '200px' : '400px'};">
                    ${this.banners.map((banner, index) => this.renderBannerSlide(banner, index)).join('')}
                </div>

                <!-- Navigation Arrows (Desktop Only) -->
                ${this.banners.length > 1 && !isMobile ? `
                    <button class="banner-nav banner-prev absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-3 rounded-full transition" onclick="bannerCarousel.prevSlide()">
                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    <button class="banner-nav banner-next absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-3 rounded-full transition" onclick="bannerCarousel.nextSlide()">
                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                        </svg>
                    </button>
                ` : ''}

                <!-- Dots Indicator -->
                ${this.banners.length > 1 ? `
                    <div class="banner-dots absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                        ${this.banners.map((_, index) => `
                            <button class="banner-dot w-2 h-2 rounded-full transition ${index === 0 ? 'bg-white' : 'bg-white bg-opacity-40'}" onclick="bannerCarousel.goToSlide(${index})"></button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        // Check if banner was previously closed
        this.checkBannerState();

        this.startAutoplay();
    }

    checkBannerState() {
        const bannerClosed = localStorage.getItem('bannerClosed') === 'true';
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

        const imageFit = banner.image_fit || 'cover';
        const imagePosition = banner.image_position || 'center';

        // Use custom position values if available, otherwise use preset position
        let cssPosition;
        if (imagePosition === 'custom' && banner.custom_position_x !== null && banner.custom_position_y !== null) {
            cssPosition = `${banner.custom_position_x}% ${banner.custom_position_y}%`;
        } else {
            // Convert position values to CSS format (e.g., 'top-left' to 'top left')
            cssPosition = imagePosition.replace('-', ' ');
        }

        return `
            <div class="banner-slide absolute inset-0 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}" data-index="${index}">
                <!-- Background Image -->
                <div class="absolute inset-0" style="background-image: url('${banner.image_url}'); background-size: ${imageFit}; background-position: ${cssPosition}; filter: brightness(0.7);"></div>

                <!-- Gradient Overlay -->
                <div class="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent opacity-60"></div>

                <!-- Content -->
                <div class="relative h-full flex items-center px-8 ${isMobile ? 'px-4' : 'px-12'}">
                    <div class="max-w-2xl">
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

    renderBannerAction(banner, isMobile) {
        if (banner.link_type === 'market' && banner.link_id) {
            return `
                <button class="px-6 py-3 rounded-lg font-bold transition ${isMobile ? 'text-sm' : 'text-base'}" style="background-color: #00CB97; color: white;" onmouseover="this.style.backgroundColor='#00e5af'" onmouseout="this.style.backgroundColor='#00CB97'" onclick="app.showMarketDetail('${banner.link_id}')">
                    View Market →
                </button>
            `;
        } else if (banner.link_type === 'external' && banner.link_url) {
            return `
                <a href="${this.escapeHtml(banner.link_url)}" target="_blank" rel="noopener noreferrer" class="inline-block px-6 py-3 rounded-lg font-bold transition ${isMobile ? 'text-sm' : 'text-base'}" style="background-color: #00CB97; color: white;" onmouseover="this.style.backgroundColor='#00e5af'" onmouseout="this.style.backgroundColor='#00CB97'">
                    Learn More →
                </a>
            `;
        }
        return '';
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
