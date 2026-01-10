// Custom Toast Notification System
class Toast {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
            this.container = container;
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    show(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} toast-enter`;

        const icons = {
            success: '<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            error: '<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            warning: '<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
            info: '<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
        };

        toast.innerHTML = `
            <div class="toast-content">
                ${icons[type] || icons.info}
                <span class="toast-message">${message}</span>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        `;

        this.container.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('toast-show'), 10);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => this.remove(toast), duration);
        }

        return toast;
    }

    remove(toast) {
        toast.classList.remove('toast-show');
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }

    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }

    // Confirmation dialog
    confirm(message, options = {}) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'toast-modal-overlay';
            modal.innerHTML = `
                <div class="toast-modal toast-enter">
                    <div class="toast-modal-header">
                        <svg class="toast-modal-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <h3 class="toast-modal-title">${options.title || 'Confirm'}</h3>
                    </div>
                    <p class="toast-modal-message">${message}</p>
                    <div class="toast-modal-actions">
                        <button class="toast-modal-btn toast-modal-btn-cancel">${options.cancelText || 'Cancel'}</button>
                        <button class="toast-modal-btn toast-modal-btn-confirm">${options.confirmText || 'Confirm'}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            setTimeout(() => modal.querySelector('.toast-modal').classList.add('toast-show'), 10);

            const cleanup = (result) => {
                modal.querySelector('.toast-modal').classList.remove('toast-show');
                modal.querySelector('.toast-modal').classList.add('toast-exit');
                setTimeout(() => {
                    modal.remove();
                    resolve(result);
                }, 300);
            };

            modal.querySelector('.toast-modal-btn-cancel').onclick = () => cleanup(false);
            modal.querySelector('.toast-modal-btn-confirm').onclick = () => cleanup(true);
            modal.onclick = (e) => {
                if (e.target === modal) cleanup(false);
            };
        });
    }

    // Prompt dialog
    prompt(message, options = {}) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'toast-modal-overlay';
            modal.innerHTML = `
                <div class="toast-modal toast-enter">
                    <div class="toast-modal-header">
                        <svg class="toast-modal-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                        <h3 class="toast-modal-title">${options.title || 'Input Required'}</h3>
                    </div>
                    <p class="toast-modal-message">${message}</p>
                    <input type="text" class="toast-modal-input" placeholder="${options.placeholder || ''}" value="${options.defaultValue || ''}">
                    <div class="toast-modal-actions">
                        <button class="toast-modal-btn toast-modal-btn-cancel">${options.cancelText || 'Cancel'}</button>
                        <button class="toast-modal-btn toast-modal-btn-confirm">${options.confirmText || 'OK'}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            setTimeout(() => modal.querySelector('.toast-modal').classList.add('toast-show'), 10);

            const input = modal.querySelector('.toast-modal-input');
            input.focus();

            const cleanup = (result) => {
                modal.querySelector('.toast-modal').classList.remove('toast-show');
                modal.querySelector('.toast-modal').classList.add('toast-exit');
                setTimeout(() => {
                    modal.remove();
                    resolve(result);
                }, 300);
            };

            modal.querySelector('.toast-modal-btn-cancel').onclick = () => cleanup(null);
            modal.querySelector('.toast-modal-btn-confirm').onclick = () => cleanup(input.value);
            input.onkeypress = (e) => {
                if (e.key === 'Enter') cleanup(input.value);
            };
            modal.onclick = (e) => {
                if (e.target === modal) cleanup(null);
            };
        });
    }
}

// Initialize global toast instance
window.toast = new Toast();

// Override default alert, confirm, prompt
window.alert = (message) => window.toast.info(message);
window.confirm = (message) => window.toast.confirm(message);
window.prompt = (message, defaultValue) => window.toast.prompt(message, { defaultValue });
