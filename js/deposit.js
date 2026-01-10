// Deposit Page Management System
class DepositManager {
    constructor() {
        this.api = null;
        this.currentUser = null;
        this.currentProfile = null;
        this.selectedAmount = 0;
        this.selectedMethod = 'card';
        this.init();
    }

    async init() {
        // Wait for Supabase client
        if (!window.supabaseClient) {
            console.error('Supabase client not initialized');
            return;
        }

        this.api = new GoatMouthAPI(window.supabaseClient);

        // Check authentication
        await this.checkAuth();

        // Load user balance
        await this.loadBalance();

        // Set up event listeners
        this.attachEventListeners();

        // Load transaction history
        await this.loadTransactions();
    }

    async checkAuth() {
        try {
            this.currentUser = await this.api.getCurrentUser();

            if (!this.currentUser) {
                // Redirect to home if not authenticated
                window.location.href = 'index.html';
                return;
            }

            this.currentProfile = await this.api.getProfile(this.currentUser.id);

            // Update header UI
            updateHeaderUI(this.currentUser, this.currentProfile);
        } catch (error) {
            console.error('Auth check error:', error);
            window.location.href = 'index.html';
        }
    }

    async loadBalance() {
        const spinner = document.getElementById('currentBalanceSpinner');
        const balanceText = document.getElementById('currentBalanceText');

        if (!this.currentProfile) {
            // Show spinner while loading
            if (spinner) spinner.style.display = 'inline-block';
            if (balanceText) balanceText.style.display = 'none';
            return;
        }

        // Balance loaded - hide spinner and show amount
        const balance = this.currentProfile.balance || 0;
        if (spinner) spinner.style.display = 'none';
        if (balanceText) {
            balanceText.textContent = `J$${balance.toFixed(2)}`;
            balanceText.style.display = 'inline';
        }
    }

