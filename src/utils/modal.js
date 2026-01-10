/**
 * Modal Utilities Module
 * Consolidates all modal creation and management functions
 * Used across: app.js, shared-components.js, voting.js, market-detail.js
 */

/**
 * Create a modal overlay element
 * @param {Object} options - Modal options
 * @param {string} options.id - Modal ID (optional)
 * @param {number} options.zIndex - z-index value (default: 9999)
 * @param {boolean} options.blur - Enable backdrop blur (default: true)
 * @param {string} options.backgroundColor - Background color (default: 'rgba(0, 0, 0, 0.75)')
 * @returns {HTMLElement} Modal overlay element
 */
export function createModalOverlay(options = {}) {
    const {
        id = null,
        zIndex = 9999,
        blur = true,
        backgroundColor = 'rgba(0, 0, 0, 0.75)'
    } = options;

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0';

    if (id) {
        overlay.id = id;
    }

    overlay.style.zIndex = zIndex;
    overlay.style.backgroundColor = backgroundColor;
    overlay.style.overflow = 'hidden';
    overlay.style.touchAction = 'none';

    if (blur) {
        overlay.style.backdropFilter = 'blur(12px)';
    }

    return overlay;
}

/**
 * Create a centered modal container
 * @param {Object} options - Container options
 * @param {string} options.maxWidth - Max width (default: '580px')
 * @param {string} options.maxHeight - Max height (default: '90vh')
 * @param {string} options.background - Background style
 * @returns {HTMLElement} Modal container element
 */
export function createModalContainer(options = {}) {
    const {
        maxWidth = '580px',
        maxHeight = '90vh',
        background = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
    } = options;

    const wrapper = document.createElement('div');
    wrapper.className = 'min-h-screen flex items-center justify-center px-4 py-4';
    wrapper.style.touchAction = 'pan-y';

    const container = document.createElement('div');
    container.className = 'relative rounded-2xl w-full shadow-2xl';
    container.style.maxWidth = maxWidth;
    container.style.maxHeight = maxHeight;
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.background = background;

    wrapper.appendChild(container);

    return { wrapper, container };
}

/**
 * Add close button to modal
 * @param {HTMLElement} container - Modal container
 * @param {Function} onClose - Close callback
 * @returns {HTMLElement} Close button element
 */
export function addModalCloseButton(container, onClose) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700';
    closeBtn.title = 'Close';
    closeBtn.style.zIndex = '10';
    closeBtn.innerHTML = `
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
    `;

    closeBtn.addEventListener('click', onClose);

    container.appendChild(closeBtn);

    return closeBtn;
}

/**
 * Open a modal
 * @param {HTMLElement} modal - Modal element
 * @param {Object} options - Options
 * @param {boolean} options.lockScroll - Lock body scroll (default: true)
 * @param {boolean} options.animate - Animate opening (default: true)
 * @param {Function} options.onOpen - Callback after opening
 */
export function openModal(modal, options = {}) {
    const {
        lockScroll = true,
        animate = true,
        onOpen = null
    } = options;

    if (!modal) {
        console.error('Modal element not provided');
        return;
    }

    // Lock body scroll
    if (lockScroll) {
        document.body.style.overflow = 'hidden';
    }

    // Append to body
    document.body.appendChild(modal);

    // Animate if requested
    if (animate) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.transition = 'opacity 0.3s ease-in-out';
            modal.style.opacity = '1';
        }, 10);
    }

    // Call onOpen callback
    if (onOpen && typeof onOpen === 'function') {
        setTimeout(onOpen, animate ? 300 : 0);
    }
}

/**
 * Close a modal
 * @param {HTMLElement} modal - Modal element
 * @param {Object} options - Options
 * @param {boolean} options.unlockScroll - Unlock body scroll (default: true)
 * @param {boolean} options.animate - Animate closing (default: true)
 * @param {Function} options.onClose - Callback after closing
 */
