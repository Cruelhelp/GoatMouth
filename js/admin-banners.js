// Admin Banner Management
class AdminBanners {
    constructor(api) {
        this.api = api;
        this.banners = [];
        this.selectedBanner = null;
        this.uploadingImage = false;
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
                            <div class="space-y-3">
                                ${banner?.image_url ? `
                                    <div class="relative w-full h-64 bg-gray-700 rounded-lg overflow-hidden">
                                        <img id="bannerPreview" src="${banner.image_url}" class="w-full h-full object-cover">
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
                                <p class="text-xs text-gray-400">Landscape image recommended (1920x400px). Max 5MB.</p>
                            </div>
                        </div>

                        <!-- Image Positioning Controls -->
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold mb-2">How to Fit</label>
                                <select name="image_fit" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white font-medium">
                                    <option value="cover" ${banner?.image_fit === 'cover' || !banner?.image_fit ? 'selected' : ''}>Fill Frame (Crop)</option>
                                    <option value="contain" ${banner?.image_fit === 'contain' ? 'selected' : ''}>Fit Fully (No Crop)</option>
                                    <option value="fill" ${banner?.image_fit === 'fill' ? 'selected' : ''}>Stretch to Fit</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-sm font-semibold mb-2">Position</label>
                                <select name="image_position" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white font-medium">
                                    <option value="center" ${banner?.image_position === 'center' || !banner?.image_position ? 'selected' : ''}>Center</option>
                                    <option value="top" ${banner?.image_position === 'top' ? 'selected' : ''}>Top</option>
                                    <option value="bottom" ${banner?.image_position === 'bottom' ? 'selected' : ''}>Bottom</option>
                                    <option value="left" ${banner?.image_position === 'left' ? 'selected' : ''}>Left</option>
                                    <option value="right" ${banner?.image_position === 'right' ? 'selected' : ''}>Right</option>
                                </select>
                            </div>
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

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('bannerPreview');
            preview.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover">`;
        };
        reader.readAsDataURL(file);
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
            const bannerData = {
                image_url: imageUrl,
                title: formData.get('title') || null,
                description: formData.get('description') || null,
                link_type: 'none',
                link_id: null,
                link_url: null,
                image_fit: formData.get('image_fit') || 'cover',
                image_position: formData.get('image_position') || 'center',
                order_index: parseInt(formData.get('order_index')) || 0,
                active: true
            };

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
