// Admin UI wiring for nav, tabs, and mobile menu.
// Keeps core interactions working even if inline scripts are blocked.

(function () {
    if (window.__adminUiBound) return;
    window.__adminUiBound = true;

    const bannerUiState = window.__bannerUiState || {
        currentImage: null,
        posX: 50,
        posY: 50,
        posXMobile: 50,
        posYMobile: 50,
        fit: 'cover',
        scale: 100,
        previewMode: 'desktop'
    };
    window.__bannerUiState = bannerUiState;

    function isValidBannerUrl(url) {
        if (typeof url !== 'string') return false;
        const trimmed = url.trim();
        if (!trimmed) return false;
        if (trimmed.includes('${') || trimmed.includes('%7B') || trimmed.includes('%7D')) return false;
        return true;
    }

    function toggleMobileMenu() {
        const hamburger = document.getElementById('hamburger');
        const menubar = document.querySelector('.menubar');
        const mobileOverlay = document.getElementById('mobileOverlay');
        if (hamburger) hamburger.classList.toggle('active');
        if (menubar) menubar.classList.toggle('active');
        if (mobileOverlay) mobileOverlay.classList.toggle('active');
        if (hamburger) {
            hamburger.setAttribute('aria-expanded', hamburger.classList.contains('active') ? 'true' : 'false');
        }
    }

    function closeMobileMenu() {
        const hamburger = document.getElementById('hamburger');
        const menubar = document.querySelector('.menubar');
        const mobileOverlay = document.getElementById('mobileOverlay');
        if (hamburger) hamburger.classList.remove('active');
        if (menubar) menubar.classList.remove('active');
        if (mobileOverlay) mobileOverlay.classList.remove('active');
        if (hamburger) {
            hamburger.setAttribute('aria-expanded', 'false');
        }
    }

    function updateBannerPreview() {
        const preview = document.getElementById('bannerLivePreview');
        if (!preview) return;

        if (!bannerUiState.currentImage) {
            preview.innerHTML = `
                <div class="flex items-center justify-center h-full text-gray-500 text-center">
                    <div>
                        <i class="fa-solid fa-image text-3xl mb-2 opacity-30"></i>
                        <p class="text-[13px]">Select or upload a banner to preview</p>
                    </div>
                </div>
            `;
            return;
        }
        if (!isValidBannerUrl(bannerUiState.currentImage)) {
            preview.innerHTML = `
                <div class="flex items-center justify-center h-full text-gray-500 text-center">
                    <div>
                        <i class="fa-solid fa-image text-3xl mb-2 opacity-30"></i>
                        <p class="text-[13px]">Banner image missing or invalid</p>
                    </div>
                </div>
            `;
            return;
        }

        const currentPosX = bannerUiState.previewMode === 'mobile' ? bannerUiState.posXMobile : bannerUiState.posX;
        const currentPosY = bannerUiState.previewMode === 'mobile' ? bannerUiState.posYMobile : bannerUiState.posY;
        let imageStyle = `
            width: 100%;
            height: 100%;
            object-fit: ${bannerUiState.fit};
            object-position: ${currentPosX}% ${currentPosY}%;
        `;

        if (bannerUiState.fit === 'none') {
            imageStyle = `
                width: auto;
                height: auto;
                max-width: none;
                max-height: none;
                position: absolute;
                left: ${currentPosX}%;
                top: ${currentPosY}%;
                transform: translate(-50%, -50%) scale(${bannerUiState.scale / 100});
                transform-origin: center;
            `;
        }

        preview.innerHTML = `
            <img src="${bannerUiState.currentImage}" style="${imageStyle}">
            <div class="banner-position-overlay">
                <div class="banner-position-indicator">
                    ${Math.round(currentPosX)}% x ${Math.round(currentPosY)}%
                    ${bannerUiState.fit === 'none' ? ` · ${bannerUiState.scale}%` : ''}
                </div>
            </div>
        `;

        const posXDisplay = document.getElementById('posXDisplay');
        const posYDisplay = document.getElementById('posYDisplay');
        if (posXDisplay) posXDisplay.textContent = `${Math.round(currentPosX)}%`;
        if (posYDisplay) posYDisplay.textContent = `${Math.round(currentPosY)}%`;
    }

    function selectBanner(id, imageUrl, posX, posY, fit, scale, posXMobile, posYMobile) {
        bannerUiState.currentImage = isValidBannerUrl(imageUrl) ? imageUrl : null;
        bannerUiState.posX = Number.isFinite(posX) ? posX : 50;
        bannerUiState.posY = Number.isFinite(posY) ? posY : 50;
        bannerUiState.posXMobile = Number.isFinite(posXMobile) ? posXMobile : 50;
        bannerUiState.posYMobile = Number.isFinite(posYMobile) ? posYMobile : 50;
        bannerUiState.fit = fit || 'cover';
        bannerUiState.scale = Number.isFinite(scale) ? scale : 100;

        localStorage.setItem('lastSelectedBannerId', id);
        updateBannerPreview();

        const statusEl = document.getElementById('bannerStatus');
        if (statusEl) {
            const hasImage = !!bannerUiState.currentImage;
            statusEl.textContent = hasImage ? 'Loaded' : 'Invalid image';
            statusEl.style.color = hasImage ? 'var(--info)' : 'var(--error)';
        }

        document.querySelectorAll('.banner-list-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.bannerId === id);
        });
    }

    function setBannerPosition(position, buttonEl) {
        let posX = 50;
        let posY = 50;
        if (position === 'top') posY = 0;
        if (position === 'bottom') posY = 100;

        if (bannerUiState.previewMode === 'mobile') {
            bannerUiState.posXMobile = posX;
            bannerUiState.posYMobile = posY;
        } else {
            bannerUiState.posX = posX;
            bannerUiState.posY = posY;
        }

        document.querySelectorAll('.banner-quick-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        if (buttonEl) buttonEl.classList.add('active');
        updateBannerPreview();
    }

    function adjustBannerPosition(direction) {
        const step = 5;
        let posX = bannerUiState.previewMode === 'mobile' ? bannerUiState.posXMobile : bannerUiState.posX;
        let posY = bannerUiState.previewMode === 'mobile' ? bannerUiState.posYMobile : bannerUiState.posY;

        if (direction === 'up') posY = Math.max(0, posY - step);
        if (direction === 'down') posY = Math.min(100, posY + step);
        if (direction === 'left') posX = Math.max(0, posX - step);
        if (direction === 'right') posX = Math.min(100, posX + step);

        if (bannerUiState.previewMode === 'mobile') {
            bannerUiState.posXMobile = posX;
            bannerUiState.posYMobile = posY;
        } else {
            bannerUiState.posX = posX;
            bannerUiState.posY = posY;
        }

        updateBannerPreview();
    }

    function switchPreviewMode(mode) {
        bannerUiState.previewMode = mode === 'mobile' ? 'mobile' : 'desktop';
        const preview = document.getElementById('bannerLivePreview');
        if (preview) preview.classList.toggle('mobile-preview', bannerUiState.previewMode === 'mobile');
        const desktopModeBtn = document.getElementById('desktopModeBtn');
        const mobileModeBtn = document.getElementById('mobileModeBtn');
        if (desktopModeBtn) desktopModeBtn.classList.toggle('active', bannerUiState.previewMode === 'desktop');
        if (mobileModeBtn) mobileModeBtn.classList.toggle('active', bannerUiState.previewMode === 'mobile');
        updateBannerPreview();
    }

    function setImageFit(fit) {
        bannerUiState.fit = fit || 'cover';
        const fitIds = ['fit-cover', 'fit-contain', 'fit-fill', 'fit-none'];
        fitIds.forEach((id) => {
            const btn = document.getElementById(id);
            if (btn) btn.classList.toggle('active', id === `fit-${bannerUiState.fit}`);
        });
        const scaleControls = document.getElementById('scaleControls');
        if (scaleControls) {
            scaleControls.style.display = bannerUiState.fit === 'none' ? 'block' : 'none';
        }
        updateBannerPreview();
    }

    function updateImageScale(value) {
        const next = parseInt(value, 10);
        bannerUiState.scale = Number.isFinite(next) ? next : bannerUiState.scale;
        updateBannerPreview();
    }

    function initMarketDescriptionEditor() {
        const editorEl = document.getElementById('marketDescriptionEditor');
        if (!editorEl || editorEl.dataset.quillReady === 'true') return;

        const form = document.getElementById('createMarketForm');
        let hiddenInput = document.getElementById('marketDescriptionInput');
        if (form && !hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 'description';
            hiddenInput.id = 'marketDescriptionInput';
            form.appendChild(hiddenInput);
        }

        if (window.Quill) {
            const editor = new Quill(editorEl, {
                theme: 'snow',
                placeholder: 'Market resolution criteria...',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        ['link', 'clean']
                    ]
                }
            });

            editor.on('text-change', () => {
                if (hiddenInput) {
                    hiddenInput.value = editor.root.innerHTML;
                }
            });

            if (hiddenInput) {
                hiddenInput.value = editor.root.innerHTML;
            }
        } else {
            editorEl.setAttribute('contenteditable', 'true');
        }

        editorEl.dataset.quillReady = 'true';
    }

    function loadAllMarketsFromTab(retryCount) {
        const container = document.getElementById('admin-content-markets');
        if (!container) return;
        if (window.adminPanel && window.adminPanel.api) {
            window.adminPanel.renderMarkets(container).catch(() => {});
            return;
        }
        const next = typeof retryCount === 'number' ? retryCount + 1 : 1;
        if (next <= 5) {
            setTimeout(() => loadAllMarketsFromTab(next), 400);
        }
    }

    function switchMarketTab(tab) {
        window.__pendingMarketTab = tab;
        document.querySelectorAll('.market-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        document.querySelectorAll('.market-tab-content').forEach(panel => {
            panel.classList.toggle('active', panel.id === (tab === 'all' ? 'allMarketsTab' : 'createMarketTab'));
        });
        if (tab === 'all') {
            loadAllMarketsFromTab();
        }
    }

    function switchView(view, sourceButton) {
        window.__pendingAdminView = view;
        closeMobileMenu();

        document.querySelectorAll('.menubar button').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeButton = sourceButton || document.querySelector(`.menubar button[data-view="${view}"]`);
        if (activeButton) activeButton.classList.add('active');

        document.querySelectorAll('.tabpanel').forEach(panel => {
            panel.classList.remove('active');
        });

        const panelMap = {
            dashboard: 'dashboardPanel',
            markets: 'marketsPanel',
            banners: 'bannersPanel',
            'voting-hero': 'votingHeroPanel',
            users: 'usersPanel',
            activity: 'activityPanel',
            transactions: 'transactionsPanel',
            messages: 'messagesPanel',
            voting: 'votingPanel',
            api: 'apiPanel'
        };
        const panelId = panelMap[view];
        const panel = panelId ? document.getElementById(panelId) : null;
        if (panel) panel.classList.add('active');

        const statusInfo = document.getElementById('status-info');
        if (statusInfo) {
            statusInfo.textContent = `Viewing: ${view.charAt(0).toUpperCase() + view.slice(1)}`;
        }

        if (window.adminPanel) {
            window.adminPanel.switchView(view);
        }

        if (view === 'banners' && typeof window.loadBannerList === 'function') {
            window.loadBannerList();
        }
        if (view === 'markets') {
            initMarketDescriptionEditor();
        }
    }

    function bindAdminUi() {
        const hamburger = document.getElementById('hamburger');
        const overlay = document.getElementById('mobileOverlay');
        const backToAppBtn = document.getElementById('backToAppBtn');
        const desktopModeBtn = document.getElementById('desktopModeBtn');
        const mobileModeBtn = document.getElementById('mobileModeBtn');
        const fitCover = document.getElementById('fit-cover');
        const fitContain = document.getElementById('fit-contain');
        const fitFill = document.getElementById('fit-fill');
        const fitNone = document.getElementById('fit-none');
        const imageScale = document.getElementById('imageScale');

        if (hamburger) hamburger.addEventListener('click', toggleMobileMenu);
        if (overlay) overlay.addEventListener('click', closeMobileMenu);
        if (backToAppBtn) backToAppBtn.addEventListener('click', () => window.location.href = 'index.html');
        if (desktopModeBtn) desktopModeBtn.addEventListener('click', () => switchPreviewMode('desktop'));
        if (mobileModeBtn) mobileModeBtn.addEventListener('click', () => switchPreviewMode('mobile'));
        if (fitCover) fitCover.addEventListener('click', () => setImageFit('cover'));
        if (fitContain) fitContain.addEventListener('click', () => setImageFit('contain'));
        if (fitFill) fitFill.addEventListener('click', () => setImageFit('fill'));
        if (fitNone) fitNone.addEventListener('click', () => setImageFit('none'));
        if (imageScale) imageScale.addEventListener('input', (e) => updateImageScale(e.target.value));

        document.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('[data-view]');
            if (viewBtn) {
                switchView(viewBtn.dataset.view, viewBtn.closest('button') || viewBtn);
                return;
            }

            const tabBtn = e.target.closest('[data-tab]');
            if (tabBtn && tabBtn.classList.contains('market-tab')) {
                switchMarketTab(tabBtn.dataset.tab);
                return;
            }

            const bannerItem = e.target.closest('.banner-list-item');
            if (bannerItem && !e.target.closest('.delete-banner-btn')) {
                const posX = parseFloat(bannerItem.dataset.posX);
                const posY = parseFloat(bannerItem.dataset.posY);
                const scale = parseFloat(bannerItem.dataset.scale);
                const posXMobile = parseFloat(bannerItem.dataset.posXMobile);
                const posYMobile = parseFloat(bannerItem.dataset.posYMobile);
                selectBanner(
                    bannerItem.dataset.bannerId,
                    bannerItem.dataset.bannerUrl,
                    Number.isFinite(posX) ? posX : 50,
                    Number.isFinite(posY) ? posY : 50,
                    bannerItem.dataset.fit || 'cover',
                    Number.isFinite(scale) ? scale : 100,
                    Number.isFinite(posXMobile) ? posXMobile : 50,
                    Number.isFinite(posYMobile) ? posYMobile : 50
                );
                return;
            }

            const posBtn = e.target.closest('[data-position]');
            if (posBtn && posBtn.classList.contains('banner-quick-btn')) {
                setBannerPosition(posBtn.dataset.position, posBtn);
                return;
            }

            const dirBtn = e.target.closest('[data-direction]');
            if (dirBtn && dirBtn.classList.contains('banner-quick-btn')) {
                adjustBannerPosition(dirBtn.dataset.direction);
                return;
            }

            if (e.target.closest('#checkSystemStatusBtn') && typeof window.checkSystemStatus === 'function') {
                window.checkSystemStatus();
                return;
            }

            if (e.target.closest('#cleanInvalidBannerUrlsBtn') && typeof window.cleanInvalidBannerUrls === 'function') {
                window.cleanInvalidBannerUrls();
            }
        });

        initMarketDescriptionEditor();
    }

    document.addEventListener('DOMContentLoaded', bindAdminUi);

    window.toggleMobileMenu = window.toggleMobileMenu || toggleMobileMenu;
    window.closeMobileMenu = window.closeMobileMenu || closeMobileMenu;
    window.switchView = window.switchView || switchView;
    window.switchMarketTab = window.switchMarketTab || switchMarketTab;
    window.loadAllMarketsFromTab = window.loadAllMarketsFromTab || loadAllMarketsFromTab;
    window.selectBanner = window.selectBanner || selectBanner;
    window.setBannerPosition = window.setBannerPosition || setBannerPosition;
    window.adjustBannerPosition = window.adjustBannerPosition || adjustBannerPosition;
    window.switchPreviewMode = window.switchPreviewMode || switchPreviewMode;
    window.setImageFit = window.setImageFit || setImageFit;
    window.updateImageScale = window.updateImageScale || updateImageScale;
    if (!window.checkSystemStatus) {
        window.checkSystemStatus = function () {
            const statusEl = document.getElementById('systemStatus');
            if (!statusEl) return;
            const status = {
                adminPanel: !!window.adminPanel,
                adminApi: !!(window.adminPanel && window.adminPanel.api),
                supabaseClient: !!window.supabaseClient
            };
            statusEl.innerHTML = `
                <div style="display:grid;grid-template-columns:160px 1fr;gap:8px;">
                    <div class="text-gray-500">adminPanel:</div>
                    <div style="color:${status.adminPanel ? 'var(--success)' : 'var(--error)'}">${status.adminPanel}</div>
                    <div class="text-gray-500">adminApi:</div>
                    <div style="color:${status.adminApi ? 'var(--success)' : 'var(--error)'}">${status.adminApi}</div>
                    <div class="text-gray-500">supabaseClient:</div>
                    <div style="color:${status.supabaseClient ? 'var(--success)' : 'var(--error)'}">${status.supabaseClient}</div>
                </div>
            `;
        };
    }

    window.addEventListener('adminPanelReady', () => {
        const pendingView = window.__pendingAdminView || 'dashboard';
        switchView(pendingView);
        if (pendingView === 'markets' && window.__pendingMarketTab === 'all') {
            loadAllMarketsFromTab();
        }
        if (pendingView === 'banners' && typeof window.loadBannerList === 'function') {
            window.loadBannerList();
        }
    });
})();
