// Contact Form Handler
class ContactFormHandler {
    constructor() {
        this.api = new GoatMouthAPI(window.supabaseClient);
        this.form = document.getElementById('contact-form');
        this.submitBtn = document.getElementById('submit-btn');
        this.errorMessage = document.getElementById('error-message');
        this.successMessage = document.getElementById('success-message');

        this.init();
    }

    init() {
        this.setupFormHandlers();
        this.prefillUserData();
    }

    async prefillUserData() {
        try {
            const user = await this.api.getCurrentUser();
            if (user) {
                const profile = await this.api.getProfile(user.id);

                // Prefill name and email if user is logged in
                if (profile) {
                    document.getElementById('name').value = profile.username || '';
                }
                if (user.email) {
                    document.getElementById('email').value = user.email;
                }
            }
        } catch (error) {
            console.log('User not logged in, form will be empty');
        }
    }

    setupFormHandlers() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Real-time validation
        const messageField = document.getElementById('message');
        messageField.addEventListener('input', () => {
            if (messageField.value.length < 10 && messageField.value.length > 0) {
                messageField.style.borderColor = '#ef4444';
            } else {
                messageField.style.borderColor = '';
            }
        });
    }

    async handleSubmit(e) {
        e.preventDefault();

        const formData = new FormData(this.form);
        const messageData = {
            name: formData.get('name').trim(),
            email: formData.get('email').trim(),
            subject: formData.get('subject'),
            message: formData.get('message').trim(),
            priority: formData.get('priority')
        };

        // Validation
        if (!this.validateForm(messageData)) {
            return;
        }

        // Disable submit button
        this.submitBtn.disabled = true;
        this.submitBtn.textContent = 'Sending...';
        this.hideError();

        try {
            // Submit message
            await this.api.createContactMessage(messageData);

            // Show success
            this.showSuccess();
            this.form.reset();

            // Scroll to success message
            this.successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Re-enable button
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = 'Send Message';

        } catch (error) {
            console.error('Error submitting contact form:', error);
            this.showError(error.message || 'Failed to send message. Please try again.');

            // Re-enable button
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = 'Send Message';
        }
    }

    validateForm(data) {
        // Name validation
        if (data.name.length < 2) {
            this.showError('Please enter your name (at least 2 characters)');
            return false;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            this.showError('Please enter a valid email address');
            return false;
        }

        // Subject validation
        if (!data.subject) {
            this.showError('Please select a subject');
            return false;
        }

        // Message validation
        if (data.message.length < 10) {
            this.showError('Please enter a message (at least 10 characters)');
            return false;
        }

        if (data.message.length > 5000) {
            this.showError('Message is too long (maximum 5000 characters)');
            return false;
        }

        return true;
    }

    showError(message) {
        this.errorMessage.querySelector('p').textContent = message;
        this.errorMessage.classList.remove('hidden');
        this.errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    hideError() {
        this.errorMessage.classList.add('hidden');
    }

    showSuccess() {
        this.successMessage.classList.remove('hidden');
        this.hideError();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ContactFormHandler();
    });
} else {
    new ContactFormHandler();
}
