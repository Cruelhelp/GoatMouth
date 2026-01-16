// Admin UI wiring for nav, tabs, and mobile menu.
// Keeps core interactions working even if inline scripts are blocked.

(function () {
    if (window.__adminUiBound) return;
    window.__adminUiBound = true;

    const bannerUiState = window.__bannerUiState || {
        currentImage: null,
        currentBannerId: null,
        posX: 50,
        posY: 50,
        posXMobile: 50,
        posYMobile: 50,
        fit: 'cover',
        scale: 100,
        previewMode: 'desktop'
    };
    window.__bannerUiState = bannerUiState;

    const bannerPreviewCacheKey = 'adminBannerPreviewCacheV1';

    function readBannerPreviewCache() {
        try {
            const raw = localStorage.getItem(bannerPreviewCacheKey);
            return raw ? JSON.parse(raw) : {};
        } catch (error) {
            return {};
        }
    }

    function writeBannerPreviewCache(cache) {
        try {
            localStorage.setItem(bannerPreviewCacheKey, JSON.stringify(cache));
        } catch (error) {
            console.warn('Failed to cache banner preview state', error);
        }
    }

    function getCachedBannerState(bannerId) {
        if (!bannerId) return null;
        const cache = readBannerPreviewCache();
        return cache[bannerId] || null;
    }

    function persistBannerPreview() {
        if (!bannerUiState.currentBannerId) return;
        if (!isValidBannerUrl(bannerUiState.currentImage)) return;
        const cache = readBannerPreviewCache();
        cache[bannerUiState.currentBannerId] = {
            imageUrl: bannerUiState.currentImage,
            posX: bannerUiState.posX,
            posY: bannerUiState.posY,
            posXMobile: bannerUiState.posXMobile,
            posYMobile: bannerUiState.posYMobile,
            fit: bannerUiState.fit,
            scale: bannerUiState.scale,
            updatedAt: Date.now()
        };
        writeBannerPreviewCache(cache);
    }

    function getBannerBackgroundSize(fit, scale, isMobile) {
        if (fit === 'fill') {
            return '100% 100%';
        }
        if (fit === 'none') {
            const safeScale = Number.isFinite(scale) ? scale : 100;
            return `${safeScale}% auto`;
        }
        if (isMobile && fit === 'cover') {
            return '100% 100%';
        }
        return fit || 'cover';
    }

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

    function updateBannerPreviewSynced() {
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

        const isMobile = bannerUiState.previewMode === 'mobile';
        const currentPosX = isMobile ? bannerUiState.posXMobile : bannerUiState.posX;
        const currentPosY = isMobile ? bannerUiState.posYMobile : bannerUiState.posY;
        const backgroundSize = getBannerBackgroundSize(bannerUiState.fit, bannerUiState.scale, isMobile);

        preview.innerHTML = `
            <div class="absolute inset-0" style="background-image: url('${bannerUiState.currentImage}'); background-size: ${backgroundSize}; background-position: ${currentPosX}% ${currentPosY}%; background-repeat: no-repeat;"></div>
            <div class="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent opacity-60"></div>
            <div class="banner-position-overlay">
                <div class="banner-position-indicator">
                    ${Math.round(currentPosX)}% x ${Math.round(currentPosY)}%${bannerUiState.fit === 'none' ? ` - scale ${bannerUiState.scale}%` : ''}
                </div>
            </div>
        `;

        const posXDisplay = document.getElementById('posXDisplay');
        const posYDisplay = document.getElementById('posYDisplay');
        if (posXDisplay) posXDisplay.textContent = `${Math.round(currentPosX)}%`;
        if (posYDisplay) posYDisplay.textContent = `${Math.round(currentPosY)}%`;
    }

    updateBannerPreview = updateBannerPreviewSynced;

    function selectBanner(id, imageUrl, posX, posY, fit, scale, posXMobile, posYMobile) {
        bannerUiState.currentBannerId = id;
        const cached = getCachedBannerState(id);
        const selectedImage = isValidBannerUrl(imageUrl) ? imageUrl : null;
        const cachedImage = cached && isValidBannerUrl(cached.imageUrl) ? cached.imageUrl : null;
        bannerUiState.currentImage = cachedImage || selectedImage;
        bannerUiState.posX = Number.isFinite(cached?.posX) ? cached.posX : (Number.isFinite(posX) ? posX : 50);
        bannerUiState.posY = Number.isFinite(cached?.posY) ? cached.posY : (Number.isFinite(posY) ? posY : 50);
        bannerUiState.posXMobile = Number.isFinite(cached?.posXMobile) ? cached.posXMobile : (Number.isFinite(posXMobile) ? posXMobile : 50);
        bannerUiState.posYMobile = Number.isFinite(cached?.posYMobile) ? cached.posYMobile : (Number.isFinite(posYMobile) ? posYMobile : 50);
        bannerUiState.fit = cached?.fit || fit || 'cover';
        bannerUiState.scale = Number.isFinite(cached?.scale) ? cached.scale : (Number.isFinite(scale) ? scale : 100);

        localStorage.setItem('lastSelectedBannerId', id);
        updateBannerPreview();
        persistBannerPreview();

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
        persistBannerPreview();
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
        persistBannerPreview();
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
        persistBannerPreview();
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
        persistBannerPreview();
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
            window.__marketDescriptionEditor = editor;

            editor.on('text-change', () => {
                if (hiddenInput) {
                    hiddenInput.value = editor.root.innerHTML;
                }
                updateMarketPreview();
            });

            if (hiddenInput) {
                hiddenInput.value = editor.root.innerHTML;
            }
        } else {
            editorEl.setAttribute('contenteditable', 'true');
        }

        editorEl.dataset.quillReady = 'true';
    }

    function formatJmd(amount) {
        if (!Number.isFinite(amount)) return '--';
        const rounded = Math.max(0, Math.round(amount));
        return `J$${rounded.toLocaleString('en-US')}`;
    }

    function formatOdds(probability) {
        if (!Number.isFinite(probability) || probability <= 0) return '--';
        return `${(1 / probability).toFixed(2)}x`;
    }

    function getGuidanceYesRate(guidance) {
        if (!guidance) return 0.5;
        const raw =
            guidance.yesRate ??
            guidance.yes_rate ??
            guidance.yes_probability ??
            guidance.global_prior ??
            guidance.prior_yes ??
            0.5;
        const value = Number(raw);
        if (!Number.isFinite(value)) return 0.5;
        return Math.min(0.95, Math.max(0.05, value));
    }

    function getConfidenceLabel(sampleSize) {
        if (!Number.isFinite(sampleSize) || sampleSize <= 0) return 'low';
        if (sampleSize >= 50) return 'high';
        if (sampleSize >= 20) return 'medium';
        return 'low';
    }

    function computeSuggestedLiquidity(guidance) {
        const sampleSize = Number.isFinite(guidance?.sampleSize) ? guidance.sampleSize : 0;
        const source = guidance?.source || '';
        let base = 500;
        if (sampleSize >= 50) base = 2000;
        else if (sampleSize >= 20) base = 1500;
        else if (sampleSize >= 5) base = 1000;
        if (source.toLowerCase().includes('manual')) {
            base = Math.max(base, 2000);
        }
        return base;
    }

    function updateLiquidityGuidanceState({ suggestion, note, enabled }) {
        const container = document.getElementById('liquidity-guidance');
        const suggestionEl = document.getElementById('liquidity-suggestion');
        const noteEl = document.getElementById('liquidity-suggestion-note');
        const useBtn = document.getElementById('useLiquiditySuggestionBtn');

        if (!container || !suggestionEl || !noteEl || !useBtn) return;

        container.classList.remove('hidden');

        suggestionEl.textContent = suggestion || '--';
        noteEl.textContent = note || 'Select a category to get a suggestion.';
        useBtn.disabled = !enabled || suggestion === '--';
        useBtn.classList.toggle('opacity-60', useBtn.disabled);
        useBtn.classList.toggle('cursor-not-allowed', useBtn.disabled);
    }

    let lastGuidance = null;

    function parseOpeningOddsValue(value) {
        const parsed = Number.parseFloat(value);
        if (!Number.isFinite(parsed) || parsed <= 1) return null;
        return parsed;
    }

    function getOpeningOddsInputs() {
        const yesInput = document.getElementById('openingOddsYes');
        const noInput = document.getElementById('openingOddsNo');
        return {
            yes: parseOpeningOddsValue(yesInput?.value),
            no: parseOpeningOddsValue(noInput?.value)
        };
    }

    function updateMarketOddsSuggestion(guidance) {
        const sourceEl = document.getElementById('market-odds-source');
        const yesEl = document.getElementById('market-odds-yes');
        const noEl = document.getElementById('market-odds-no');
        const analysisEl = document.getElementById('market-odds-analysis');
        const previewYesEl = document.getElementById('previewSuggestedOddsYes');
        const previewNoEl = document.getElementById('previewSuggestedOddsNo');
        const useBtn = document.getElementById('useSuggestedOddsBtn');

        if (!sourceEl && !yesEl && !noEl && !analysisEl && !previewYesEl && !previewNoEl) return;

        const yesRate = getGuidanceYesRate(guidance);
        const noRate = Math.max(0.05, Math.min(0.95, 1 - yesRate));
        const yesOdds = formatOdds(yesRate);
        const noOdds = formatOdds(noRate);
        const yesOddsValue = yesRate > 0 ? (1 / yesRate) : null;
        const noOddsValue = noRate > 0 ? (1 / noRate) : null;

        const sampleSize = Number.isFinite(guidance?.sampleSize) ? guidance.sampleSize : null;
        const confidence = getConfidenceLabel(sampleSize);
        const source = guidance?.source || 'default';
        const sourceLine = guidance
            ? `Based on ${source} (${confidence} confidence).`
            : 'Default 50/50 (no guidance yet).';
        const analysisLine = guidance
            ? `This is a starting point using ${sampleSize || 0} signals. Adjust if you expect a skewed outcome.`
            : 'Add a category to pull guidance from recent market signals.';

        if (sourceEl) sourceEl.textContent = sourceLine;
        if (yesEl) yesEl.textContent = yesOdds;
        if (noEl) noEl.textContent = noOdds;
        if (analysisEl) analysisEl.textContent = analysisLine;
        if (previewYesEl) previewYesEl.textContent = yesOdds;
        if (previewNoEl) previewNoEl.textContent = noOdds;

        if (useBtn) {
            const canUse = !!(guidance && yesOddsValue && noOddsValue);
            useBtn.disabled = !canUse;
            useBtn.classList.toggle('opacity-60', !canUse);
            useBtn.classList.toggle('cursor-not-allowed', !canUse);

            if (!useBtn.dataset.boundSuggestedOdds) {
                useBtn.dataset.boundSuggestedOdds = 'true';
                useBtn.addEventListener('click', () => {
                    if (!yesOddsValue || !noOddsValue) return;
                    const yesInput = document.getElementById('openingOddsYes');
                    const noInput = document.getElementById('openingOddsNo');
                    if (yesInput) {
                        yesInput.value = yesOddsValue.toFixed(2);
                        yesInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    if (noInput) {
                        noInput.value = noOddsValue.toFixed(2);
                        noInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    updateMarketPreview();
                });
            }
        }
    }

    function updateMarketPreview() {
        const titleInput = document.getElementById('marketTitle');
        const previewTitle = document.getElementById('previewTitle');
        if (previewTitle) {
            previewTitle.textContent = titleInput?.value?.trim() || 'Market Title';
        }

        const categorySelect = document.getElementById('marketCategory');
        const previewCategory = document.getElementById('previewCategory');
        if (previewCategory) {
            const value = categorySelect?.value?.trim() || 'Category';
            previewCategory.textContent = value.toUpperCase();
        }

        const previewDesc = document.getElementById('previewDescription');
        const editor = window.__marketDescriptionEditor;
        if (previewDesc && editor && typeof editor.getText === 'function') {
            const text = editor.getText().trim();
            if (text) {
                previewDesc.innerHTML = editor.root.innerHTML;
            } else {
                previewDesc.textContent = 'Market description will appear here...';
            }
        } else if (previewDesc) {
            previewDesc.textContent = 'Market description will appear here...';
        }

        const optionInputs = document.querySelectorAll('.market-option-input');
        const previewOptions = document.getElementById('previewOptions');
        if (previewOptions) {
            const rawOptions = Array.from(optionInputs)
                .map((input) => input.value.trim())
                .filter(Boolean);
            const options = rawOptions.length ? rawOptions : ['YES', 'NO'];
            const { yes: openingYes, no: openingNo } = getOpeningOddsInputs();
            const useOpeningOdds = options.length === 2 && openingYes && openingNo;
            const evenOdds = (100 / options.length).toFixed(0);
            const oddsLabels = useOpeningOdds
                ? [`${openingYes.toFixed(2)}x`, `${openingNo.toFixed(2)}x`]
                : options.map(() => `${evenOdds}%`);

            previewOptions.innerHTML = options
                .map(
                    (option, index) => `
                        <div class="preview-option">
                            <div class="preview-option-label">${option}</div>
                            <div class="preview-option-odds">${oddsLabels[index] || `${evenOdds}%`}</div>
                        </div>
                    `
                )
                .join('');
        }

        updateMarketOddsSuggestion(lastGuidance);
    }

    async function refreshLiquidityGuidance(category) {
        if (!category) {
            updateLiquidityGuidanceState({ suggestion: '--', note: 'Select a category to get a suggestion.', enabled: false });
            lastGuidance = null;
            updateMarketOddsSuggestion(null);
            return;
        }

        updateLiquidityGuidanceState({ suggestion: '--', note: 'Loading suggestion...', enabled: true });

        try {
            const guidance = await window.adminPanel?.getGuidanceForCategory?.(category);
            lastGuidance = guidance;
            if (!guidance || guidance.enabled === false) {
                updateLiquidityGuidanceState({ suggestion: '--', note: 'Odds guidance is disabled in settings.', enabled: true });
                updateMarketOddsSuggestion(null);
                return;
            }

            const suggestionValue = computeSuggestedLiquidity(guidance);
            const confidence = getConfidenceLabel(guidance.sampleSize);
            const source = guidance.source || 'guidance';
            const note = `Based on ${source} (${confidence} confidence).`;

            updateLiquidityGuidanceState({
                suggestion: `${formatJmd(suggestionValue)} suggested`,
                note,
                enabled: true
            });

            const useBtn = document.getElementById('useLiquiditySuggestionBtn');
            if (useBtn && !useBtn.dataset.boundLiquiditySuggestion) {
                useBtn.dataset.boundLiquiditySuggestion = 'true';
                useBtn.addEventListener('click', () => {
                    const liquidityInput = document.getElementById('marketLiquidity');
                    if (liquidityInput) {
                        liquidityInput.value = suggestionValue;
                        liquidityInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });
            }
            updateMarketOddsSuggestion(guidance);
        } catch (error) {
            updateLiquidityGuidanceState({ suggestion: '--', note: 'Unable to load odds guidance.', enabled: true });
            updateMarketOddsSuggestion(null);
        }
    }

    function bindMarketPreview() {
        if (window.__marketPreviewBound) {
            updateMarketPreview();
            return;
        }
        window.__marketPreviewBound = true;

        document.addEventListener('input', (event) => {
            if (event.target?.matches?.('#marketTitle, .market-option-input, #openingOddsYes, #openingOddsNo')) {
                updateMarketPreview();
            }
        });

        document.addEventListener('change', (event) => {
            if (event.target?.matches?.('#marketCategory')) {
                updateMarketPreview();
            }
        });

        updateMarketPreview();
    }

    function bindLiquidityGuidance() {
        const categorySelect = document.getElementById('marketCategory');
        if (!categorySelect) return;
        if (!categorySelect.dataset.boundLiquidityGuidance) {
            categorySelect.dataset.boundLiquidityGuidance = 'true';
            categorySelect.addEventListener('change', () => {
                refreshLiquidityGuidance(categorySelect.value);
            });
        }
        refreshLiquidityGuidance(categorySelect.value);
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
            bindLiquidityGuidance();
            bindMarketPreview();
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
        bindLiquidityGuidance();
        bindMarketPreview();
    }

    document.addEventListener('DOMContentLoaded', bindAdminUi);

    window.toggleMobileMenu = window.toggleMobileMenu || toggleMobileMenu;
    window.closeMobileMenu = window.closeMobileMenu || closeMobileMenu;
    window.switchView = window.switchView || switchView;
    window.switchMarketTab = window.switchMarketTab || switchMarketTab;
    window.loadAllMarketsFromTab = window.loadAllMarketsFromTab || loadAllMarketsFromTab;
    window.updatePreview = window.updatePreview || updateMarketPreview;
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
