// Admin Banner Management
class AdminBanners {
    constructor(api) {
        this.api = api;
        this.banners = [];
        this.selectedBanner = null;
        this.uploadingImage = false;
        this.currentImageData = null; // Store current image data for dragging
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.currentPosX = 50; // Default center
        this.currentPosY = 50; // Default center
    }

    async init() {
        await this.loadBanners();
        this.render();
    }

    async loadBanners() {
        try {
            const { data, error } = await this.api.db
                .from('banners')
                .select('*')
                .order('order_index', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.banners = data || [];
        } catch (error) {
            console.error('Error loading banners:', error);
            alert('Failed to load banners');
        }
    }

    render() {
        const container = document.getElementById('admin-banners-section');
        if (!container) return;

        container.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-6">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-2xl font-bold">Banner Management</h2>
                    <div class="flex gap-2">
                        <button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition" onclick="adminBanners.showBulkUploadModal()">
                            <svg class="inline-block h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                            </svg>
                            Bulk Upload
                        </button>
                        <button class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition" onclick="adminBanners.showCreateModal()">
                            Add New Banner
                        </button>
                    </div>
                </div>

                <!-- Banners List -->
                <div class="space-y-4">
                    ${this.banners.length === 0 ? `
                        <p class="text-gray-400 text-center py-8">No banners yet. Create your first banner!</p>
                    ` : this.banners.map(banner => this.renderBannerCard(banner)).join('')}
                </div>
            </div>
        `;
    }

    renderBannerCard(banner) {
        return `
            <div class="bg-gray-700 rounded-lg p-4 flex items-center gap-4">
                <!-- Thumbnail -->
                <div class="w-32 h-20 bg-gray-600 rounded overflow-hidden flex-shrink-0">
                    <img src="${banner.image_url}" alt="${banner.title || 'Banner'}" class="w-full h-full object-cover">
                </div>

                <!-- Info -->
                <div class="flex-1">
                    <h3 class="font-bold text-white mb-1">${banner.title || 'Untitled Banner'}</h3>
                    <p class="text-sm text-gray-400 mb-2">${banner.description || 'No description'}</p>
                    <div class="flex items-center gap-3 text-xs text-gray-400">
                        <span>Order: ${banner.order_index}</span>
                        <span>•</span>
                        <span class="${banner.active ? 'text-green-400' : 'text-red-400'}">${banner.active ? 'Active' : 'Inactive'}</span>
                        ${banner.link_type !== 'none' ? `<span>• Link: ${banner.link_type}</span>` : ''}
                    </div>
                </div>

                <!-- Actions -->
                <div class="flex gap-2">
                    <button class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm transition" onclick="adminBanners.showEditModal('${banner.id}')">
                        Edit
                    </button>
                    <button class="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 rounded text-sm transition" onclick="adminBanners.toggleActive('${banner.id}', ${!banner.active})">
                        ${banner.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm transition" onclick="adminBanners.deleteBanner('${banner.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `;
    }

    showCreateModal() {
        this.selectedBanner = null;
        this.showBannerModal();
    }

    async showEditModal(bannerId) {
        const banner = this.banners.find(b => b.id === bannerId);
        if (!banner) return;

        this.selectedBanner = banner;
        this.showBannerModal(banner);
    }

    showBannerModal(banner = null) {
        const isEdit = banner !== null;

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <h2 class="text-2xl font-bold mb-6">${isEdit ? 'Edit Banner' : 'Create New Banner'}</h2>

                    <form id="bannerForm" class="space-y-4">
                        <!-- Image Upload -->
                        <div>
                            <label class="block text-lg font-bold mb-3" style="color: #00CB97;">Upload Banner Image</label>

                            <!-- Dimension Guide -->
                            <div class="bg-gray-700 border-l-4 border-green-500 p-4 mb-4 rounded">
                                <h4 class="font-bold text-white mb-2 flex items-center gap-2">
                                    <svg class="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    Recommended Image Dimensions
                                </h4>
                                <div class="space-y-2 text-sm">
                                    <div class="grid grid-cols-2 gap-4">
                                        <div class="bg-gray-800 p-3 rounded">
                                            <p class="text-gray-400 text-xs mb-1">Desktop (Full Banner)</p>
                                            <p class="text-white font-bold">1920 × 400px</p>
                                            <p class="text-gray-500 text-xs mt-1">Ideal for carousel</p>
                                        </div>
                                        <div class="bg-gray-800 p-3 rounded">
                                            <p class="text-gray-400 text-xs mb-1">Desktop (Compact)</p>
                                            <p class="text-white font-bold">1920 × 140px</p>
                                            <p class="text-gray-500 text-xs mt-1">Compact banner</p>
                                        </div>
                                        <div class="bg-gray-800 p-3 rounded">
                                            <p class="text-gray-400 text-xs mb-1">Mobile</p>
                                            <p class="text-white font-bold">768 × 200px</p>
                                            <p class="text-gray-500 text-xs mt-1">Mobile optimized</p>
                                        </div>
                                        <div class="bg-gray-800 p-3 rounded">
                                            <p class="text-gray-400 text-xs mb-1">Safe Zone</p>
                                            <p class="text-white font-bold">1600 × 300px</p>
                                            <p class="text-gray-500 text-xs mt-1">Universal fit</p>
                                        </div>
                                    </div>
                                    <p class="text-gray-400 text-xs mt-3">
                                        <strong class="text-green-400">Tip:</strong> Use landscape images with important content centered. Avoid text near edges.
                                    </p>
                                </div>
                            </div>

                            <div class="space-y-3">
                                ${banner?.image_url ? `
                                    <div class="relative w-full h-64 bg-gray-700 rounded-lg overflow-hidden">
                                        <img id="bannerPreview" src="${banner.image_url}" class="w-full h-full object-cover">
                                        <div class="absolute bottom-2 right-2 bg-black bg-opacity-75 px-2 py-1 rounded text-xs text-white" id="imageDimensions">
                                            Loading dimensions...
                                        </div>
                                    </div>
                                ` : `
                                    <div id="bannerPreview" class="w-full h-64 bg-gray-700 rounded-lg flex items-center justify-center text-gray-400">
                                        <div class="text-center">
                                            <svg class="mx-auto h-12 w-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                            </svg>
                                            <p class="text-sm">No image selected</p>
                                        </div>
                                    </div>
                                `}
                                <input type="file" id="bannerImageInput" accept="image/*" class="block w-full text-sm text-gray-400
                                    file:mr-4 file:py-3 file:px-6
                                    file:rounded-lg file:border-0
                                    file:text-sm file:font-bold
                                    file:bg-green-600 file:text-white
                                    hover:file:bg-green-700 file:cursor-pointer cursor-pointer">
                                <div class="flex items-start gap-2 text-xs text-gray-400">
                                    <svg class="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <span>Max file size: 5MB. Supported formats: JPG, PNG, WebP, GIF. Your image dimensions will be shown after upload.</span>
                                </div>
                            </div>
                        </div>

                        <!-- Image Positioning Controls -->
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold mb-2">How to Fit</label>
                                <select name="image_fit" id="imageFitSelect" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white font-medium">
                                    <option value="cover" ${banner?.image_fit === 'cover' || !banner?.image_fit ? 'selected' : ''}>Fill Frame (Crop)</option>
                                    <option value="contain" ${banner?.image_fit === 'contain' ? 'selected' : ''}>Fit Fully (No Crop)</option>
                                    <option value="fill" ${banner?.image_fit === 'fill' ? 'selected' : ''}>Stretch to Fit</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-sm font-semibold mb-2">Quick Position</label>
                                <select name="image_position" id="imagePositionSelect" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white font-medium">
                                    <option value="center" ${banner?.image_position === 'center' || !banner?.image_position ? 'selected' : ''}>Center</option>
                                    <option value="top" ${banner?.image_position === 'top' ? 'selected' : ''}>Top</option>
                                    <option value="bottom" ${banner?.image_position === 'bottom' ? 'selected' : ''}>Bottom</option>
                                    <option value="left" ${banner?.image_position === 'left' ? 'selected' : ''}>Left</option>
                                    <option value="right" ${banner?.image_position === 'right' ? 'selected' : ''}>Right</option>
                                    <option value="custom">Custom (Use controls below)</option>
                                </select>
                            </div>
                        </div>

                        <!-- Fine-Tune Position Controls (Admin Only) -->
                        <div id="fineTuneControls" class="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-2 border-purple-500/30 rounded-lg p-4 mt-4" style="display: none;">
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex items-center gap-2">
                                    <svg class="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
                                    </svg>
                                    <h4 class="font-bold text-purple-300">Fine-Tune Image Position</h4>
                                </div>
                                <span class="text-xs text-purple-400">Admin Feature</span>
                            </div>

                            <!-- Live Preview -->
                            <div class="mb-4">
                                <label class="block text-sm font-semibold mb-2 text-purple-200">Live Preview (Drag to adjust)</label>
                                <div id="bannerLivePreview" class="relative w-full h-32 bg-gray-800 rounded-lg overflow-hidden border-2 border-purple-500/50 cursor-move">
                                    <div class="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                                        Upload an image to preview
                                    </div>
                                </div>
                                <p class="text-xs text-purple-300 mt-2">💡 Click and drag the image above to position it, or use buttons below</p>
                            </div>

                            <!-- Position Control Buttons -->
                            <div class="grid grid-cols-5 gap-2 mb-3">
                                <button type="button" onclick="adminBanners.adjustPosition('up')" class="col-start-3 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white text-sm font-semibold transition flex items-center justify-center">
                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
                                </button>
                                <button type="button" onclick="adminBanners.adjustPosition('left')" class="col-start-2 row-start-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white text-sm font-semibold transition flex items-center justify-center">
                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                                </button>
                                <button type="button" onclick="adminBanners.adjustPosition('center')" class="col-start-3 row-start-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm font-semibold transition">
                                    Center
                                </button>
                                <button type="button" onclick="adminBanners.adjustPosition('right')" class="col-start-4 row-start-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white text-sm font-semibold transition flex items-center justify-center">
                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                                </button>
                                <button type="button" onclick="adminBanners.adjustPosition('down')" class="col-start-3 row-start-3 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white text-sm font-semibold transition flex items-center justify-center">
                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                                </button>
                            </div>

                            <!-- Position Values Display -->
                            <div class="grid grid-cols-2 gap-3 text-xs">
                                <div class="bg-gray-800 p-2 rounded">
                                    <span class="text-gray-400">Horizontal:</span>
                                    <span id="posXDisplay" class="text-white font-bold ml-1">50%</span>
                                </div>
                                <div class="bg-gray-800 p-2 rounded">
                                    <span class="text-gray-400">Vertical:</span>
                                    <span id="posYDisplay" class="text-white font-bold ml-1">50%</span>
                                </div>
                            </div>

                            <!-- Hidden inputs to store custom position -->
                            <input type="hidden" name="custom_position_x" id="customPosX" value="50">
                            <input type="hidden" name="custom_position_y" id="customPosY" value="50">
                        </div>

                        <!-- Optional: Advanced Settings (Collapsed) -->
                        <details class="bg-gray-700 rounded-lg p-4">
                            <summary class="cursor-pointer font-semibold text-sm text-gray-300 hover:text-white">Advanced Settings (Optional)</summary>
                            <div class="mt-4 space-y-4">
                                <!-- Title -->
                                <div>
                                    <label class="block text-sm font-medium mb-2">Title</label>
                                    <input type="text" name="title" value="${banner?.title || ''}" placeholder="Optional banner title" class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white">
                                </div>

                                <!-- Description -->
                                <div>
                                    <label class="block text-sm font-medium mb-2">Description</label>
                                    <textarea name="description" rows="2" placeholder="Optional description" class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white">${banner?.description || ''}</textarea>
                                </div>

                                <!-- Order -->
                                <div>
                                    <label class="block text-sm font-medium mb-2">Display Order</label>
                                    <input type="number" name="order_index" value="${banner?.order_index || 0}" class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white">
                                    <p class="text-xs text-gray-400 mt-1">Lower numbers display first</p>
                                </div>
                            </div>
                        </details>

                        <!-- Hidden fields with defaults -->
                        <input type="hidden" name="link_type" value="none">
                        <input type="hidden" name="active" value="true">

                        <!-- Actions -->
                        <div class="flex gap-3 pt-4">
                            <button type="submit" class="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 rounded font-bold transition">
                                ${isEdit ? 'Update Banner' : 'Create Banner'}
                            </button>
                            <button type="button" class="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded font-bold transition" onclick="this.closest('.fixed').remove()">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Image preview handling
        const imageInput = document.getElementById('bannerImageInput');
        imageInput.addEventListener('change', (e) => this.handleImagePreview(e));

        // Position select handling - show/hide fine-tune controls
        const positionSelect = document.getElementById('imagePositionSelect');
        const fineTuneControls = document.getElementById('fineTuneControls');
        positionSelect.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                fineTuneControls.style.display = 'block';
                // Initialize position values if editing with existing custom values
                if (banner?.custom_position_x && banner?.custom_position_y) {
                    this.currentPosX = banner.custom_position_x;
                    this.currentPosY = banner.custom_position_y;
                    this.updatePositionDisplays();
                }
            } else {
                fineTuneControls.style.display = 'none';
            }
        });

        // Initialize fine-tune controls visibility if editing with custom position
        if (banner?.image_position === 'custom') {
            fineTuneControls.style.display = 'block';
            this.currentPosX = banner?.custom_position_x || 50;
            this.currentPosY = banner?.custom_position_y || 50;
            this.updatePositionDisplays();
        }

        // Setup drag handlers for live preview
        this.setupDragHandlers();

        // Form submission
        const form = document.getElementById('bannerForm');
        form.addEventListener('submit', (e) => this.handleSubmit(e, isEdit));

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    handleImagePreview(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB');
            event.target.value = '';
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            event.target.value = '';
            return;
        }

        // Show preview with dimensions
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const width = img.width;
                const height = img.height;
                const aspectRatio = (width / height).toFixed(2);
                const fileSize = (file.size / 1024 / 1024).toFixed(2);

                // Store image data for dragging
                this.currentImageData = e.target.result;

                // Determine if dimensions match recommendations
                let dimensionStatus = '';
                let statusColor = 'text-yellow-400';

                if ((width === 1920 && height === 400) || (width === 1920 && height === 140)) {
                    dimensionStatus = '✓ Perfect for Desktop';
                    statusColor = 'text-green-400';
                } else if (width === 768 && height === 200) {
                    dimensionStatus = '✓ Perfect for Mobile';
                    statusColor = 'text-green-400';
                } else if (width >= 1600 && height >= 300 && aspectRatio >= 4) {
                    dimensionStatus = '✓ Good dimensions';
                    statusColor = 'text-green-400';
                } else if (width < 1200 || height < 100) {
                    dimensionStatus = '⚠ May be too small';
                    statusColor = 'text-red-400';
                } else {
                    dimensionStatus = 'ℹ Use positioning controls';
                    statusColor = 'text-blue-400';
                }

                // Update regular preview
                const preview = document.getElementById('bannerPreview');
                preview.innerHTML = `
                    <img src="${e.target.result}" class="w-full h-full object-cover">
                    <div class="absolute bottom-2 right-2 bg-black bg-opacity-90 px-3 py-2 rounded-lg text-xs space-y-1">
                        <div class="text-white font-bold">${width} × ${height}px</div>
                        <div class="text-gray-400">Ratio: ${aspectRatio}:1 • ${fileSize}MB</div>
                        <div class="${statusColor} font-semibold">${dimensionStatus}</div>
                    </div>
                `;
                preview.classList.add('relative');

                // Update live preview panel for dragging
                this.updateLivePreview();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    updateLivePreview() {
        const livePreview = document.getElementById('bannerLivePreview');
        if (!livePreview || !this.currentImageData) return;

        const fitValue = document.getElementById('imageFitSelect')?.value || 'cover';

        livePreview.innerHTML = `
            <img src="${this.currentImageData}"
                 style="
                     width: 100%;
                     height: 100%;
                     object-fit: ${fitValue};
                     object-position: ${this.currentPosX}% ${this.currentPosY}%;
                 "
                 class="pointer-events-none">
        `;
    }

    setupDragHandlers() {
        const livePreview = document.getElementById('bannerLivePreview');
        if (!livePreview) return;

        livePreview.addEventListener('mousedown', (e) => {
            if (!this.currentImageData) return;

            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            livePreview.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            const deltaX = e.clientX - this.dragStartX;
            const deltaY = e.clientY - this.dragStartY;

            // Convert pixel movement to percentage (sensitivity factor)
            const sensitivity = 0.5;
            this.currentPosX = Math.max(0, Math.min(100, this.currentPosX + (deltaX * sensitivity)));
            this.currentPosY = Math.max(0, Math.min(100, this.currentPosY + (deltaY * sensitivity)));

            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;

            this.updateLivePreview();
            this.updatePositionDisplays();
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                const livePreview = document.getElementById('bannerLivePreview');
                if (livePreview) livePreview.style.cursor = 'move';
            }
        });

        // Also update preview when fit type changes
        const fitSelect = document.getElementById('imageFitSelect');
        if (fitSelect) {
            fitSelect.addEventListener('change', () => {
                if (this.currentImageData) {
                    this.updateLivePreview();
                }
            });
        }
    }

