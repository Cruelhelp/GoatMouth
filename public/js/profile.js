// Profile Management System
class ProfileManager {
    constructor() {
        this.api = null;
        this.currentUser = null;
        this.currentProfile = null;
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

        // Load profile data
        await this.loadProfileData();

        // Set up event listeners
        this.attachEventListeners();

        // Load statistics
        await this.loadStatistics();
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

    async loadProfileData() {
        if (!this.currentUser || !this.currentProfile) return;

        // Update avatar
        const avatarEl = document.getElementById('profileAvatar');
        const username = this.currentProfile.username || this.currentUser.email.split('@')[0];

        if (this.currentProfile.avatar_url) {
            // Show uploaded image
            avatarEl.style.backgroundImage = `url(${this.currentProfile.avatar_url})`;
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.style.backgroundPosition = 'center';
            avatarEl.textContent = '';
        } else {
            // Show initial letter
            avatarEl.textContent = username.charAt(0).toUpperCase();
        }

        // Update header info
        document.getElementById('profileName').textContent = this.currentProfile.display_name || username;
        document.getElementById('profileEmail').textContent = this.currentUser.email;

        // Update form fields
        document.getElementById('username').value = this.currentProfile.username || '';
        document.getElementById('displayName').value = this.currentProfile.display_name || '';
        document.getElementById('email').value = this.currentUser.email;
        document.getElementById('bio').value = this.currentProfile.bio || '';

        // Update wallet balance
        document.getElementById('walletBalance').textContent = `J$${(this.currentProfile.balance || 0).toFixed(2)}`;

        // Update member since
        const memberSince = new Date(this.currentUser.created_at);
        document.getElementById('memberSince').textContent = memberSince.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Update device info
        const deviceInfo = this.getDeviceInfo();
        document.getElementById('currentDevice').textContent = deviceInfo;

        // Load notification preferences
        await this.loadNotificationPreferences();
    }

    async loadStatistics() {
        try {
            // Get user's bets
            const { data: bets, error: betsError } = await window.supabaseClient
                .from('bets')
                .select('*')
                .eq('user_id', this.currentUser.id);

            if (betsError) throw betsError;

            const totalBets = bets?.length || 0;
            const resolvedBets = bets?.filter(bet => bet.status === 'resolved') || [];
            const wonBets = resolvedBets.filter(bet => bet.won) || [];
            const winRate = resolvedBets.length > 0 ? ((wonBets.length / resolvedBets.length) * 100).toFixed(1) : 0;

            // Calculate total profit/loss
            const totalProfit = bets?.reduce((sum, bet) => {
                if (bet.status === 'resolved') {
                    return sum + (bet.payout || 0) - bet.amount;
                }
                return sum;
            }, 0) || 0;

            // Update stats
            document.getElementById('totalBets').textContent = totalBets;
            document.getElementById('winRate').textContent = `${winRate}%`;
            document.getElementById('totalProfit').textContent = `J$${totalProfit.toFixed(2)}`;
            document.getElementById('totalMarkets').textContent = new Set(bets?.map(b => b.market_id)).size || 0;
            document.getElementById('lifetimeVolume').textContent = `J$${(bets?.reduce((sum, bet) => sum + bet.amount, 0) || 0).toFixed(2)}`;

            // Get user rank (simplified - in production, calculate from leaderboard)
            const { data: profiles } = await window.supabaseClient
                .from('profiles')
                .select('id, balance')
                .order('balance', { ascending: false });

            const rank = profiles?.findIndex(p => p.id === this.currentUser.id) + 1 || '-';
            document.getElementById('userRank').textContent = `#${rank}`;

            // Load recent activity
            await this.loadRecentActivity(bets);

        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    async loadRecentActivity(bets) {
        const container = document.getElementById('recentActivity');

        if (!bets || bets.length === 0) {
            return;
        }

        // Get recent 10 bets
        const recentBets = bets
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 10);

        // Get market details for these bets
        const marketIds = [...new Set(recentBets.map(b => b.market_id))];
        const { data: markets } = await window.supabaseClient
            .from('markets')
            .select('id, title')
            .in('id', marketIds);

        const marketMap = {};
        markets?.forEach(m => marketMap[m.id] = m);

        container.innerHTML = recentBets.map(bet => {
            const market = marketMap[bet.market_id];
            const date = new Date(bet.created_at);
            const statusColor = bet.status === 'resolved'
                ? (bet.won ? 'var(--green)' : '#ef4444')
                : '#9ca3af';
            const statusText = bet.status === 'resolved'
                ? (bet.won ? 'Won' : 'Lost')
                : 'Pending';

            return `
                <div class="info-row">
                    <div>
                        <div class="info-value">${market?.title || 'Unknown Market'}</div>
                        <div class="info-label">
                            ${bet.outcome.toUpperCase()} • J$${bet.amount.toFixed(2)} • ${date.toLocaleDateString()}
                        </div>
                    </div>
                    <div style="color: ${statusColor}; font-weight: 600; font-size: 0.875rem;">
                        ${statusText}
                    </div>
                </div>
            `;
        }).join('');
    }

    async loadNotificationPreferences() {
        try {
            const prefs = this.currentProfile.notification_preferences || {};

            document.getElementById('emailNotifications').checked = prefs.email !== false;
            document.getElementById('marketAlerts').checked = prefs.market_alerts !== false;
            document.getElementById('betNotifications').checked = prefs.bet_notifications !== false;
        } catch (error) {
            console.error('Error loading notification preferences:', error);
        }
    }

    attachEventListeners() {
        // Tab switching
        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab || e.target.closest('.profile-tab').dataset.tab);
            });
        });

        // Profile form submission
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateProfile();
            });
        }

        // Password form submission
        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.changePassword();
            });
        }

        // Avatar upload
        const avatarInput = document.getElementById('avatarInput');
        if (avatarInput) {
            avatarInput.addEventListener('change', (e) => {
                this.uploadAvatar(e.target.files[0]);
            });
        }

        // Notification toggles
        ['emailNotifications', 'marketAlerts', 'betNotifications'].forEach(id => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.addEventListener('change', () => this.saveNotificationPreferences());
            }
        });

        // Logout all devices
        const logoutAllBtn = document.getElementById('logoutAllBtn');
        if (logoutAllBtn) {
            logoutAllBtn.addEventListener('click', () => this.logoutAllDevices());
        }

        // Placeholder buttons
        document.getElementById('enable2FABtn')?.addEventListener('click', () => {
            this.showToast('2FA setup coming soon!', 'info');
        });

        document.getElementById('depositBtn')?.addEventListener('click', () => {
            this.showToast('Deposit feature coming soon!', 'info');
        });

        document.getElementById('withdrawBtn')?.addEventListener('click', () => {
            this.showToast('Withdrawal feature coming soon!', 'info');
        });

        document.getElementById('addPaymentBtn')?.addEventListener('click', () => {
            this.showToast('Payment methods coming soon!', 'info');
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.profile-tab').forEach(tab => {
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

    async updateProfile() {
        const submitBtn = document.querySelector('#profileForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Saving...';

        try {
            const username = document.getElementById('username').value.trim();
            const displayName = document.getElementById('displayName').value.trim();
            const bio = document.getElementById('bio').value.trim();

            // Validate username
            if (username.length < 3) {
                throw new Error('Username must be at least 3 characters');
            }

            // Check if username is taken (if changed)
            if (username !== this.currentProfile.username) {
                const { data: existing } = await window.supabaseClient
                    .from('profiles')
                    .select('id')
                    .eq('username', username)
                    .neq('id', this.currentUser.id)
                    .single();

                if (existing) {
                    throw new Error('Username already taken');
                }
            }

            // Update profile
            const { error } = await window.supabaseClient
                .from('profiles')
                .update({
                    username,
                    display_name: displayName || username,
                    bio,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.currentUser.id);

            if (error) throw error;

            // Update local profile
            this.currentProfile.username = username;
            this.currentProfile.display_name = displayName || username;
            this.currentProfile.bio = bio;

            // Update header
            updateHeaderUI(this.currentUser, this.currentProfile);

            // Update avatar and name display
            document.getElementById('profileName').textContent = displayName || username;
            const avatarEl = document.getElementById('profileAvatar');
            avatarEl.textContent = username.charAt(0).toUpperCase();

            this.showToast('Profile updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating profile:', error);
            this.showToast(error.message || 'Failed to update profile', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    async changePassword() {
        const submitBtn = document.querySelector('#passwordForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Updating...';

        try {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Validate
            if (newPassword.length < 8) {
                throw new Error('New password must be at least 8 characters');
            }

            if (newPassword !== confirmPassword) {
                throw new Error('Passwords do not match');
            }

            // Verify current password by attempting to sign in
            const { error: signInError } = await window.supabaseClient.auth.signInWithPassword({
                email: this.currentUser.email,
                password: currentPassword
            });

            if (signInError) {
                throw new Error('Current password is incorrect');
            }

            // Update password
            const { error } = await window.supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            // Clear form
            document.getElementById('passwordForm').reset();

            this.showToast('Password updated successfully!', 'success');
        } catch (error) {
            console.error('Error changing password:', error);
            this.showToast(error.message || 'Failed to change password', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    async uploadAvatar(file) {
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            this.showToast('Image must be less than 5MB', 'error');
            return;
        }

        try {
            // Create unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${this.currentUser.id}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            // Upload to Supabase storage
            const { error: uploadError } = await window.supabaseClient.storage
                .from('profile-images')
                .upload(filePath, file, {
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('profile-images')
                .getPublicUrl(filePath);

            // Update profile with avatar URL
            const { error: updateError } = await window.supabaseClient
                .from('profiles')
                .update({
                    avatar_url: publicUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.currentUser.id);

            if (updateError) throw updateError;

            // Update avatar display
            const avatarEl = document.getElementById('profileAvatar');
            avatarEl.style.backgroundImage = `url(${publicUrl})`;
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.style.backgroundPosition = 'center';
            avatarEl.textContent = '';

            this.currentProfile.avatar_url = publicUrl;

            this.showToast('Avatar updated successfully!', 'success');
        } catch (error) {
            console.error('Error uploading avatar:', error);
            this.showToast('Failed to upload avatar', 'error');
        }
    }

    async saveNotificationPreferences() {
        try {
            const preferences = {
                email: document.getElementById('emailNotifications').checked,
                market_alerts: document.getElementById('marketAlerts').checked,
                bet_notifications: document.getElementById('betNotifications').checked
            };

            const { error } = await window.supabaseClient
                .from('profiles')
                .update({
                    notification_preferences: preferences,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.currentUser.id);

            if (error) throw error;

            this.showToast('Preferences saved!', 'success');
        } catch (error) {
            console.error('Error saving preferences:', error);
            this.showToast('Failed to save preferences', 'error');
        }
    }

    async logoutAllDevices() {
        if (!confirm('This will sign you out from all devices. Continue?')) {
            return;
        }

        try {
            await window.supabaseClient.auth.signOut({ scope: 'global' });
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error logging out:', error);
            this.showToast('Failed to logout from all devices', 'error');
        }
    }

    getDeviceInfo() {
        const ua = navigator.userAgent;
        let device = 'Unknown Device';

        if (/Mobile|Android|iPhone|iPad/i.test(ua)) {
            if (/iPhone/.test(ua)) device = 'iPhone';
            else if (/iPad/.test(ua)) device = 'iPad';
            else if (/Android/.test(ua)) device = 'Android Device';
            else device = 'Mobile Device';
        } else {
            if (/Windows/.test(ua)) device = 'Windows PC';
            else if (/Mac/.test(ua)) device = 'Mac';
            else if (/Linux/.test(ua)) device = 'Linux PC';
            else device = 'Desktop';
        }

        return `${device} • ${this.getBrowserInfo()}`;
    }

    getBrowserInfo() {
        const ua = navigator.userAgent;
        if (/Chrome/.test(ua) && !/Edge/.test(ua)) return 'Chrome';
        if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'Safari';
        if (/Firefox/.test(ua)) return 'Firefox';
        if (/Edge/.test(ua)) return 'Edge';
        return 'Browser';
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

// Initialize profile manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.profileManager = new ProfileManager();
    });
} else {
    window.profileManager = new ProfileManager();
}
