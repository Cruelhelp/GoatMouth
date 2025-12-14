// Admin Panel Controller
class AdminPanel {
    constructor() {
        this.api = new GoatMouthAPI(window.supabaseClient);
        this.currentView = 'dashboard';
        this.currentUser = null;
        this.currentProfile = null;
    }

    async init() {
        // Require admin access
        const auth = await AuthGuard.requireAdmin();
        if (!auth) return;

        this.currentUser = auth.user;
        this.currentProfile = auth.profile;

        // Update username display
        document.getElementById('admin-username').textContent = this.currentProfile.username;

        // Attach event listeners
        this.attachListeners();

        // Render initial view
        this.switchView('dashboard');
    }

    attachListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.switchView(view);
            });
        });

        // Sign out
        document.getElementById('admin-signout').addEventListener('click', async () => {
            await this.api.signOut();
            window.location.href = 'index.html';
        });
    }

    switchView(view) {
        this.currentView = view;

        // Update navigation active state
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.dataset.view === view) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update header
        const titles = {
            dashboard: { title: 'Dashboard', subtitle: 'Overview of platform metrics' },
            markets: { title: 'Markets', subtitle: 'Manage prediction markets' },
            users: { title: 'Users', subtitle: 'Manage user accounts' },
            transactions: { title: 'Transactions', subtitle: 'View transaction history' },
            messages: { title: 'Messages', subtitle: 'User contact messages and support tickets' },
            voting: { title: 'Voting Management', subtitle: 'Review and manage community proposals' }
        };

        document.getElementById('view-title').textContent = titles[view].title;
        document.getElementById('view-subtitle').textContent = titles[view].subtitle;

        // Render view content
        this.renderView(view);
    }

    async renderView(view) {
        const container = document.getElementById('admin-content');
        container.innerHTML = `
            <div class="inline-loader">
                <div class="spinner-container">
                    <div class="spinner-glow"></div>
                    <div class="spinner-text">Loading...</div>
                </div>
            </div>
        `;

        try {
            switch (view) {
                case 'dashboard':
                    await this.renderDashboard(container);
                    break;
                case 'markets':
                    await this.renderMarkets(container);
                    break;
                case 'users':
                    await this.renderUsers(container);
                    break;
                case 'transactions':
                    await this.renderTransactions(container);
                    break;
                case 'messages':
                    await this.renderMessages(container);
                    break;
                case 'voting':
                    await this.renderVoting(container);
                    break;
            }
        } catch (error) {
            container.innerHTML = `<div class="text-center py-12 text-red-400">Error: ${error.message}</div>`;
        }
    }

    async renderDashboard(container) {
        const [marketStats, userStats, transactions] = await Promise.all([
            this.api.getMarketStats(),
            this.api.getUserStats(),
            this.api.getAllTransactions({ limit: 10 })
        ]);

        container.innerHTML = `
            <!-- Stats Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="stat-card">
                    <div class="stat-value">${marketStats.total}</div>
                    <div class="stat-label">Total Markets</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${marketStats.active}</div>
                    <div class="stat-label">Active Markets</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${userStats.total}</div>
                    <div class="stat-label">Total Users</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">$${marketStats.totalVolume.toFixed(0)}</div>
                    <div class="stat-label">Total Volume</div>
                </div>
            </div>

            <!-- Recent Transactions -->
            <div class="bg-gray-800 rounded-lg p-6">
                <h3 class="text-xl font-bold mb-4">Recent Transactions</h3>
                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactions.map(tx => `
                                <tr>
                                    <td>${tx.profiles?.username || 'Unknown'}</td>
                                    <td><span class="badge badge-${tx.type}">${tx.type}</span></td>
                                    <td class="font-semibold">$${parseFloat(tx.amount).toFixed(2)}</td>
                                    <td class="text-sm text-gray-400">${new Date(tx.created_at).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async renderMarkets(container) {
        const markets = await this.api.getMarkets();

        container.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold">All Markets</h3>
                <button onclick="adminPanel.showCreateMarketModal()" class="btn-primary">
                    + Create Market
                </button>
            </div>

            <div class="bg-gray-800 rounded-lg overflow-hidden">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Volume</th>
                            <th>End Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${markets.map(market => `
                            <tr>
                                <td class="font-semibold">${market.title}</td>
                                <td><span class="text-sm text-gray-400">${market.category || 'N/A'}</span></td>
                                <td><span class="badge badge-${market.status}">${market.status}</span></td>
                                <td>$${parseFloat(market.total_volume || 0).toFixed(0)}</td>
                                <td class="text-sm text-gray-400">${new Date(market.end_date).toLocaleDateString()}</td>
                                <td>
                                    <div class="flex gap-2">
                                        ${market.status === 'active' ? `
                                            <button onclick="adminPanel.showResolveMarketModal('${market.id}')" class="btn-secondary btn-sm">Resolve</button>
                                        ` : ''}
                                        <button onclick="adminPanel.deleteMarket('${market.id}')" class="btn-danger btn-sm">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async renderUsers(container) {
        const users = await this.api.getAllUsers();

        // Calculate stats
        const totalUsers = users.length;
        const adminCount = users.filter(u => u.role === 'admin').length;
        const totalBalance = users.reduce((sum, u) => sum + parseFloat(u.balance), 0);
        const avgBalance = totalBalance / totalUsers;

        container.innerHTML = `
            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-gray-800 rounded-xl border-2 border-gray-700 p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-400 mb-1">Total Users</p>
                            <p class="text-3xl font-bold" style="color: #00CB97;">${totalUsers}</p>
                        </div>
                        <svg class="w-12 h-12 opacity-20" style="color: #00CB97;" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                        </svg>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-xl border-2 border-gray-700 p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-400 mb-1">Admins</p>
                            <p class="text-3xl font-bold" style="color: #631BDD;">${adminCount}</p>
                        </div>
                        <svg class="w-12 h-12 opacity-20" style="color: #631BDD;" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-xl border-2 border-gray-700 p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-400 mb-1">Total Balance</p>
                            <p class="text-3xl font-bold" style="color: #FFC107;">$${totalBalance.toFixed(2)}</p>
                        </div>
                        <svg class="w-12 h-12 opacity-20" style="color: #FFC107;" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-xl border-2 border-gray-700 p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-400 mb-1">Avg Balance</p>
                            <p class="text-3xl font-bold text-white">$${avgBalance.toFixed(2)}</p>
                        </div>
                        <svg class="w-12 h-12 opacity-20 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                </div>
            </div>

            <!-- Search and Filter -->
            <div class="mb-6 flex gap-4">
                <div class="flex-1">
                    <input type="text" id="user-search" placeholder="Search by username or email..."
                        class="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white focus:border-teal-500 focus:outline-none">
                </div>
                <select id="role-filter" class="px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white focus:border-teal-500 focus:outline-none">
                    <option value="all">All Roles</option>
                    <option value="user">Users Only</option>
                    <option value="admin">Admins Only</option>
                </select>
            </div>

            <!-- Users Table -->
            <div id="users-table-container">
                ${this.renderUsersTable(users)}
            </div>
        `;

        // Attach search and filter handlers
        const searchInput = container.querySelector('#user-search');
        const roleFilter = container.querySelector('#role-filter');

        const filterUsers = () => {
            const searchTerm = searchInput.value.toLowerCase();
            const roleFilterValue = roleFilter.value;

            let filtered = users.filter(user => {
                const matchesSearch = user.username.toLowerCase().includes(searchTerm) ||
                                    (user.email && user.email.toLowerCase().includes(searchTerm));
                const matchesRole = roleFilterValue === 'all' || user.role === roleFilterValue;
                return matchesSearch && matchesRole;
            });

            container.querySelector('#users-table-container').innerHTML = this.renderUsersTable(filtered);
        };

        searchInput.addEventListener('input', filterUsers);
        roleFilter.addEventListener('change', filterUsers);
    }

    renderUsersTable(users) {
        if (users.length === 0) {
            return `<div class="text-center py-12 text-gray-400">No users found</div>`;
        }

        return `
            <div class="bg-gray-800 rounded-xl border-2 border-gray-700 overflow-hidden">
                <table class="w-full">
                    <thead class="bg-gray-900">
                        <tr class="text-left text-sm">
                            <th class="px-6 py-4 font-semibold text-gray-400">User</th>
                            <th class="px-6 py-4 font-semibold text-gray-400">Email</th>
                            <th class="px-6 py-4 font-semibold text-gray-400">Role</th>
                            <th class="px-6 py-4 font-semibold text-gray-400">Balance</th>
                            <th class="px-6 py-4 font-semibold text-gray-400">Joined</th>
                            <th class="px-6 py-4 font-semibold text-gray-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-700">
                        ${users.map(user => `
                            <tr class="hover:bg-gray-750 transition">
                                <td class="px-6 py-4">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white" style="background-color: ${this.getUserColor(user.username)};">
                                            ${user.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p class="font-semibold text-white">${this.escapeHtml(user.username)}</p>
                                            ${user.id === this.currentProfile.id ? '<span class="text-xs px-2 py-0.5 rounded-full" style="background-color: #00CB9720; color: #00CB97; border: 1px solid #00CB97;">You</span>' : ''}
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    <span class="text-sm text-gray-300">${user.email || 'No email'}</span>
                                </td>
                                <td class="px-6 py-4">
                                    <span class="px-3 py-1 text-xs font-bold rounded-full"
                                        style="background-color: ${user.role === 'admin' ? '#631BDD20' : '#3B82F620'};
                                               color: ${user.role === 'admin' ? '#631BDD' : '#3B82F6'};
                                               border: 1px solid ${user.role === 'admin' ? '#631BDD' : '#3B82F6'};">
                                        ${user.role.toUpperCase()}
                                    </span>
                                </td>
                                <td class="px-6 py-4">
                                    <span class="font-bold" style="color: #00CB97;">$${parseFloat(user.balance).toFixed(2)}</span>
                                </td>
                                <td class="px-6 py-4">
                                    <span class="text-sm text-gray-400">${new Date(user.created_at).toLocaleDateString()}</span>
                                </td>
                                <td class="px-6 py-4">
                                    <div class="flex gap-2">
                                        <button onclick="adminPanel.showUserDetailsModal('${user.id}')"
                                            class="px-3 py-1.5 text-xs font-semibold rounded-lg transition hover:bg-gray-700"
                                            style="border: 2px solid #00CB97; color: #00CB97;" title="View Details">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                            </svg>
                                        </button>
                                        ${user.id !== this.currentProfile.id ? `
                                            <button onclick="adminPanel.showEditBalanceModal('${user.id}', ${user.balance})"
                                                class="px-3 py-1.5 text-xs font-semibold rounded-lg transition hover:bg-gray-700"
                                                style="border: 2px solid #FFC107; color: #FFC107;" title="Edit Balance">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                </svg>
                                            </button>
                                            <button onclick="adminPanel.toggleUserRole('${user.id}', '${user.role}')"
                                                class="px-3 py-1.5 text-xs font-semibold rounded-lg transition hover:bg-gray-700"
                                                style="border: 2px solid #631BDD; color: #631BDD;" title="Toggle Role">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                                                </svg>
                                            </button>
                                            <button onclick="adminPanel.sendMessageToUser('${user.id}', '${this.escapeHtml(user.username)}')"
                                                class="px-3 py-1.5 text-xs font-semibold rounded-lg transition hover:bg-gray-700"
                                                style="border: 2px solid #3B82F6; color: #3B82F6;" title="Send Message">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                                </svg>
                                            </button>
                                            <button onclick="adminPanel.deleteUser('${user.id}', '${this.escapeHtml(user.username)}')"
                                                class="px-3 py-1.5 text-xs font-semibold rounded-lg transition hover:bg-red-900"
                                                style="border: 2px solid #EF4444; color: #EF4444;" title="Delete User">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                </svg>
                                            </button>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    getUserColor(username) {
        const colors = ['#00CB97', '#631BDD', '#FFC107', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    async showUserDetailsModal(userId) {
        try {
            const [profile, positions, transactions] = await Promise.all([
                this.api.getProfile(userId),
                this.api.getUserPositions(userId),
                this.api.getUserTransactions(userId)
            ]);

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto';
            modal.innerHTML = `
                <div class="bg-gray-800 rounded-2xl border-2 border-gray-700 p-8 max-w-4xl w-full my-8">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-3xl font-bold" style="color: #00CB97;">User Details</h2>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    <!-- User Info -->
                    <div class="grid grid-cols-2 gap-6 mb-6">
                        <div class="bg-gray-900 rounded-xl p-4">
                            <p class="text-sm text-gray-400 mb-1">Username</p>
                            <p class="text-lg font-bold">${this.escapeHtml(profile.username)}</p>
                        </div>
                        <div class="bg-gray-900 rounded-xl p-4">
                            <p class="text-sm text-gray-400 mb-1">Email</p>
                            <p class="text-lg font-bold">${this.escapeHtml(profile.email || 'N/A')}</p>
                        </div>
                        <div class="bg-gray-900 rounded-xl p-4">
                            <p class="text-sm text-gray-400 mb-1">Role</p>
                            <p class="text-lg font-bold" style="color: ${profile.role === 'admin' ? '#631BDD' : '#3B82F6'};">${profile.role.toUpperCase()}</p>
                        </div>
                        <div class="bg-gray-900 rounded-xl p-4">
                            <p class="text-sm text-gray-400 mb-1">Balance</p>
                            <p class="text-lg font-bold" style="color: #00CB97;">$${parseFloat(profile.balance).toFixed(2)}</p>
                        </div>
                        <div class="bg-gray-900 rounded-xl p-4">
                            <p class="text-sm text-gray-400 mb-1">User ID</p>
                            <p class="text-sm font-mono">${profile.id}</p>
                        </div>
                        <div class="bg-gray-900 rounded-xl p-4">
                            <p class="text-sm text-gray-400 mb-1">Joined</p>
                            <p class="text-lg font-bold">${new Date(profile.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <!-- Activity Tabs -->
                    <div class="border-t border-gray-700 pt-6">
                        <h3 class="text-xl font-bold mb-4">Activity</h3>

                        <!-- Positions -->
                        <div class="mb-6">
                            <h4 class="font-semibold mb-3" style="color: #631BDD;">Active Positions (${positions.length})</h4>
                            ${positions.length > 0 ? `
                                <div class="bg-gray-900 rounded-xl p-4 max-h-60 overflow-y-auto">
                                    ${positions.map(pos => `
                                        <div class="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                                            <div>
                                                <p class="font-semibold">${pos.markets?.title || 'Unknown Market'}</p>
                                                <p class="text-sm text-gray-400">${pos.outcome} • ${pos.shares} shares @ $${parseFloat(pos.avg_price).toFixed(2)}</p>
                                            </div>
                                            <p class="font-bold" style="color: #00CB97;">$${(pos.shares * parseFloat(pos.avg_price)).toFixed(2)}</p>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : '<p class="text-gray-400 text-sm">No active positions</p>'}
                        </div>

                        <!-- Recent Transactions -->
                        <div>
                            <h4 class="font-semibold mb-3" style="color: #FFC107;">Recent Transactions (${transactions.slice(0, 10).length})</h4>
                            ${transactions.length > 0 ? `
                                <div class="bg-gray-900 rounded-xl p-4 max-h-60 overflow-y-auto">
                                    ${transactions.slice(0, 10).map(tx => `
                                        <div class="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                                            <div>
                                                <p class="font-semibold text-sm">${tx.type}</p>
                                                <p class="text-xs text-gray-400">${new Date(tx.created_at).toLocaleString()}</p>
                                            </div>
                                            <p class="font-bold ${parseFloat(tx.amount) >= 0 ? 'text-green-400' : 'text-red-400'}">
                                                ${parseFloat(tx.amount) >= 0 ? '+' : ''}$${parseFloat(tx.amount).toFixed(2)}
                                            </p>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : '<p class="text-gray-400 text-sm">No transactions</p>'}
                        </div>
                    </div>

                    <div class="mt-6 flex justify-end">
                        <button onclick="this.closest('.fixed').remove()"
                            class="px-6 py-3 rounded-xl font-bold transition"
                            style="background-color: #00CB97; color: white;">
                            Close
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
        } catch (error) {
            alert('Error loading user details: ' + error.message);
        }
    }

    showEditBalanceModal(userId, currentBalance) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-2xl border-2 border-gray-700 p-8 max-w-md w-full">
                <h2 class="text-2xl font-bold mb-4" style="color: #FFC107;">Edit User Balance</h2>
                <p class="text-gray-400 mb-6">Current balance: <span class="font-bold" style="color: #00CB97;">$${parseFloat(currentBalance).toFixed(2)}</span></p>

                <form id="edit-balance-form">
                    <div class="mb-4">
                        <label class="block text-sm font-semibold mb-2">Action</label>
                        <select id="balance-action" class="w-full px-4 py-3 bg-gray-900 border-2 border-gray-600 rounded-xl text-white focus:border-teal-500 focus:outline-none">
                            <option value="set">Set Balance</option>
                            <option value="add">Add Funds</option>
                            <option value="subtract">Subtract Funds</option>
                        </select>
                    </div>

                    <div class="mb-6">
                        <label class="block text-sm font-semibold mb-2">Amount</label>
                        <input type="number" id="balance-amount" step="0.01" min="0" required
                            class="w-full px-4 py-3 bg-gray-900 border-2 border-gray-600 rounded-xl text-white focus:border-teal-500 focus:outline-none"
                            placeholder="0.00">
                    </div>

                    <div class="flex gap-3">
                        <button type="submit" class="flex-1 px-6 py-3 rounded-xl font-bold transition" style="background-color: #FFC107; color: #1a1a1a;">
                            Update Balance
                        </button>
                        <button type="button" onclick="this.closest('.fixed').remove()"
                            class="px-6 py-3 rounded-xl font-bold border-2 transition" style="border-color: #6B7280; color: #6B7280;">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#edit-balance-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const action = modal.querySelector('#balance-action').value;
            const amount = parseFloat(modal.querySelector('#balance-amount').value);

            let newBalance;
            switch (action) {
                case 'set':
                    newBalance = amount;
                    break;
                case 'add':
                    newBalance = parseFloat(currentBalance) + amount;
                    break;
                case 'subtract':
                    newBalance = parseFloat(currentBalance) - amount;
                    break;
            }

            if (newBalance < 0) {
                alert('Balance cannot be negative');
                return;
            }

            try {
                await this.api.updateUserBalance(userId, newBalance);
                modal.remove();
                this.renderView('users');
            } catch (error) {
                alert('Error updating balance: ' + error.message);
            }
        });
    }

    sendMessageToUser(userId, username) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-2xl border-2 border-gray-700 p-8 max-w-2xl w-full">
                <h2 class="text-2xl font-bold mb-4" style="color: #3B82F6;">Send Message to ${this.escapeHtml(username)}</h2>

                <form id="send-message-form">
                    <div class="mb-4">
                        <label class="block text-sm font-semibold mb-2">Subject</label>
                        <input type="text" id="message-subject" required
                            class="w-full px-4 py-3 bg-gray-900 border-2 border-gray-600 rounded-xl text-white focus:border-teal-500 focus:outline-none"
                            placeholder="Message subject">
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-semibold mb-2">Message Type</label>
                        <select id="message-type" class="w-full px-4 py-3 bg-gray-900 border-2 border-gray-600 rounded-xl text-white focus:border-teal-500 focus:outline-none">
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="success">Success</option>
                            <option value="announcement">Announcement</option>
                        </select>
                    </div>

                    <div class="mb-6">
                        <label class="block text-sm font-semibold mb-2">Message</label>
                        <textarea id="message-body" rows="6" required
                            class="w-full px-4 py-3 bg-gray-900 border-2 border-gray-600 rounded-xl text-white focus:border-teal-500 focus:outline-none resize-none"
                            placeholder="Type your message..."></textarea>
                    </div>

                    <div class="flex gap-3">
                        <button type="submit" class="flex-1 px-6 py-3 rounded-xl font-bold transition" style="background-color: #3B82F6; color: white;">
                            Send Message
                        </button>
                        <button type="button" onclick="this.closest('.fixed').remove()"
                            class="px-6 py-3 rounded-xl font-bold border-2 transition" style="border-color: #6B7280; color: #6B7280;">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#send-message-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const subject = modal.querySelector('#message-subject').value;
            const messageType = modal.querySelector('#message-type').value;
            const message = modal.querySelector('#message-body').value;

            try {
                await this.api.createUserMessage(userId, subject, message, messageType);
                modal.remove();
                alert(`Message sent to ${username}!`);
            } catch (error) {
                alert('Error sending message: ' + error.message);
            }
        });
    }

    async deleteUser(userId, username) {
        if (!confirm(`Are you sure you want to DELETE user "${username}"?\n\nThis will permanently remove:\n• User account\n• All positions\n• All transactions\n• All data\n\nThis action CANNOT be undone!`)) {
            return;
        }

        const confirmText = prompt(`Type "${username}" to confirm deletion:`);
        if (confirmText !== username) {
            alert('Username did not match. Deletion cancelled.');
            return;
        }

        try {
            await this.api.deleteUser(userId);
            this.renderView('users');
            alert(`User "${username}" has been deleted.`);
        } catch (error) {
            alert('Error deleting user: ' + error.message);
        }
    }

    async renderTransactions(container) {
        const transactions = await this.api.getAllTransactions({ limit: 100 });

        container.innerHTML = `
            <div class="bg-gray-800 rounded-lg overflow-hidden">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Balance After</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.map(tx => `
                            <tr>
                                <td class="font-semibold">${tx.profiles?.username || 'Unknown'}</td>
                                <td><span class="badge badge-${tx.type}">${tx.type}</span></td>
                                <td class="font-semibold">$${parseFloat(tx.amount).toFixed(2)}</td>
                                <td class="text-sm text-gray-400">$${parseFloat(tx.balance_after).toFixed(2)}</td>
                                <td class="text-sm text-gray-400">${new Date(tx.created_at).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Market Management
    showCreateMarketModal() {
        const modal = document.createElement('div');
        modal.className = 'admin-modal';
        modal.innerHTML = `
            <div class="admin-modal-content">
                <div class="p-6 border-b border-gray-700">
                    <h3 class="text-xl font-bold">Create New Market</h3>
                </div>
                <form id="create-market-form" class="p-6 space-y-4">
                    <div class="form-group">
                        <label class="form-label">Title</label>
                        <input type="text" name="title" required class="form-input" placeholder="Will Bitcoin reach $100k by 2025?">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea name="description" rows="3" class="form-input" placeholder="Market resolution criteria..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <select name="category" class="form-select">
                            <option value="Crypto">Crypto</option>
                            <option value="Technology">Technology</option>
                            <option value="Politics">Politics</option>
                            <option value="Sports">Sports</option>
                            <option value="Business">Business</option>
                            <option value="Science">Science</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">End Date</label>
                        <input type="datetime-local" name="end_date" required class="form-input">
                    </div>
                    <div class="flex gap-3 justify-end">
                        <button type="button" onclick="this.closest('.admin-modal').remove()" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition">Cancel</button>
                        <button type="submit" class="btn-primary">Create Market</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('create-market-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);

            try {
                await this.api.createMarket({
                    title: data.title,
                    description: data.description,
                    category: data.category,
                    end_date: new Date(data.end_date).toISOString(),
                    yes_price: 0.5,
                    no_price: 0.5
                });

                modal.remove();
                this.renderView('markets');
            } catch (error) {
                alert('Error creating market: ' + error.message);
            }
        });
    }

    showResolveMarketModal(marketId) {
        const modal = document.createElement('div');
        modal.className = 'admin-modal';
        modal.innerHTML = `
            <div class="admin-modal-content">
                <div class="p-6 border-b border-gray-700">
                    <h3 class="text-xl font-bold">Resolve Market</h3>
                    <p class="text-sm text-gray-400 mt-1">Select the winning outcome</p>
                </div>
                <div class="p-6 space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <button onclick="adminPanel.resolveMarket('${marketId}', 'yes'); this.closest('.admin-modal').remove();" class="px-6 py-4 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-white transition">
                            YES
                        </button>
                        <button onclick="adminPanel.resolveMarket('${marketId}', 'no'); this.closest('.admin-modal').remove();" class="px-6 py-4 bg-red-600 hover:bg-red-700 rounded-lg font-bold text-white transition">
                            NO
                        </button>
                    </div>
                    <button onclick="this.closest('.admin-modal').remove()" class="w-full px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    async resolveMarket(marketId, outcome) {
        if (!confirm(`Confirm resolving market as ${outcome.toUpperCase()}? This action cannot be undone.`)) {
            return;
        }

        try {
            await this.api.resolveMarket(marketId, outcome);
            alert('Market resolved successfully!');
            this.renderView('markets');
        } catch (error) {
            alert('Error resolving market: ' + error.message);
        }
    }

    async deleteMarket(marketId) {
        if (!confirm('Are you sure you want to delete this market? This action cannot be undone.')) {
            return;
        }

        try {
            await this.api.deleteMarket(marketId);
            this.renderView('markets');
        } catch (error) {
            alert('Error deleting market: ' + error.message);
        }
    }

    async toggleUserRole(userId, currentRole) {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';

        if (!confirm(`Change user role to ${newRole.toUpperCase()}?`)) {
            return;
        }

        try {
            await this.api.changeUserRole(userId, newRole);
            this.renderView('users');
        } catch (error) {
            alert('Error changing role: ' + error.message);
        }
    }

    async renderMessages(container) {
        const messages = await this.api.getContactMessages();

        // Count unread messages
        const unreadCount = messages.filter(m => m.status === 'new').length;
        const badge = document.getElementById('unread-badge');
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }

        // Status filter tabs
        const statuses = [
            { value: 'all', label: 'All', color: '#6B7280' },
            { value: 'new', label: 'New', color: '#00CB97' },
            { value: 'read', label: 'Read', color: '#631BDD' },
            { value: 'replied', label: 'Replied', color: '#3B82F6' },
            { value: 'resolved', label: 'Resolved', color: '#10B981' },
            { value: 'archived', label: 'Archived', color: '#6B7280' }
        ];

        container.innerHTML = `
            <div class="mb-6">
                <div class="flex gap-2 overflow-x-auto pb-2">
                    ${statuses.map(s => `
                        <button class="status-filter px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition ${s.value === 'all' ? 'active' : ''}"
                            data-status="${s.value}"
                            style="border: 2px solid ${s.color}; ${s.value === 'all' ? `background-color: ${s.color}; color: white;` : `color: ${s.color};`}">
                            ${s.label}
                            ${s.value !== 'all' ? `<span class="ml-1">(${messages.filter(m => m.status === s.value).length})</span>` : ''}
                        </button>
                    `).join('')}
                </div>
            </div>

            <div id="messages-list" class="space-y-4">
                ${this.renderMessagesList(messages)}
            </div>
        `;

        // Attach filter listeners
        container.querySelectorAll('.status-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                const status = btn.dataset.status;
                const filteredMessages = status === 'all' ? messages : messages.filter(m => m.status === status);

                // Update active button
                container.querySelectorAll('.status-filter').forEach(b => {
                    b.classList.remove('active');
                    const color = statuses.find(s => s.value === b.dataset.status).color;
                    b.style.backgroundColor = '';
                    b.style.color = color;
                });
                btn.classList.add('active');
                const color = statuses.find(s => s.value === status).color;
                btn.style.backgroundColor = color;
                btn.style.color = 'white';

                // Update list
                document.getElementById('messages-list').innerHTML = this.renderMessagesList(filteredMessages);
            });
        });
    }

    renderMessagesList(messages) {
        if (messages.length === 0) {
            return `<div class="text-center py-12 text-gray-400">No messages found</div>`;
        }

        const priorityColors = {
            urgent: '#EF4444',
            high: '#F97316',
            normal: '#3B82F6',
            low: '#6B7280'
        };

        const statusColors = {
            new: '#00CB97',
            read: '#631BDD',
            replied: '#3B82F6',
            resolved: '#10B981',
            archived: '#6B7280'
        };

        return messages.map(msg => {
            const date = new Date(msg.created_at).toLocaleString();
            const username = msg.profiles?.username || 'Unknown User';
            const userEmail = msg.email;

            return `
                <div class="bg-gray-800 rounded-xl border-2 border-gray-700 p-6 hover:border-gray-600 transition">
                    <!-- Header -->
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex-1">
                            <div class="flex items-center gap-3 mb-2">
                                <h3 class="text-lg font-bold text-white">${this.escapeHtml(msg.subject)}</h3>
                                <span class="px-3 py-1 text-xs font-bold rounded-full" style="background-color: ${statusColors[msg.status]}20; color: ${statusColors[msg.status]}; border: 1px solid ${statusColors[msg.status]};">
                                    ${msg.status.toUpperCase()}
                                </span>
                                <span class="px-3 py-1 text-xs font-bold rounded-full" style="background-color: ${priorityColors[msg.priority]}20; color: ${priorityColors[msg.priority]}; border: 1px solid ${priorityColors[msg.priority]};">
                                    ${msg.priority.toUpperCase()} PRIORITY
                                </span>
                            </div>
                            <div class="text-sm text-gray-400">
                                From: <span class="font-semibold text-white">${this.escapeHtml(msg.name)}</span>
                                ${msg.user_id ? `(${this.escapeHtml(username)})` : '(Guest)'}
                                • <a href="mailto:${this.escapeHtml(userEmail)}" class="hover:underline" style="color: #00CB97;">${this.escapeHtml(userEmail)}</a>
                                • ${date}
                            </div>
                        </div>
                    </div>

                    <!-- Message Body -->
                    <div class="bg-gray-900 rounded-lg p-4 mb-4">
                        <p class="text-gray-300 whitespace-pre-wrap">${this.escapeHtml(msg.message)}</p>
                    </div>

                    ${msg.admin_notes ? `
                        <div class="bg-purple-900 bg-opacity-20 border-2 border-purple-500 rounded-lg p-4 mb-4">
                            <p class="text-sm font-semibold mb-1" style="color: #631BDD;">Admin Notes:</p>
                            <p class="text-gray-300 text-sm whitespace-pre-wrap">${this.escapeHtml(msg.admin_notes)}</p>
                        </div>
                    ` : ''}

                    <!-- Actions -->
                    <div class="flex gap-2 flex-wrap">
                        ${msg.status === 'new' ? `
                            <button onclick="adminPanel.updateMessageStatus('${msg.id}', 'read')"
                                class="px-4 py-2 rounded-lg font-semibold text-sm transition"
                                style="background-color: #631BDD; color: white;">
                                Mark as Read
                            </button>
                        ` : ''}
                        ${msg.status !== 'replied' && msg.status !== 'resolved' ? `
                            <button onclick="adminPanel.showReplyModal('${msg.id}', '${this.escapeHtml(userEmail)}', '${this.escapeHtml(msg.name)}', ${msg.user_id ? `'${msg.user_id}'` : 'null'})"
                                class="px-4 py-2 rounded-lg font-semibold text-sm transition"
                                style="background-color: #00CB97; color: white;">
                                Reply via Email
                            </button>
                        ` : ''}
                        ${msg.status !== 'resolved' ? `
                            <button onclick="adminPanel.updateMessageStatus('${msg.id}', 'resolved')"
                                class="px-4 py-2 rounded-lg font-semibold text-sm transition"
                                style="background-color: #10B981; color: white;">
                                Mark Resolved
                            </button>
                        ` : ''}
                        <button onclick="adminPanel.showNotesModal('${msg.id}', ${msg.admin_notes ? `'${this.escapeHtml(msg.admin_notes)}'` : 'null'})"
                            class="px-4 py-2 rounded-lg font-semibold text-sm border-2 transition"
                            style="border-color: #6B7280; color: #6B7280;">
                            ${msg.admin_notes ? 'Edit Notes' : 'Add Notes'}
                        </button>
                        <button onclick="adminPanel.updateMessageStatus('${msg.id}', 'archived')"
                            class="px-4 py-2 rounded-lg font-semibold text-sm border-2 transition"
                            style="border-color: #6B7280; color: #6B7280;">
                            Archive
                        </button>
                        <button onclick="adminPanel.deleteMessage('${msg.id}')"
                            class="px-4 py-2 rounded-lg font-semibold text-sm border-2 transition hover:bg-red-900 hover:border-red-500"
                            style="border-color: #EF4444; color: #EF4444;">
                            Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async updateMessageStatus(messageId, newStatus) {
        try {
            await this.api.updateContactMessage(messageId, { status: newStatus });
            this.renderView('messages');
        } catch (error) {
            alert('Error updating message: ' + error.message);
        }
    }

    showReplyModal(messageId, email, name, userId) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-2xl border-2 border-gray-700 p-8 max-w-2xl w-full">
                <h2 class="text-2xl font-bold mb-4" style="color: #00CB97;">Reply to ${this.escapeHtml(name)}</h2>
                <p class="text-gray-400 mb-6">To: ${this.escapeHtml(email)}</p>

                <form id="reply-form">
                    <div class="mb-4">
                        <label class="block text-sm font-semibold mb-2">Subject</label>
                        <input type="text" id="reply-subject" required
                            class="w-full px-4 py-3 bg-gray-900 border-2 border-gray-600 rounded-xl text-white focus:border-teal-500 focus:outline-none"
                            placeholder="Re: Your message">
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-semibold mb-2">Message</label>
                        <textarea id="reply-message" rows="8" required
                            class="w-full px-4 py-3 bg-gray-900 border-2 border-gray-600 rounded-xl text-white focus:border-teal-500 focus:outline-none resize-none"
                            placeholder="Type your reply..."></textarea>
                    </div>

                    ${userId ? `
                        <div class="mb-6">
                            <label class="flex items-center gap-2 text-sm">
                                <input type="checkbox" id="send-to-profile" checked
                                    class="w-4 h-4 rounded">
                                <span>Also send to user's in-app messages</span>
                            </label>
                        </div>
                    ` : ''}

                    <div class="flex gap-3">
                        <button type="submit" class="flex-1 px-6 py-3 rounded-xl font-bold transition" style="background-color: #00CB97; color: white;">
                            Send Reply
                        </button>
                        <button type="button" onclick="this.closest('.fixed').remove()"
                            class="px-6 py-3 rounded-xl font-bold border-2 transition" style="border-color: #6B7280; color: #6B7280;">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle form submission
        modal.querySelector('#reply-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const subject = modal.querySelector('#reply-subject').value;
            const message = modal.querySelector('#reply-message').value;
            const sendToProfile = userId && modal.querySelector('#send-to-profile')?.checked;

            try {
                // Send email (you'll need to implement email sending via Supabase Edge Function or third-party service)
                // For now, we'll just create the reply and user message

                // Add reply to message thread
                await this.api.addMessageReply(messageId, message, 'admin');

                // If user has account, send to their in-app messages
                if (sendToProfile && userId) {
                    await this.api.createUserMessage(userId, subject, message, 'reply', messageId);
                }

                // Update message status to replied
                await this.api.updateContactMessage(messageId, { status: 'replied' });

                modal.remove();
                this.renderView('messages');
                alert(`Reply sent to ${email}${sendToProfile ? ' and user inbox' : ''}!`);
            } catch (error) {
                alert('Error sending reply: ' + error.message);
            }
        });
    }

    showNotesModal(messageId, currentNotes) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-2xl border-2 border-gray-700 p-8 max-w-2xl w-full">
                <h2 class="text-2xl font-bold mb-4" style="color: #631BDD;">Admin Notes</h2>
                <p class="text-gray-400 mb-6">Internal notes (not visible to user)</p>

                <form id="notes-form">
                    <div class="mb-6">
                        <textarea id="admin-notes" rows="6"
                            class="w-full px-4 py-3 bg-gray-900 border-2 border-gray-600 rounded-xl text-white focus:border-purple-500 focus:outline-none resize-none"
                            placeholder="Add internal notes...">${currentNotes || ''}</textarea>
                    </div>

                    <div class="flex gap-3">
                        <button type="submit" class="flex-1 px-6 py-3 rounded-xl font-bold transition" style="background-color: #631BDD; color: white;">
                            Save Notes
                        </button>
                        <button type="button" onclick="this.closest('.fixed').remove()"
                            class="px-6 py-3 rounded-xl font-bold border-2 transition" style="border-color: #6B7280; color: #6B7280;">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#notes-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const notes = modal.querySelector('#admin-notes').value.trim();

            try {
                await this.api.updateContactMessage(messageId, { admin_notes: notes || null });
                modal.remove();
                this.renderView('messages');
            } catch (error) {
                alert('Error saving notes: ' + error.message);
            }
        });
    }

    async deleteMessage(messageId) {
        if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
            return;
        }

        try {
            await this.api.deleteContactMessage(messageId);
            this.renderView('messages');
        } catch (error) {
            alert('Error deleting message: ' + error.message);
        }
    }

    async renderVoting(container) {
        // Fetch all proposals with vote counts
        const { data: proposals, error } = await window.supabaseClient
            .from('proposals')
            .select(`
                *,
                profiles!proposals_created_by_fkey(username, email),
                proposal_votes(vote),
                proposal_comments(id)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            container.innerHTML = `<div class="text-center py-12 text-red-400">Error loading proposals: ${error.message}</div>`;
            return;
        }

        // Calculate statistics
        const pendingCount = proposals.filter(p => p.status === 'pending').length;
        const approvedCount = proposals.filter(p => p.status === 'approved').length;
        const rejectedCount = proposals.filter(p => p.status === 'rejected').length;

        // Update badge
        const badge = document.getElementById('pending-proposals-badge');
        if (badge && pendingCount > 0) {
            badge.textContent = pendingCount;
            badge.classList.remove('hidden');
        } else if (badge) {
            badge.classList.add('hidden');
        }

        container.innerHTML = `
            <div class="mb-6">
                <h3 class="text-xl font-bold mb-4">Voting Management</h3>

                <!-- Statistics Cards -->
                <div class="grid grid-cols-3 gap-4 mb-6">
                    <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">Pending Review</p>
                                <p class="text-3xl font-bold text-yellow-400">${pendingCount}</p>
                            </div>
                            <svg class="h-12 w-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                    </div>
                    <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">Approved & Live</p>
                                <p class="text-3xl font-bold text-green-400">${approvedCount}</p>
                            </div>
                            <svg class="h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                    </div>
                    <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">Rejected</p>
                                <p class="text-3xl font-bold text-red-400">${rejectedCount}</p>
                            </div>
                            <svg class="h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                    </div>
                </div>

                <!-- Filter Tabs -->
                <div class="flex gap-2 mb-4">
                    <button class="status-filter px-4 py-2 rounded-lg font-semibold transition"
                            data-status="all"
                            style="background-color: #00CB97; color: white;">
                        All (${proposals.length})
                    </button>
                    <button class="status-filter px-4 py-2 rounded-lg font-semibold transition"
                            data-status="pending"
                            style="background-color: rgba(242, 195, 0, 0.2); color: #F2C300;">
                        Pending (${pendingCount})
                    </button>
                    <button class="status-filter px-4 py-2 rounded-lg font-semibold transition"
                            data-status="approved"
                            style="background-color: rgba(16, 185, 129, 0.2); color: #10B981;">
                        Approved (${approvedCount})
                    </button>
                    <button class="status-filter px-4 py-2 rounded-lg font-semibold transition"
                            data-status="rejected"
                            style="background-color: rgba(239, 68, 68, 0.2); color: #ef4444;">
                        Rejected (${rejectedCount})
                    </button>
                </div>
            </div>

            <div id="proposals-list" class="space-y-4">
                ${this.renderProposalsList(proposals)}
            </div>
        `;

        // Attach filter listeners
        container.querySelectorAll('.status-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                const status = btn.dataset.status;

                // Update active state
                container.querySelectorAll('.status-filter').forEach(b => {
                    if (b === btn) {
                        b.style.backgroundColor = '#00CB97';
                        b.style.color = 'white';
                    } else {
                        const originalStatus = b.dataset.status;
                        if (originalStatus === 'pending') {
                            b.style.backgroundColor = 'rgba(242, 195, 0, 0.2)';
                            b.style.color = '#F2C300';
                        } else if (originalStatus === 'approved') {
                            b.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
                            b.style.color = '#10B981';
                        } else if (originalStatus === 'rejected') {
                            b.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                            b.style.color = '#ef4444';
                        } else {
                            b.style.backgroundColor = 'rgba(0, 203, 151, 0.2)';
                            b.style.color = '#00CB97';
                        }
                    }
                });

                // Filter proposals
                const filteredProposals = status === 'all'
                    ? proposals
                    : proposals.filter(p => p.status === status);

                document.getElementById('proposals-list').innerHTML = this.renderProposalsList(filteredProposals);
            });
        });
    }

    renderProposalsList(proposals) {
        if (proposals.length === 0) {
            return `<div class="text-center py-12 text-gray-400">No proposals found</div>`;
        }

        return proposals.map(proposal => {
            const yesVotes = proposal.proposal_votes.filter(v => v.vote === 'yes').length;
            const noVotes = proposal.proposal_votes.filter(v => v.vote === 'no').length;
            const totalVotes = yesVotes + noVotes;
            const commentCount = proposal.proposal_comments.length;
            const yesPercent = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0;

            const statusColors = {
                pending: { bg: '#F2C300', text: 'black' },
                approved: { bg: '#10B981', text: 'white' },
                rejected: { bg: '#ef4444', text: 'white' }
            };

            const status = statusColors[proposal.status];

            return `
                <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex-1">
                            <div class="flex items-center gap-3 mb-2">
                                ${proposal.image_url ? `
                                    <img src="${proposal.image_url}" alt="${proposal.title}"
                                         class="w-16 h-16 rounded-lg object-cover border-2 border-gray-600">
                                ` : ''}
                                <div>
                                    <h4 class="text-xl font-bold text-white">${proposal.title}</h4>
                                    <p class="text-sm text-gray-400">
                                        By ${proposal.profiles?.username || 'Unknown'} •
                                        ${new Date(proposal.created_at).toLocaleDateString()} •
                                        ${commentCount} comments
                                    </p>
                                </div>
                            </div>
                            <p class="text-gray-300 mb-4">${proposal.description}</p>

                            ${proposal.category ? `
                                <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-700 text-gray-300 mb-3">
                                    ${proposal.category}
                                </span>
                            ` : ''}

                            <!-- Vote Statistics -->
                            <div class="grid grid-cols-2 gap-4 mt-4">
                                <div class="bg-gray-900 rounded-lg p-3">
                                    <p class="text-sm text-gray-400 mb-1">Yes Votes</p>
                                    <div class="flex items-center gap-2">
                                        <div class="flex-1 bg-gray-700 rounded-full h-2">
                                            <div class="bg-green-400 h-2 rounded-full" style="width: ${yesPercent}%"></div>
                                        </div>
                                        <span class="text-green-400 font-bold">${yesVotes}</span>
                                    </div>
                                </div>
                                <div class="bg-gray-900 rounded-lg p-3">
                                    <p class="text-sm text-gray-400 mb-1">No Votes</p>
                                    <div class="flex items-center gap-2">
                                        <div class="flex-1 bg-gray-700 rounded-full h-2">
                                            <div class="bg-red-400 h-2 rounded-full" style="width: ${100 - yesPercent}%"></div>
                                        </div>
                                        <span class="text-red-400 font-bold">${noVotes}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="ml-4">
                            <span class="inline-block px-4 py-2 rounded-lg text-sm font-bold mb-3"
                                  style="background-color: ${status.bg}; color: ${status.text};">
                                ${proposal.status.toUpperCase()}
                            </span>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-2 pt-4 border-t border-gray-700">
                        ${proposal.status === 'pending' ? `
                            <button onclick="adminPanel.approveProposal('${proposal.id}')"
                                class="px-4 py-2 rounded-lg font-semibold text-sm transition hover:opacity-80"
                                style="background-color: #10B981; color: white;">
                                ✓ Approve
                            </button>
                            <button onclick="adminPanel.rejectProposal('${proposal.id}')"
                                class="px-4 py-2 rounded-lg font-semibold text-sm transition hover:opacity-80"
                                style="background-color: #ef4444; color: white;">
                                ✗ Reject
                            </button>
                        ` : ''}
                        ${proposal.status === 'approved' || proposal.status === 'rejected' ? `
                            <button onclick="adminPanel.resetProposalStatus('${proposal.id}')"
                                class="px-4 py-2 rounded-lg font-semibold text-sm transition hover:opacity-80"
                                style="background-color: #F2C300; color: black;">
                                ↺ Reset to Pending
                            </button>
                        ` : ''}
                        <button onclick="adminPanel.deleteProposal('${proposal.id}')"
                            class="px-4 py-2 rounded-lg font-semibold text-sm border-2 transition hover:bg-red-900 hover:border-red-500"
                            style="border-color: #ef4444; color: #ef4444;">
                            🗑 Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async approveProposal(proposalId) {
        if (!confirm('Approve this proposal and make it live?')) return;

        try {
            const { error } = await window.supabaseClient
                .from('proposals')
                .update({ status: 'approved' })
                .eq('id', proposalId);

            if (error) throw error;

            this.renderView('voting');
            this.showToast('Proposal approved successfully!', 'success');
        } catch (error) {
            alert('Error approving proposal: ' + error.message);
        }
    }

    async rejectProposal(proposalId) {
        if (!confirm('Reject this proposal?')) return;

        try {
            const { error } = await window.supabaseClient
                .from('proposals')
                .update({ status: 'rejected' })
                .eq('id', proposalId);

            if (error) throw error;

            this.renderView('voting');
            this.showToast('Proposal rejected', 'info');
        } catch (error) {
            alert('Error rejecting proposal: ' + error.message);
        }
    }

    async resetProposalStatus(proposalId) {
        if (!confirm('Reset this proposal to pending status?')) return;

        try {
            const { error } = await window.supabaseClient
                .from('proposals')
                .update({ status: 'pending' })
                .eq('id', proposalId);

            if (error) throw error;

            this.renderView('voting');
            this.showToast('Proposal status reset to pending', 'info');
        } catch (error) {
            alert('Error resetting proposal: ' + error.message);
        }
    }

    async deleteProposal(proposalId) {
        if (!confirm('Are you sure you want to delete this proposal? This action cannot be undone.')) return;

        try {
            const { error } = await window.supabaseClient
                .from('proposals')
                .delete()
                .eq('id', proposalId);

            if (error) throw error;

            this.renderView('voting');
            this.showToast('Proposal deleted successfully', 'success');
        } catch (error) {
            alert('Error deleting proposal: ' + error.message);
        }
    }

    showToast(message, type = 'info') {
        const colors = {
            success: '#10B981',
            error: '#ef4444',
            info: '#00CB97'
        };

        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 px-6 py-3 rounded-lg text-white font-semibold shadow-lg z-50';
        toast.style.backgroundColor = colors[type];
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize on load
const adminPanel = new AdminPanel();
document.addEventListener('DOMContentLoaded', () => {
    adminPanel.init();
});