    adjustPosition(direction) {
        const step = 5; // Move by 5% each time

        switch(direction) {
            case 'up':
                this.currentPosY = Math.max(0, this.currentPosY - step);
                break;
            case 'down':
                this.currentPosY = Math.min(100, this.currentPosY + step);
                break;
            case 'left':
                this.currentPosX = Math.max(0, this.currentPosX - step);
                break;
            case 'right':
                this.currentPosX = Math.min(100, this.currentPosX + step);
                break;
            case 'center':
                this.currentPosX = 50;
                this.currentPosY = 50;
                break;
        }

        this.updateLivePreview();
        this.updatePositionDisplays();
    }

    updatePositionDisplays() {
        const posXDisplay = document.getElementById('posXDisplay');
        const posYDisplay = document.getElementById('posYDisplay');
        const customPosX = document.getElementById('customPosX');
        const customPosY = document.getElementById('customPosY');

        if (posXDisplay) posXDisplay.textContent = `${Math.round(this.currentPosX)}%`;
        if (posYDisplay) posYDisplay.textContent = `${Math.round(this.currentPosY)}%`;
        if (customPosX) customPosX.value = Math.round(this.currentPosX);
        if (customPosY) customPosY.value = Math.round(this.currentPosY);
    }

    async handleSubmit(event, isEdit) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);
        const imageInput = document.getElementById('bannerImageInput');
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;

        try {
            // Show loading
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-glow inline-block w-4 h-4 mr-2"></span>Uploading...';

            let imageUrl = this.selectedBanner?.image_url || '';

            // Upload image if new file selected
            if (imageInput.files.length > 0) {
                imageUrl = await this.uploadImage(imageInput.files[0]);
            }

            if (!imageUrl) {
                throw new Error('Image is required');
            }

            // Prepare banner data
            const imagePosition = formData.get('image_position') || 'center';
            const bannerData = {
                image_url: imageUrl,
                title: formData.get('title') || null,
                description: formData.get('description') || null,
                link_type: 'none',
                link_id: null,
                link_url: null,
                image_fit: formData.get('image_fit') || 'cover',
                image_position: imagePosition,
                order_index: parseInt(formData.get('order_index')) || 0,
                active: true
            };

            // Add custom position values if custom position is selected
            if (imagePosition === 'custom') {
                bannerData.custom_position_x = parseInt(formData.get('custom_position_x')) || 50;
                bannerData.custom_position_y = parseInt(formData.get('custom_position_y')) || 50;
            } else {
                bannerData.custom_position_x = null;
                bannerData.custom_position_y = null;
            }

            // Create or update banner
            if (isEdit) {
                const { error } = await this.api.db
                    .from('banners')
                    .update(bannerData)
                    .eq('id', this.selectedBanner.id);

                if (error) throw error;
            } else {
                const { error } = await this.api.db
                    .from('banners')
                    .insert([bannerData]);

                if (error) throw error;
            }

            // Reload and re-render
            await this.loadBanners();
            this.render();

            // Close modal
            form.closest('.fixed').remove();

            alert(`Banner ${isEdit ? 'updated' : 'created'} successfully!`);
        } catch (error) {
            console.error('Error saving banner:', error);
            alert(`Failed to save banner: ${error.message}`);

            // Reset button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    async uploadImage(file) {
        try {
            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `banners/${fileName}`;

            // Upload to Supabase Storage
            const { data, error } = await this.api.db.storage
                .from('banners')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get public URL
            const { data: urlData } = this.api.db.storage
                .from('banners')
                .getPublicUrl(filePath);

            return urlData.publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw new Error('Failed to upload image');
        }
    }

    async toggleActive(bannerId, newStatus) {
        try {
            const { error } = await this.api.db
                .from('banners')
                .update({ active: newStatus })
                .eq('id', bannerId);

            if (error) throw error;

            await this.loadBanners();
            this.render();
        } catch (error) {
            console.error('Error updating banner status:', error);
            alert('Failed to update banner status');
        }
    }

    async deleteBanner(bannerId) {
        if (!confirm('Are you sure you want to delete this banner?')) return;

        try {
            const { error } = await this.api.db
                .from('banners')
                .delete()
                .eq('id', bannerId);

            if (error) throw error;

            await this.loadBanners();
            this.render();
        } catch (error) {
            console.error('Error deleting banner:', error);
            alert('Failed to delete banner');
        }
    }

    showBulkUploadModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <h2 class="text-2xl font-bold mb-6">Bulk Upload Banners</h2>

                    <!-- Quick Dimension Reference -->
                    <div class="bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-3 mb-4 text-sm">
                        <div class="flex items-start gap-2">
                            <svg class="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <div>
                                <p class="text-blue-300 font-semibold mb-1">Recommended: 1920×400px (Desktop) or 768×200px (Mobile)</p>
                                <p class="text-blue-200 text-xs">Images will be validated after upload. Use positioning controls below to adjust fit.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Drag & Drop Zone -->
                    <div id="dropZone" class="border-2 border-dashed border-gray-600 rounded-lg p-8 mb-6 text-center transition hover:border-green-500 cursor-pointer">
                        <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                        </svg>
                        <p class="text-lg font-semibold mb-2">Drag & drop images here</p>
                        <p class="text-sm text-gray-400 mb-4">or click to browse</p>
                        <input type="file" id="bulkImageInput" accept="image/*" multiple class="hidden">
                        <button type="button" class="px-6 py-2 bg-green-600 hover:bg-green-700 rounded font-bold transition" onclick="document.getElementById('bulkImageInput').click()">
                            Choose Files
                        </button>
                    </div>

                    <!-- Preview Grid -->
                    <div id="previewGrid" class="grid grid-cols-3 gap-4 mb-6 hidden">
                        <!-- Previews will be inserted here -->
                    </div>

                    <!-- Common Settings -->
                    <div id="commonSettings" class="hidden mb-6">
                        <h3 class="font-semibold mb-3">Position Settings (Applied to All)</h3>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium mb-2">How to Fit</label>
                                <select id="bulkImageFit" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white font-medium">
                                    <option value="cover">Fill Frame (Crop)</option>
                                    <option value="contain">Fit Fully (No Crop)</option>
                                    <option value="fill">Stretch to Fit</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-2">Position</label>
                                <select id="bulkImagePosition" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white font-medium">
                                    <option value="center">Center</option>
                                    <option value="top">Top</option>
                                    <option value="bottom">Bottom</option>
                                    <option value="left">Left</option>
                                    <option value="right">Right</option>
                                </select>
                            </div>
                        </div>
                        <input type="hidden" id="startingOrder" value="0">
                        <input type="hidden" id="bulkActive" value="true">
                    </div>

                    <!-- Actions -->
                    <div class="flex gap-3">
                        <button id="uploadAllBtn" class="hidden flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 rounded font-bold transition" onclick="adminBanners.handleBulkUpload()">
                            Upload All Banners
                        </button>
                        <button type="button" class="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded font-bold transition" onclick="this.closest('.fixed').remove()">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup drag & drop handlers
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('bulkImageInput');
        const previewGrid = document.getElementById('previewGrid');
        const commonSettings = document.getElementById('commonSettings');
        const uploadBtn = document.getElementById('uploadAllBtn');

        let selectedFiles = [];

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Highlight drop zone when dragging over
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('border-green-500', 'bg-gray-700');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('border-green-500', 'bg-gray-700');
            });
        });

        // Handle dropped files
        dropZone.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            handleFiles(files);
        });

        // Handle file input change
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            handleFiles(files);
        });

        // File handling function
        const handleFiles = (files) => {
            if (files.length === 0) return;

            // Validate files
            const validFiles = files.filter(file => {
                if (file.size > 5 * 1024 * 1024) {
                    alert(`${file.name} is too large (max 5MB)`);
                    return false;
                }
                if (!file.type.startsWith('image/')) {
                    alert(`${file.name} is not an image`);
                    return false;
                }
                return true;
            });

            if (validFiles.length === 0) return;

            selectedFiles = validFiles;
            renderPreviews(validFiles);
            previewGrid.classList.remove('hidden');
            commonSettings.classList.remove('hidden');
            uploadBtn.classList.remove('hidden');
        };

        // Render preview grid
        const renderPreviews = (files) => {
            previewGrid.innerHTML = files.map((file, index) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.getElementById(`preview-${index}`);
                    if (img) img.src = e.target.result;
                };
                reader.readAsDataURL(file);

                return `
                    <div class="relative bg-gray-700 rounded-lg overflow-hidden group">
                        <img id="preview-${index}" src="" alt="${file.name}" class="w-full h-32 object-cover">
                        <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <button type="button" class="p-2 bg-red-600 hover:bg-red-700 rounded-full" onclick="adminBanners.removeFileFromBulk(${index})">
                                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                        <p class="text-xs text-gray-400 p-2 truncate">${file.name}</p>
                    </div>
                `;
            }).join('');
        };

        // Store files in instance variable for later access
        this.bulkFiles = selectedFiles;
        this.bulkModal = modal;
        this.bulkHandleFiles = handleFiles;
        this.bulkRenderPreviews = renderPreviews;

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    removeFileFromBulk(index) {
        this.bulkFiles.splice(index, 1);
        if (this.bulkFiles.length === 0) {
            document.getElementById('previewGrid').classList.add('hidden');
            document.getElementById('commonSettings').classList.add('hidden');
            document.getElementById('uploadAllBtn').classList.add('hidden');
        } else {
            this.bulkRenderPreviews(this.bulkFiles);
        }
    }

    async handleBulkUpload() {
        if (!this.bulkFiles || this.bulkFiles.length === 0) return;

        const uploadBtn = document.getElementById('uploadAllBtn');
        const originalText = uploadBtn.textContent;

        try {
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<span class="spinner-glow inline-block w-4 h-4 mr-2"></span>Uploading...';

            const startingOrder = 0;
            const imageFit = document.getElementById('bulkImageFit').value;
            const imagePosition = document.getElementById('bulkImagePosition').value;
            const active = true;

            // Upload all files and create banners
            for (let i = 0; i < this.bulkFiles.length; i++) {
                const file = this.bulkFiles[i];

                // Update progress
                uploadBtn.innerHTML = `<span class="spinner-glow inline-block w-4 h-4 mr-2"></span>Uploading ${i + 1}/${this.bulkFiles.length}...`;

                // Upload image
                const imageUrl = await this.uploadImage(file);

                // Create banner with auto-generated title from filename
                const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
                const bannerData = {
                    image_url: imageUrl,
                    title: fileName,
                    description: null,
                    link_type: 'none',
                    link_id: null,
                    link_url: null,
                    image_fit: imageFit,
                    image_position: imagePosition,
                    order_index: startingOrder + (i * 10),
                    active: active
                };

                const { error } = await this.api.db
                    .from('banners')
                    .insert([bannerData]);

                if (error) throw error;
            }

            // Reload and close
            await this.loadBanners();
            this.render();
            this.bulkModal.remove();

            alert(`Successfully uploaded ${this.bulkFiles.length} banners!`);
        } catch (error) {
            console.error('Error bulk uploading:', error);
            alert(`Failed to upload banners: ${error.message}`);
            uploadBtn.disabled = false;
            uploadBtn.textContent = originalText;
        }
    }
}

// Export to window
window.AdminBanners = AdminBanners;