    attachEventListeners() {
        // Tab switching
        document.querySelectorAll('.deposit-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab || e.target.closest('.deposit-tab').dataset.tab);
            });
        });

        // Quick amount buttons
        document.querySelectorAll('.quick-amount-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const amount = parseFloat(e.target.dataset.amount);
                this.selectQuickAmount(amount);
            });
        });

        // Custom amount input
        const amountInput = document.getElementById('depositAmount');
        if (amountInput) {
            amountInput.addEventListener('input', (e) => {
                this.updateAmount(parseFloat(e.target.value) || 0);
            });
        }

        // Payment method selection
        document.querySelectorAll('.payment-method').forEach(method => {
            method.addEventListener('click', (e) => {
                const methodEl = e.target.closest('.payment-method');
                this.selectPaymentMethod(methodEl.dataset.method);
            });
        });

        // Proceed to payment button
        const proceedBtn = document.getElementById('proceedDepositBtn');
        if (proceedBtn) {
            proceedBtn.addEventListener('click', () => this.proceedToPayment());
        }

        // Add payment method button
        const addMethodBtn = document.getElementById('addPaymentMethodBtn');
        if (addMethodBtn) {
            addMethodBtn.addEventListener('click', () => this.addPaymentMethod());
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.deposit-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) activeTab.classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.getElementById(`${tabName}-tab`);
        if (activeContent) activeContent.classList.add('active');
    }

    selectQuickAmount(amount) {
        // Update active state
        document.querySelectorAll('.quick-amount-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseFloat(btn.dataset.amount) === amount) {
                btn.classList.add('active');
            }
        });

        // Update input field
        document.getElementById('depositAmount').value = amount;

        // Update selected amount
        this.updateAmount(amount);
    }

    updateAmount(amount) {
        this.selectedAmount = amount;

        // Calculate fee (example: 2.5% for card, 0% for bank transfer)
        let fee = 0;
        if (this.selectedMethod === 'card') {
            fee = amount * 0.025;
        } else if (this.selectedMethod === 'mobile') {
            fee = amount * 0.015;
        }

        const total = amount + fee;

        // Update summary
        document.getElementById('summaryAmount').textContent = `J$${amount.toFixed(2)}`;
        document.getElementById('summaryFee').textContent = `J$${fee.toFixed(2)}`;
        document.getElementById('summaryTotal').textContent = `J$${total.toFixed(2)}`;

        // Enable/disable proceed button
        const proceedBtn = document.getElementById('proceedDepositBtn');
        if (proceedBtn) {
            proceedBtn.disabled = amount < 100;
        }
    }

    selectPaymentMethod(method) {
        this.selectedMethod = method;

        // Update active state
        document.querySelectorAll('.payment-method').forEach(el => {
            el.classList.remove('active');
            if (el.dataset.method === method) {
                el.classList.add('active');
            }
        });

        // Recalculate with new method
        this.updateAmount(this.selectedAmount);
    }

    async proceedToPayment() {
        if (this.selectedAmount < 100) {
            this.showToast('Minimum deposit amount is J$100', 'error');
            return;
        }

        try {
            // Show loading state
            const btn = document.getElementById('proceedDepositBtn');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<div class="skeleton skeleton-inline-sm inline-block mr-2"></div>Processing...';

            // TODO: Integrate with payment gateway
            // For now, simulate a successful deposit
            await this.simulateDeposit();

            // Restore button
            btn.disabled = false;
            btn.innerHTML = originalText;

            this.showToast('Deposit request submitted successfully!', 'success');

            // Refresh balance and transactions
            await this.loadBalance();
            await this.loadTransactions();

            // Switch to history tab
            this.switchTab('history');

            // Reset form
            this.selectedAmount = 0;
            document.getElementById('depositAmount').value = '';
            document.querySelectorAll('.quick-amount-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            this.updateAmount(0);

        } catch (error) {
            console.error('Deposit error:', error);
            this.showToast('Failed to process deposit. Please try again.', 'error');

            // Restore button
            const btn = document.getElementById('proceedDepositBtn');
            btn.disabled = false;
            btn.innerHTML = '<i class="ri-secure-payment-line"></i> Proceed to Payment';
        }
    }

    async simulateDeposit() {
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                // In a real implementation, this would create a transaction record
                // and update the user's balance after payment confirmation
                resolve();
            }, 1500);
        });
    }

    async loadTransactions() {
        try {
            // TODO: Load actual transactions from database
            // For now, show empty state
            const container = document.getElementById('transactionsList');

            // Example transactions (replace with actual data)
            const transactions = [];

            if (transactions.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #9ca3af;">
                        <i class="ri-history-line" style="font-size: 3rem; opacity: 0.5;"></i>
                        <p style="margin-top: 1rem;">No transactions yet</p>
                    </div>
                `;
                return;
            }

            // Render transactions
            container.innerHTML = transactions.map(tx => {
                const isDeposit = tx.type === 'deposit';
                const statusBadge = tx.status === 'completed' ? 'badge-success' :
                                   tx.status === 'pending' ? 'badge-pending' : 'badge-failed';

                return `
                    <div class="transaction-item">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div class="transaction-icon ${isDeposit ? 'deposit' : 'withdraw'}">
                                <i class="ri-${isDeposit ? 'arrow-down' : 'arrow-up'}-line"></i>
                            </div>
                            <div class="transaction-details">
                                <h4>${isDeposit ? 'Deposit' : 'Withdrawal'} - ${tx.method}</h4>
                                <p>${new Date(tx.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}</p>
                            </div>
                        </div>
                        <div class="transaction-amount">
                            <div class="amount ${isDeposit ? 'positive' : 'negative'}">
                                ${isDeposit ? '+' : '-'}J$${tx.amount.toFixed(2)}
                            </div>
                            <div class="status">
                                <span class="badge ${statusBadge}">
                                    ${tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                                </span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    }

    addPaymentMethod() {
        this.showToast('Payment method management coming soon!', 'info');
    }

    showToast(message, type = 'info') {
        // Use existing toast system if available
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            // Fallback
            alert(message);
        }
    }
}

// Initialize deposit manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.depositManager = new DepositManager();
    });
} else {
    window.depositManager = new DepositManager();
}