export function closeModal(modal, options = {}) {
    const {
        unlockScroll = true,
        animate = true,
        onClose = null
    } = options;

    if (!modal) {
        console.error('Modal element not provided');
        return;
    }

    // Animate if requested
    if (animate) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();

            // Unlock body scroll
            if (unlockScroll) {
                document.body.style.overflow = '';
            }

            // Call onClose callback
            if (onClose && typeof onClose === 'function') {
                onClose();
            }
        }, 300);
    } else {
        modal.remove();

        // Unlock body scroll
        if (unlockScroll) {
            document.body.style.overflow = '';
        }

        // Call onClose callback
        if (onClose && typeof onClose === 'function') {
            onClose();
        }
    }
}

/**
 * Close modal by ID
 * @param {string} modalId - Modal element ID
 * @param {Object} options - Options (same as closeModal)
 */
export function closeModalById(modalId, options = {}) {
    const modal = document.getElementById(modalId);
    if (modal) {
        closeModal(modal, options);
    } else {
        console.warn(`Modal with ID "${modalId}" not found`);
    }
}

/**
 * Toggle modal visibility
 * @param {HTMLElement} modal - Modal element
 * @param {Object} options - Options (same as openModal/closeModal)
 */
export function toggleModal(modal, options = {}) {
    if (!modal) {
        console.error('Modal element not provided');
        return;
    }

    if (modal.parentElement) {
        closeModal(modal, options);
    } else {
        openModal(modal, options);
    }
}

/**
 * Add overlay click to close functionality
 * @param {HTMLElement} overlay - Overlay element
 * @param {HTMLElement} container - Modal container element
 * @param {Function} onClose - Close callback
 */
export function addOverlayClickClose(overlay, container, onClose) {
    overlay.addEventListener('click', (e) => {
        // Only close if clicking on overlay, not on container
        if (e.target === overlay || e.target.contains(container)) {
            if (e.target !== container && !container.contains(e.target)) {
                onClose();
            }
        }
    });
}

/**
 * Add escape key to close functionality
 * @param {Function} onClose - Close callback
 * @returns {Function} Cleanup function to remove listener
 */
export function addEscapeKeyClose(onClose) {
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    document.addEventListener('keydown', handleEscape);

    // Return cleanup function
    return () => {
        document.removeEventListener('keydown', handleEscape);
    };
}

/**
 * Create a simple alert modal
 * @param {Object} options - Alert options
 * @param {string} options.title - Alert title
 * @param {string} options.message - Alert message
 * @param {string} options.confirmText - Confirm button text (default: 'OK')
 * @param {Function} options.onConfirm - Confirm callback
 * @returns {HTMLElement} Alert modal element
 */
export function createAlertModal(options = {}) {
    const {
        title = 'Alert',
        message = '',
        confirmText = 'OK',
        onConfirm = null
    } = options;

    const overlay = createModalOverlay({ id: 'alert-modal' });
    const { wrapper, container } = createModalContainer({ maxWidth: '400px' });

    container.innerHTML = `
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4 text-white">${title}</h3>
            <p class="text-gray-300 mb-6">${message}</p>
            <button id="alert-confirm-btn" class="w-full px-6 py-3 rounded-lg font-bold text-white transition-all duration-200 shadow-lg hover:shadow-xl" style="background: linear-gradient(135deg, #00CB97 0%, #00a878 100%);">
                ${confirmText}
            </button>
        </div>
    `;

    overlay.appendChild(wrapper);

    // Add event listeners
    const confirmBtn = container.querySelector('#alert-confirm-btn');
    const handleClose = () => {
        closeModal(overlay);
        if (onConfirm && typeof onConfirm === 'function') {
            onConfirm();
        }
    };

    confirmBtn.addEventListener('click', handleClose);
    addModalCloseButton(container, handleClose);
    addEscapeKeyClose(handleClose);

    return overlay;
}

/**
 * Create a confirm modal
 * @param {Object} options - Confirm options
 * @param {string} options.title - Confirm title
 * @param {string} options.message - Confirm message
 * @param {string} options.confirmText - Confirm button text (default: 'Confirm')
 * @param {string} options.cancelText - Cancel button text (default: 'Cancel')
 * @param {Function} options.onConfirm - Confirm callback
 * @param {Function} options.onCancel - Cancel callback
 * @returns {HTMLElement} Confirm modal element
 */
export function createConfirmModal(options = {}) {
    const {
        title = 'Confirm',
        message = '',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        onConfirm = null,
        onCancel = null
    } = options;

    const overlay = createModalOverlay({ id: 'confirm-modal' });
    const { wrapper, container } = createModalContainer({ maxWidth: '400px' });

    container.innerHTML = `
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4 text-white">${title}</h3>
            <p class="text-gray-300 mb-6">${message}</p>
            <div class="flex gap-3">
                <button id="confirm-cancel-btn" class="flex-1 px-6 py-3 rounded-lg font-bold text-white transition-all duration-200 bg-gray-700 hover:bg-gray-600">
                    ${cancelText}
                </button>
                <button id="confirm-ok-btn" class="flex-1 px-6 py-3 rounded-lg font-bold text-white transition-all duration-200 shadow-lg hover:shadow-xl" style="background: linear-gradient(135deg, #00CB97 0%, #00a878 100%);">
                    ${confirmText}
                </button>
            </div>
        </div>
    `;

    overlay.appendChild(wrapper);

    // Add event listeners
    const confirmBtn = container.querySelector('#confirm-ok-btn');
    const cancelBtn = container.querySelector('#confirm-cancel-btn');

    const handleConfirm = () => {
        closeModal(overlay);
        if (onConfirm && typeof onConfirm === 'function') {
            onConfirm();
        }
    };

    const handleCancel = () => {
        closeModal(overlay);
        if (onCancel && typeof onCancel === 'function') {
            onCancel();
        }
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    addModalCloseButton(container, handleCancel);
    addEscapeKeyClose(handleCancel);

    return overlay;
}

/**
 * Show an alert modal
 * @param {string|Object} options - Alert message or options object
 */
export function showAlert(options) {
    const alertOptions = typeof options === 'string' ? { message: options } : options;
    const modal = createAlertModal(alertOptions);
    openModal(modal);
}

/**
 * Show a confirm modal
 * @param {string|Object} options - Confirm message or options object
 * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled
 */
export function showConfirm(options) {
    return new Promise((resolve) => {
        const confirmOptions = typeof options === 'string'
            ? { message: options }
            : options;

        confirmOptions.onConfirm = () => resolve(true);
        confirmOptions.onCancel = () => resolve(false);

        const modal = createConfirmModal(confirmOptions);
        openModal(modal);
    });
}

/**
 * Open updates modal (shared component)
 */
export function openUpdatesModal() {
    const modal = document.getElementById('updatesModal');
    const overlay = document.getElementById('updatesModalOverlay');

    if (modal && overlay) {
        overlay.classList.add('active');
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);

        document.body.style.overflow = 'hidden';
    }
}

/**
 * Close updates modal (shared component)
 */
export function closeUpdatesModal() {
    const modal = document.getElementById('updatesModal');
    const overlay = document.getElementById('updatesModalOverlay');

    if (modal && overlay) {
        modal.classList.remove('active');
        setTimeout(() => {
            overlay.classList.remove('active');
        }, 300);

        document.body.style.overflow = '';
    }
}

// Default export with all functions
export default {
    createModalOverlay,
    createModalContainer,
    addModalCloseButton,
    openModal,
    closeModal,
    closeModalById,
    toggleModal,
    addOverlayClickClose,
    addEscapeKeyClose,
    createAlertModal,
    createConfirmModal,
    showAlert,
    showConfirm,
    openUpdatesModal,
    closeUpdatesModal
};
