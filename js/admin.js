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
        // Sign out
        document.getElementById('admin-signout').addEventListener('click', async () => {
            try {
                await this.api.signOut();

                // Clear all stored data
                localStorage.clear();
                sessionStorage.clear();

                // Clear all cookies
                document.cookie.split(";").forEach(function(c) {
                    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });

                // Redirect using replace to prevent back button
                window.location.replace('index.html');
            } catch (error) {
                console.error('Logout error:', error);
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace('index.html');
            }
        });
    }

    switchView(view) {
        this.currentView = view;

        // Render view content
        this.renderView(view);
    }

    async renderView(view) {
        // Map view to container ID
        const containerMap = {
            'dashboard': null, // Dashboard updates stats directly
            'markets': 'admin-content-markets',
            'users': 'admin-content-users',
            'activity': 'admin-content-activity',
            'transactions': 'admin-content-transactions',
            'messages': 'admin-content-messages',
            'voting': 'admin-content-voting',
            'banners': 'admin-content-banners'
        };

        const containerId = containerMap[view];
        const container = containerId ? document.getElementById(containerId) : null;

        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <div>Loading...</div>
                </div>
            `;
        }

        try {
            switch (view) {
                case 'dashboard':
                    await this.renderDashboard();
                    break;
                case 'markets':
                    await this.renderMarkets(container);
                    break;
                case 'users':
                    await this.renderUsers(container);
                    break;
                case 'activity':
                    await this.renderActivity(container);
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
                case 'banners':
                    await this.renderBanners(container);
                    break;
            }
        } catch (error) {
            if (container) {
                container.innerHTML = `<div class="text-center py-12" style="color: var(--error);">Error: ${error.message}</div>`;
            }
        }
    }

    async renderDashboard() {
        const [marketStats, userStats, transactions, allMarkets, contactMessages, proposals] = await Promise.all([
            this.api.getMarketStats(),
            this.api.getUserStats(),
            this.api.getAllTransactions({ limit: 50 }), // Increased for activity feed
            this.api.getMarkets(),
            this.api.getContactMessages({ status: 'new' }),
            window.supabaseClient.from('proposals').select('*', { count: 'exact' }).eq('status', 'pending').then(r => r).catch(() => ({ count: 0 }))
        ]);

        // Fetch additional data for comprehensive activity feed
        // Note: Some queries may fail with 400 errors if foreign key relationships don't exist in the database
        // These are non-critical and won't break the dashboard functionality
        const [recentBets, recentMarkets, recentComments, recentUsers, recentProposals] = await Promise.all([
            window.supabaseClient
                .from('bets')
                .select('*, user:profiles!bets_user_id_fkey(username), market:markets(title)')
                .order('created_at', { ascending: false })
                .limit(20)
                .then(r => r)
                .catch(() => ({ data: [], error: null })),
            window.supabaseClient
                .from('markets')
                .select('*, creator:profiles!markets_created_by_fkey(username)')
                .order('created_at', { ascending: false })
                .limit(10)
                .then(r => r)
                .catch(() => ({ data: [], error: null })),
            window.supabaseClient
                .from('comments')
                .select('*, user:profiles!comments_user_id_fkey(username), market:markets(title)')
                .order('created_at', { ascending: false })
                .limit(15)
                .then(r => r)
                .catch(() => ({ data: [], error: null })),
            window.supabaseClient
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10)
                .then(r => r)
                .catch(() => ({ data: [], error: null })),
            window.supabaseClient
                .from('proposals')
                .select('*, user:profiles!proposals_user_id_fkey(username)')
                .order('created_at', { ascending: false })
                .limit(10)
                .then(r => r)
                .catch(() => ({ data: [], error: null }))
        ]);

        // Calculate additional stats
        const activeMarkets = allMarkets.filter(m => m.status === 'active').length;
        const unreadMessages = contactMessages?.length || 0;
        const pendingProposals = proposals?.count || 0;

        // Update stat cards
        const statUsers = document.getElementById('stat-users');
        const statMarkets = document.getElementById('stat-markets');
        const statTransactions = document.getElementById('stat-transactions');
        const statMessages = document.getElementById('stat-messages');

        if (statUsers) statUsers.textContent = userStats.total || 0;
        if (statMarkets) statMarkets.textContent = activeMarkets || 0;
        if (statTransactions) statTransactions.textContent = transactions?.length || 0;
        if (statMessages) statMessages.textContent = unreadMessages;

        // Update badges
        const unreadBadge = document.getElementById('unread-badge');
        const proposalsBadge = document.getElementById('pending-proposals-badge');

        if (unreadBadge) {
            if (unreadMessages > 0) {
                unreadBadge.textContent = unreadMessages;
                unreadBadge.classList.remove('hidden');
            } else {
                unreadBadge.classList.add('hidden');
            }
        }

        if (proposalsBadge) {
            if (pendingProposals > 0) {
                proposalsBadge.textContent = pendingProposals;
                proposalsBadge.classList.remove('hidden');
            } else {
                proposalsBadge.classList.add('hidden');
            }
        }

        // Combine all activities into unified feed
        const allActivities = [];

        // Add bets
        if (recentBets?.data) {
            recentBets.data.forEach(bet => {
                allActivities.push({
                    type: 'bet',
                    created_at: bet.created_at,
                    user: bet.user?.username || 'Unknown',
                    data: bet
                });
            });
        }

        // Add new markets
        if (recentMarkets?.data) {
            recentMarkets.data.forEach(market => {
                allActivities.push({
                    type: 'market_created',
                    created_at: market.created_at,
                    user: market.creator?.username || 'Unknown',
                    data: market
                });
            });
        }

        // Add comments
        if (recentComments?.data) {
            recentComments.data.forEach(comment => {
                allActivities.push({
                    type: 'comment',
                    created_at: comment.created_at,
                    user: comment.user?.username || 'Unknown',
                    data: comment
                });
            });
        }

        // Add new users
        if (recentUsers?.data) {
            recentUsers.data.forEach(user => {
                allActivities.push({
                    type: 'user_joined',
                    created_at: user.created_at,
                    user: user.username,
                    data: user
                });
            });
        }

        // Add proposals
        if (recentProposals?.data) {
            recentProposals.data.forEach(proposal => {
                allActivities.push({
                    type: 'proposal',
                    created_at: proposal.created_at,
                    user: proposal.user?.username || 'Unknown',
                    data: proposal
                });
            });
        }

        // Add transactions (payouts, deposits, withdrawals)
        if (transactions) {
            transactions.forEach(tx => {
                if (tx.type !== 'bet') { // Bets are already included from bets table
                    allActivities.push({
                        type: tx.type,
                        created_at: tx.created_at,
                        user: tx.user?.username || 'Unknown',
                        data: tx
                    });
                }
            });
        }

        // Sort by date (most recent first)
        allActivities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Limit to most recent 25 items
        const recentActivities = allActivities.slice(0, 25);

        // Render activity feed
        const activityList = document.getElementById('activity-list');
        if (activityList) {
            if (recentActivities.length === 0) {
                activityList.innerHTML = `
                    <div style="text-align: center; padding: 32px; color: var(--muted);">
                        <p>No recent activity</p>
                    </div>
                `;
            } else {
                activityList.innerHTML = recentActivities.map(activity => {
                    const date = new Date(activity.created_at);
                    const timeAgo = this.getTimeAgo(date);

                    let typeIcon, typeColor, typeText, description;

                    switch (activity.type) {
                        case 'bet':
                            typeIcon = 'fa-chart-line';
                            typeColor = '#00CB97';
                            typeText = 'Bet Placed';
                            description = `${activity.data.outcome?.toUpperCase()} on "${activity.data.market?.title || 'Unknown Market'}" - J$${parseFloat(activity.data.amount).toFixed(2)}`;
                            break;
                        case 'market_created':
                            typeIcon = 'fa-plus-circle';
                            typeColor = '#631BDD';
                            typeText = 'Market Created';
                            description = activity.data.title;
                            break;
                        case 'comment':
                            typeIcon = 'fa-comment';
                            typeColor = '#027A40';
                            typeText = 'Comment Posted';
                            description = `On "${activity.data.market?.title || 'Unknown Market'}"`;
                            break;
                        case 'user_joined':
                            typeIcon = 'fa-user-plus';
                            typeColor = '#F2C300';
                            typeText = 'New Member';
                            description = `@${activity.user} joined GoatMouth`;
                            break;
                        case 'proposal':
                            typeIcon = 'fa-lightbulb';
                            typeColor = '#00e5af';
                            typeText = 'Proposal Created';
                            description = activity.data.title || activity.data.market_question;
                            break;
                        case 'payout':
                            typeIcon = 'fa-trophy';
                            typeColor = '#F2C300';
                            typeText = 'Payout';
                            description = `Won J$${parseFloat(activity.data.amount).toFixed(2)}`;
                            break;
                        case 'deposit':
                            typeIcon = 'fa-arrow-down';
                            typeColor = '#027A40';
                            typeText = 'Deposit';
                            description = `+J$${parseFloat(activity.data.amount).toFixed(2)}`;
                            break;
                        case 'withdrawal':
                            typeIcon = 'fa-arrow-up';
                            typeColor = '#ef4444';
                            typeText = 'Withdrawal';
                            description = `-J$${parseFloat(Math.abs(activity.data.amount)).toFixed(2)}`;
                            break;
                        default:
                            typeIcon = 'fa-circle-info';
                            typeColor = '#9333ea';
                            typeText = activity.type;
                            description = activity.data.description || '';
                    }

                    return `
                        <div class="activity-item" style="border-left: 3px solid ${typeColor};">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <i class="fa-solid ${typeIcon}" style="color: ${typeColor}; font-size: 18px;"></i>
                                <div style="flex: 1;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                        <strong style="color: var(--text-primary);">${typeText}</strong>
                                        <span style="color: var(--muted); font-size: 13px;">${timeAgo}</span>
                                    </div>
                                    <div style="color: var(--muted); font-size: 14px; margin-bottom: 2px;">
                                        <i class="fa-solid fa-user" style="font-size: 12px; margin-right: 4px;"></i>
                                        ${activity.user}
                                    </div>
                                    ${description ? `
                                        <div style="color: var(--muted); font-size: 13px; margin-top: 4px;">
                                            ${description}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        // For backward compatibility, keep the old rendering code but skip it
        /* OLD DASHBOARD CODE REMOVED - Now using stat cards in HTML
        container.innerHTML = `
            <!-- Main Stats Grid (Clickable) -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <!-- Total Markets -->
                <div onclick="adminPanel.switchView('markets')" class="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-5 shadow-lg cursor-pointer hover:shadow-2xl hover:scale-105 transition-transform">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-blue-100 text-sm font-medium mb-1">Total Markets</p>
                            <p class="text-4xl font-bold text-white">${marketStats.total}</p>
                            <p class="text-blue-200 text-xs mt-1">Click to manage →</p>
                        </div>
                        <svg class="w-14 h-14 text-blue-200 opacity-30" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                        </svg>
                    </div>
                </div>

                <!-- Active Markets -->
                <div onclick="adminPanel.switchView('markets')" class="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-5 shadow-lg cursor-pointer hover:shadow-2xl hover:scale-105 transition-transform">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-green-100 text-sm font-medium mb-1">Active Markets</p>
                            <p class="text-4xl font-bold text-white">${activeMarkets}</p>
                            <p class="text-green-200 text-xs mt-1">Click to view →</p>
                        </div>
                        <svg class="w-14 h-14 text-green-200 opacity-30" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                </div>

                <!-- Total Users -->
                <div onclick="adminPanel.switchView('users')" class="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-5 shadow-lg cursor-pointer hover:shadow-2xl hover:scale-105 transition-transform">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-purple-100 text-sm font-medium mb-1">Total Users</p>
                            <p class="text-4xl font-bold text-white">${userStats.total}</p>
                            <p class="text-purple-200 text-xs mt-1">Click to manage →</p>
                        </div>
                        <svg class="w-14 h-14 text-purple-200 opacity-30" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                        </svg>
                    </div>
                </div>

                <!-- Total Volume -->
                <div onclick="adminPanel.switchView('transactions')" class="bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-xl p-5 shadow-lg cursor-pointer hover:shadow-2xl hover:scale-105 transition-transform">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-yellow-100 text-sm font-medium mb-1">Total Volume</p>
                            <p class="text-4xl font-bold text-white">J$${(marketStats.totalVolume/1000).toFixed(1)}K</p>
                            <p class="text-yellow-200 text-xs mt-1">Click to view →</p>
                        </div>
                        <svg class="w-14 h-14 text-yellow-200 opacity-30" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                </div>
            </div>

            <!-- Quick Actions Grid -->
            <div class="mb-6">
                <h3 class="text-lg font-bold mb-3 flex items-center gap-2">
                    <svg class="w-5 h-5" style="color: #00CB97;" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/>
                    </svg>
                    Quick Actions
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <!-- Messages -->
                    <div onclick="adminPanel.switchView('messages')" class="bg-gray-800 rounded-lg p-4 border border-gray-700 cursor-pointer hover:border-green-500 hover:shadow-lg transition">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-3">
                                <div class="p-2 rounded-lg" style="background-color: rgba(0, 203, 151, 0.1);">
                                    <svg class="h-5 w-5" style="color: #00CB97;" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                                    </svg>
                                </div>
                                <span class="font-semibold">Messages</span>
                            </div>
                            ${unreadMessages > 0 ? `
                                <span class="px-2 py-1 text-xs rounded-full font-bold" style="background-color: #00CB97; color: white;">${unreadMessages}</span>
                            ` : ''}
                        </div>
                        <p class="text-sm text-gray-400">Manage contact messages</p>
                    </div>

                    <!-- Voting -->
                    <div onclick="adminPanel.switchView('voting')" class="bg-gray-800 rounded-lg p-4 border border-gray-700 cursor-pointer hover:border-purple-500 hover:shadow-lg transition">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-3">
                                <div class="p-2 rounded-lg" style="background-color: rgba(99, 27, 221, 0.1);">
                                    <svg class="h-5 w-5" style="color: #631BDD;" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                                    </svg>
                                </div>
                                <span class="font-semibold">Voting</span>
                            </div>
                            ${pendingProposals > 0 ? `
                                <span class="px-2 py-1 text-xs rounded-full font-bold" style="background-color: #F2C300; color: black;">${pendingProposals}</span>
                            ` : ''}
                        </div>
                        <p class="text-sm text-gray-400">Manage proposals & votes</p>
                    </div>

                    <!-- Banners -->
                    <div onclick="adminPanel.switchView('banners')" class="bg-gray-800 rounded-lg p-4 border border-gray-700 cursor-pointer hover:border-blue-500 hover:shadow-lg transition">
                        <div class="flex items-center gap-3 mb-2">
                            <div class="p-2 rounded-lg" style="background-color: rgba(59, 130, 246, 0.1);">
                                <svg class="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                            <span class="font-semibold">Banners</span>
                        </div>
                        <p class="text-sm text-gray-400">Manage homepage banners</p>
                    </div>

                    <!-- Transactions -->
                    <div onclick="adminPanel.switchView('transactions')" class="bg-gray-800 rounded-lg p-4 border border-gray-700 cursor-pointer hover:border-yellow-500 hover:shadow-lg transition">
                        <div class="flex items-center gap-3 mb-2">
                            <div class="p-2 rounded-lg" style="background-color: rgba(234, 179, 8, 0.1);">
                                <svg class="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                            <span class="font-semibold">Transactions</span>
                        </div>
                        <p class="text-sm text-gray-400">View all transactions</p>
                    </div>

                    <!-- Markets -->
                    <div onclick="adminPanel.switchView('markets')" class="bg-gray-800 rounded-lg p-4 border border-gray-700 cursor-pointer hover:border-green-500 hover:shadow-lg transition">
                        <div class="flex items-center gap-3 mb-2">
                            <div class="p-2 rounded-lg" style="background-color: rgba(0, 203, 151, 0.1);">
                                <svg class="h-5 w-5" style="color: #00CB97;" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                                </svg>
                            </div>
                            <span class="font-semibold">Markets</span>
                        </div>
                        <p class="text-sm text-gray-400">Create & manage markets</p>
                    </div>

                    <!-- Users -->
                    <div onclick="adminPanel.switchView('users')" class="bg-gray-800 rounded-lg p-4 border border-gray-700 cursor-pointer hover:border-purple-500 hover:shadow-lg transition">
                        <div class="flex items-center gap-3 mb-2">
                            <div class="p-2 rounded-lg" style="background-color: rgba(147, 51, 234, 0.1);">
                                <svg class="h-5 w-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                                </svg>
                            </div>
                            <span class="font-semibold">Users</span>
                        </div>
                        <p class="text-sm text-gray-400">Manage user accounts</p>
                    </div>
                </div>
            </div>

            <!-- Charts Row -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <!-- Market Distribution Chart -->
                <div class="bg-gray-800 rounded-lg p-5 shadow-lg">
                    <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
                        <svg class="w-5 h-5" style="color: #00CB97;" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                        </svg>
                        Market Status Distribution
                    </h3>
                    <div style="position: relative; height: 250px;">
                        <canvas id="marketStatusChart"></canvas>
                    </div>
                </div>

                <!-- Volume by Category Chart -->
                <div class="bg-gray-800 rounded-lg p-5 shadow-lg">
                    <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
                        <svg class="w-5 h-5" style="color: #00CB97;" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                        </svg>
                        Volume by Category
                    </h3>
                    <div style="position: relative; height: 250px;">
                        <canvas id="categoryVolumeChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Recent Transactions -->
            <div class="bg-gray-800 rounded-lg p-5 shadow-lg">
                <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
                    <svg class="w-5 h-5" style="color: #00CB97;" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                    </svg>
                    Recent Transactions
                </h3>
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
                            ${transactions.length > 0 ? transactions.map(tx => `
                                <tr>
                                    <td>${tx.profiles?.username || 'Unknown'}</td>
                                    <td><span class="badge badge-${tx.type}">${tx.type}</span></td>
                                    <td class="font-semibold">J$${parseFloat(tx.amount).toFixed(2)}</td>
                                    <td class="text-sm text-gray-400">${new Date(tx.created_at).toLocaleString()}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="4" class="text-center text-gray-400">No transactions yet</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        */
        // OLD DASHBOARD CODE END - Stats now update directly in HTML
    }

    initDashboardCharts(activeMarkets, closedMarkets, resolvedMarkets, allMarkets) {
        // Market Status Distribution Pie Chart
        const statusCtx = document.getElementById('marketStatusChart');
        if (statusCtx) {
            new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Active', 'Closed', 'Resolved'],
                    datasets: [{
                        data: [activeMarkets, closedMarkets, resolvedMarkets],
                        backgroundColor: ['#027A40', '#FFC107', '#631BDD'],
                        borderColor: '#1f2937',
                        borderWidth: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#9ca3af', font: { size: 12 } }
                        }
                    }
                }
            });
        }

        // Volume by Category Bar Chart
        const categories = {};
        allMarkets.forEach(market => {
            const cat = market.category || 'Other';
            if (!categories[cat]) categories[cat] = 0;
            categories[cat] += parseFloat(market.total_volume || 0);
        });

        const categoryCtx = document.getElementById('categoryVolumeChart');
        if (categoryCtx) {
            new Chart(categoryCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(categories),
                    datasets: [{
                        label: 'Volume ($)',
                        data: Object.values(categories),
                        backgroundColor: '#027A40',
                        borderColor: '#00CB97',
                        borderWidth: 2,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: '#9ca3af' },
                            grid: { color: '#374151' }
                        },
                        x: {
                            ticks: { color: '#9ca3af' },
                            grid: { display: false }
                        }
                    }
                }
            });
        }
    }

    async renderMarkets(container) {
        const markets = await this.api.getMarkets();

        container.innerHTML = `
            <div class="flex justify-between items-center mb-6" style="flex-wrap: wrap; gap: 12px;">
                <h3 class="text-xl font-bold" style="color: var(--fg);">All Markets (${markets.length})</h3>
                <button onclick="adminPanel.showCreateMarketModal()" class="btn" style="background: var(--accent); color: white;">
                    <i class="fa-solid fa-plus"></i> Create Market
                </button>
            </div>

            <!-- Markets Grid View -->
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
                ${markets.length > 0 ? markets.map(market => `
                    <div class="card" style="padding: 0; overflow: hidden; transition: all 0.3s ease; cursor: pointer;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.3)';" onmouseout="this.style.transform=''; this.style.boxShadow='';">
                        <!-- Market Image -->
                        ${market.image_url ? `
                            <div style="width: 100%; height: 180px; overflow: hidden; background: var(--bg3);">
                                <img src="${market.image_url}" alt="${this.escapeHtml(market.title)}"
                                     style="width: 100%; height: 100%; object-fit: cover;"
                                     onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\'display: flex; align-items: center; justify-content: center; height: 100%; color: var(--muted);\'><i class=\'fa-solid fa-image\' style=\'font-size: 48px; opacity: 0.3;\'></i></div>';">
                            </div>
                        ` : `
                            <div style="width: 100%; height: 180px; background: linear-gradient(135deg, var(--bg3) 0%, var(--bg2) 100%); display: flex; align-items: center; justify-content: center;">
                                <i class="fa-solid fa-chart-simple" style="font-size: 48px; color: var(--accent); opacity: 0.3;"></i>
                            </div>
                        `}

                        <!-- Market Info -->
                        <div style="padding: 16px;">
                            <h3 style="color: var(--fg); font-size: 16px; font-weight: 700; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.4;" title="${this.escapeHtml(market.title)}">
                                ${this.escapeHtml(market.title)}
                            </h3>

                            <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                                <span class="badge badge-${market.status}">${market.status}</span>
                                <span style="color: var(--muted); font-size: 12px;">${market.category || 'Uncategorized'}</span>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; padding: 12px; background: var(--bg3); border-radius: 6px;">
                                <div>
                                    <div style="font-size: 11px; color: var(--muted); text-transform: uppercase;">Volume</div>
                                    <div style="font-size: 16px; font-weight: 700; color: var(--accent);">J$${parseFloat(market.total_volume || 0).toFixed(0)}</div>
                                </div>
                                <div>
                                    <div style="font-size: 11px; color: var(--muted); text-transform: uppercase;">End Date</div>
                                    <div style="font-size: 12px; font-weight: 600; color: var(--fg);">${new Date(market.end_date).toLocaleDateString()}</div>
                                </div>
                            </div>

                            <!-- Actions -->
                            <div style="display: flex; gap: 8px;">
                                <button onclick="event.stopPropagation(); adminPanel.showEditMarketModal('${market.id}')" class="btn" style="flex: 1; background: var(--accent); color: white; padding: 8px 12px; font-size: 12px;" title="Edit">
                                    <i class="fa-solid fa-edit"></i> Edit
                                </button>
                                ${market.status === 'active' ? `
                                    <button onclick="event.stopPropagation(); adminPanel.showResolveMarketModal('${market.id}')" class="btn" style="background: var(--info); color: white; padding: 8px; font-size: 12px; min-width: 40px;" title="Resolve">
                                        <i class="fa-solid fa-check"></i>
                                    </button>
                                ` : ''}
                                <button onclick="event.stopPropagation(); adminPanel.deleteMarket('${market.id}')" class="btn danger" style="background: var(--error); color: white; padding: 8px; font-size: 12px; min-width: 40px;" title="Delete">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('') : `
                    <div class="card" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                        <i class="fa-solid fa-chart-simple" style="font-size: 64px; opacity: 0.2; color: var(--muted); display: block; margin-bottom: 16px;"></i>
                        <p style="color: var(--muted); font-size: 16px;">No markets found</p>
                    </div>
                `}
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
            <div class="stats-grid mb-6">
                <div class="stat-card">
                    <h3>Total Users</h3>
                    <div class="value">${totalUsers}</div>
                    <div class="label">Registered users</div>
                </div>

                <div class="stat-card">
                    <h3>Admins</h3>
                    <div class="value" style="color: var(--info);">${adminCount}</div>
                    <div class="label">Admin accounts</div>
                </div>

                <div class="stat-card">
                    <h3>Total Balance</h3>
                    <div class="value" style="color: var(--warning);">J$${totalBalance.toFixed(2)}</div>
                    <div class="label">Cumulative balance</div>
                </div>

                <div class="stat-card">
                    <h3>Avg Balance</h3>
                    <div class="value">J$${avgBalance.toFixed(2)}</div>
                    <div class="label">Per user</div>
                </div>
            </div>

            <!-- Search and Filter -->
            <div class="mb-6 flex gap-4" style="flex-wrap: wrap;">
                <div class="flex-1" style="min-width: 250px;">
                    <input type="text" id="user-search" placeholder="Search by username or email..." style="width: 100%;">
                </div>
                <select id="role-filter" style="min-width: 150px;">
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
            return `<div class="text-center py-12" style="color: var(--muted);">No users found</div>`;
        }

        return `
            <div class="card">
                <div class="table-container">
                    <table style="width: 100%;">
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
                            <tr class="hover:bg-gray-750 transition user-row" data-user-id="${user.id}" onclick="if(window.innerWidth <= 768) adminPanel.showMobileUserActions('${user.id}', '${this.escapeHtml(user.username)}', '${user.role}', ${user.balance}, ${user.id === this.currentProfile.id})">
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
                                    <span class="font-bold" style="color: #00CB97;">J$${parseFloat(user.balance).toFixed(2)}</span>
                                </td>
                                <td class="px-6 py-4">
                                    <span class="text-sm text-gray-400">${new Date(user.created_at).toLocaleDateString()}</span>
                                </td>
                                <td class="px-6 py-4">
                                    <div style="display: flex; gap: 6px; align-items: center;">
                                        <!-- View Details -->
                                        <button onclick="adminPanel.showUserDetailsModal('${user.id}')"
                                            class="user-action-btn"
                                            style="background: var(--accent); color: white;"
                                            title="View Details">
                                            <i class="fa-solid fa-eye"></i>
                                        </button>

                                        ${user.id !== this.currentProfile.id ? `
                                            <!-- Edit Balance -->
                                            <button onclick="adminPanel.showEditBalanceModal('${user.id}', ${user.balance})"
                                                class="user-action-btn"
                                                style="background: #FFC107; color: #1a1a1a;"
                                                title="Edit Balance">
                                                <i class="fa-solid fa-coins"></i>
                                            </button>

                                            <!-- Toggle Role (Promote/Demote) -->
                                            <button onclick="adminPanel.toggleUserRole('${user.id}', '${user.role}')"
                                                class="user-action-btn"
                                                style="background: ${user.role === 'admin' ? '#3B82F6' : '#631BDD'}; color: white;"
                                                title="${user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}">
                                                <i class="fa-solid ${user.role === 'admin' ? 'fa-user' : 'fa-user-shield'}"></i>
                                            </button>

                                            <!-- More Actions Dropdown -->
                                            <div style="position: relative; display: inline-block;">
                                                <button onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle('show-dropdown')"
                                                    class="user-action-btn"
                                                    style="background: var(--bg3); color: var(--fg);"
                                                    title="More Actions">
                                                    <i class="fa-solid fa-ellipsis-vertical"></i>
                                                </button>
                                                <div class="user-dropdown-menu">
                                                    <button onclick="adminPanel.sendMessageToUser('${user.id}', '${this.escapeHtml(user.username)}'); this.closest('.user-dropdown-menu').classList.remove('show-dropdown')">
                                                        <i class="fa-solid fa-envelope"></i>
                                                        Send Message
                                                    </button>
                                                    <button onclick="adminPanel.deleteUser('${user.id}', '${this.escapeHtml(user.username)}'); this.closest('.user-dropdown-menu').classList.remove('show-dropdown')"
                                                        style="color: #EF4444;">
                                                        <i class="fa-solid fa-trash"></i>
                                                        Delete User
                                                    </button>
                                                </div>
                                            </div>
                                        ` : '<span style="color: var(--muted); font-size: 12px; font-style: italic;">Current User</span>'}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
            </div>
        `;
    }

    getUserColor(username) {
        const colors = ['#1a4d2e', '#4caf50', '#ff9800', '#2196f3', '#10B981', '#F59E0B', '#8B5CF6'];
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    showMobileUserActions(userId, username, role, balance, isCurrentUser) {
        // Prevent default row click behavior
        event.stopPropagation();

        // Remove any existing mobile action modals
        const existingModal = document.querySelector('.mobile-user-actions-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'mobile-user-actions-modal';
        modal.innerHTML = `
            <div class="mobile-user-actions-overlay" onclick="this.parentElement.remove()"></div>
            <div class="mobile-user-actions-content">
                <div class="mobile-user-actions-header">
                    <div class="mobile-user-avatar" style="background-color: ${this.getUserColor(username)};">
                        ${username.charAt(0).toUpperCase()}
                    </div>
                    <div class="mobile-user-info">
                        <h3>${this.escapeHtml(username)}</h3>
                        <p>${role === 'admin' ? 'Administrator' : 'User'} • J$${parseFloat(balance).toFixed(2)}</p>
                    </div>
                    <button class="mobile-user-actions-close" onclick="this.closest('.mobile-user-actions-modal').remove()">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div class="mobile-user-actions-list">
                    ${!isCurrentUser ? `
                        <button class="mobile-user-action-item" onclick="adminPanel.showUserDetailsModal('${userId}'); document.querySelector('.mobile-user-actions-modal').remove();">
                            <div class="mobile-user-action-icon" style="background: var(--accent);">
                                <i class="fa-solid fa-eye"></i>
                            </div>
                            <div class="mobile-user-action-text">
                                <strong>View Details</strong>
                                <span>See full user information</span>
                            </div>
                            <i class="fa-solid fa-chevron-right mobile-user-action-arrow"></i>
                        </button>

                        <button class="mobile-user-action-item" onclick="adminPanel.showEditBalanceModal('${userId}', ${balance}); document.querySelector('.mobile-user-actions-modal').remove();">
                            <div class="mobile-user-action-icon" style="background: #FFC107;">
                                <i class="fa-solid fa-coins"></i>
                            </div>
                            <div class="mobile-user-action-text">
                                <strong>Edit Balance</strong>
                                <span>Update user's balance</span>
                            </div>
                            <i class="fa-solid fa-chevron-right mobile-user-action-arrow"></i>
                        </button>

                        <button class="mobile-user-action-item" onclick="adminPanel.toggleUserRole('${userId}', '${role}'); document.querySelector('.mobile-user-actions-modal').remove();">
                            <div class="mobile-user-action-icon" style="background: ${role === 'admin' ? '#3B82F6' : '#631BDD'};">
                                <i class="fa-solid ${role === 'admin' ? 'fa-user' : 'fa-user-shield'}"></i>
                            </div>
                            <div class="mobile-user-action-text">
                                <strong>${role === 'admin' ? 'Demote to User' : 'Promote to Admin'}</strong>
                                <span>Change user role</span>
                            </div>
                            <i class="fa-solid fa-chevron-right mobile-user-action-arrow"></i>
                        </button>

                        <button class="mobile-user-action-item" onclick="adminPanel.sendMessageToUser('${userId}', '${this.escapeHtml(username)}'); document.querySelector('.mobile-user-actions-modal').remove();">
                            <div class="mobile-user-action-icon" style="background: #3B82F6;">
                                <i class="fa-solid fa-envelope"></i>
                            </div>
                            <div class="mobile-user-action-text">
                                <strong>Send Message</strong>
                                <span>Send a message to this user</span>
                            </div>
                            <i class="fa-solid fa-chevron-right mobile-user-action-arrow"></i>
                        </button>

                        <button class="mobile-user-action-item danger" onclick="adminPanel.deleteUser('${userId}', '${this.escapeHtml(username)}'); document.querySelector('.mobile-user-actions-modal').remove();">
                            <div class="mobile-user-action-icon" style="background: #EF4444;">
                                <i class="fa-solid fa-trash"></i>
                            </div>
                            <div class="mobile-user-action-text">
                                <strong>Delete User</strong>
                                <span>Permanently remove this user</span>
                            </div>
                            <i class="fa-solid fa-chevron-right mobile-user-action-arrow"></i>
                        </button>
                    ` : `
                        <div class="mobile-user-action-item disabled">
                            <div class="mobile-user-action-icon" style="background: var(--accent);">
                                <i class="fa-solid fa-user"></i>
                            </div>
                            <div class="mobile-user-action-text">
                                <strong>Current User</strong>
                                <span>You cannot modify your own account</span>
                            </div>
                        </div>
                    `}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Trigger animation
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
    }

    async showUserDetailsModal(userId) {
        try {
            const [profile, positions, transactions] = await Promise.all([
                this.api.getProfile(userId),
                this.api.getUserPositions(userId),
                this.api.getUserTransactions(userId)
            ]);

            const modal = document.createElement('div');
            modal.className = 'admin-modal-overlay';
            modal.innerHTML = `
                <div class="bg-gray-800 rounded-2xl border-2 border-gray-700 p-8 max-w-4xl w-full my-8">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-3xl font-bold" style="color: #00CB97;">User Details</h2>
                        <button onclick="this.closest('.admin-modal-overlay').remove()" class="text-gray-400 hover:text-white">
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
                            <p class="text-lg font-bold" style="color: #00CB97;">J$${parseFloat(profile.balance).toFixed(2)}</p>
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
                                                <p class="text-sm text-gray-400">${pos.outcome} • ${pos.shares} shares @ J$${parseFloat(pos.avg_price).toFixed(2)}</p>
                                            </div>
                                            <p class="font-bold" style="color: #00CB97;">J$${(pos.shares * parseFloat(pos.avg_price)).toFixed(2)}</p>
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
                                                ${parseFloat(tx.amount) >= 0 ? '+' : ''}J$${parseFloat(tx.amount).toFixed(2)}
                                            </p>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : '<p class="text-gray-400 text-sm">No transactions</p>'}
                        </div>
                    </div>

                    <div class="mt-6 flex justify-end">
                        <button onclick="this.closest('.admin-modal-overlay').remove()"
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
        modal.className = 'admin-modal-overlay';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-2xl border-2 border-gray-700 p-8 max-w-md w-full">
                <h2 class="text-2xl font-bold mb-4" style="color: #FFC107;">Edit User Balance</h2>
                <p class="text-gray-400 mb-6">Current balance: <span class="font-bold" style="color: #00CB97;">J$${parseFloat(currentBalance).toFixed(2)}</span></p>

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
                        <button type="button" onclick="this.closest('.admin-modal-overlay').remove()"
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
        modal.className = 'admin-modal-overlay';
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
                        <button type="button" onclick="this.closest('.admin-modal-overlay').remove()"
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

    showDeleteUserModal(userId, username) {
        // Close mobile modal if open
        const mobileModal = document.querySelector('.mobile-user-actions-modal');
        if (mobileModal) {
            mobileModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'delete-user-modal';
        modal.innerHTML = `
            <div class="delete-user-overlay" onclick="this.parentElement.remove()"></div>
            <div class="delete-user-content">
                <div class="delete-user-header">
                    <div class="delete-user-icon">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <h2>Delete User Account</h2>
                    <p>This action cannot be undone</p>
                </div>

                <div class="delete-user-body">
                    <div class="delete-user-info">
                        <div class="delete-user-avatar" style="background-color: ${this.getUserColor(username)};">
                            ${username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3>${this.escapeHtml(username)}</h3>
                            <p>User Account</p>
                        </div>
                    </div>

                    <div class="delete-warning-box">
                        <h4><i class="fa-solid fa-circle-exclamation"></i> Warning</h4>
                        <p>Deleting this user will permanently remove:</p>
                        <ul>
                            <li><i class="fa-solid fa-user"></i> User account and profile</li>
                            <li><i class="fa-solid fa-chart-line"></i> All market positions</li>
                            <li><i class="fa-solid fa-money-bill-transfer"></i> All transaction history</li>
                            <li><i class="fa-solid fa-comments"></i> All comments and activity</li>
                            <li><i class="fa-solid fa-database"></i> All associated data</li>
                        </ul>
                    </div>

                    <div class="delete-confirmation">
                        <label for="delete-confirm-input">
                            Type <strong>${this.escapeHtml(username)}</strong> to confirm deletion:
                        </label>
                        <input
                            type="text"
                            id="delete-confirm-input"
                            placeholder="Enter username"
                            autocomplete="off"
                            spellcheck="false"
                        >
                        <div id="delete-error-msg" class="delete-error-msg" style="display: none;">
                            <i class="fa-solid fa-circle-xmark"></i> Username does not match
                        </div>
                    </div>
                </div>

                <div class="delete-user-footer">
                    <button class="delete-cancel-btn" onclick="this.closest('.delete-user-modal').remove()">
                        <i class="fa-solid fa-xmark"></i>
                        Cancel
                    </button>
                    <button class="delete-confirm-btn" id="delete-confirm-btn" disabled>
                        <i class="fa-solid fa-trash"></i>
                        Delete User
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Trigger animation
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);

        // Handle input validation
        const input = modal.querySelector('#delete-confirm-input');
        const confirmBtn = modal.querySelector('#delete-confirm-btn');
        const errorMsg = modal.querySelector('#delete-error-msg');

        input.addEventListener('input', () => {
            if (input.value === username) {
                confirmBtn.disabled = false;
                confirmBtn.classList.add('enabled');
                errorMsg.style.display = 'none';
            } else {
                confirmBtn.disabled = true;
                confirmBtn.classList.remove('enabled');
            }
        });

        // Handle deletion
        confirmBtn.addEventListener('click', async () => {
            if (input.value !== username) {
                errorMsg.style.display = 'flex';
                input.classList.add('error');
                return;
            }

            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';

            try {
                await this.api.deleteUser(userId);
                modal.remove();
                this.renderView('users');
                this.showSuccessToast(`User "${username}" has been deleted`);
            } catch (error) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Delete User';
                errorMsg.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${error.message}`;
                errorMsg.style.display = 'flex';
            }
        });

        // Focus input
        setTimeout(() => input.focus(), 300);
    }

    showSuccessToast(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = 'success-toast';
        toast.innerHTML = `
            <i class="fa-solid fa-circle-check"></i>
            ${message}
        `;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async deleteUser(userId, username) {
        // Show modal instead of using confirm/prompt
        this.showDeleteUserModal(userId, username);
    }

    showAdminProfileModal() {
        const profile = this.currentProfile;
        if (!profile) return;

        const modal = document.createElement('div');
        modal.className = 'admin-modal-overlay';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-2xl border-2 border-gray-700 max-w-md w-full">
                <!-- Header -->
                <div class="p-6 border-b-2 border-gray-700" style="background: linear-gradient(135deg, var(--accent) 0%, #0f3a23 100%);">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-2xl font-bold text-white">
                            <i class="fa-solid fa-user-shield"></i> Admin Profile
                        </h2>
                        <button onclick="this.closest('.admin-modal-overlay').remove()" class="text-white hover:text-gray-300 transition">
                            <i class="fa-solid fa-xmark text-2xl"></i>
                        </button>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="w-20 h-20 rounded-full flex items-center justify-center font-bold text-white text-3xl" style="background-color: ${this.getUserColor(profile.username)};">
                            ${profile.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 class="text-xl font-bold text-white">${this.escapeHtml(profile.username)}</h3>
                            <p class="text-sm text-gray-200">Administrator</p>
                        </div>
                    </div>
                </div>

                <!-- Body -->
                <div class="p-6 space-y-4">
                    <!-- Email -->
                    <div class="bg-gray-900 rounded-xl p-4">
                        <div class="flex items-center gap-3 mb-2">
                            <i class="fa-solid fa-envelope text-gray-400"></i>
                            <span class="text-sm text-gray-400 font-semibold uppercase">Email</span>
                        </div>
                        <p class="text-white font-medium">${this.escapeHtml(profile.email || 'Not set')}</p>
                    </div>

                    <!-- User ID -->
                    <div class="bg-gray-900 rounded-xl p-4">
                        <div class="flex items-center gap-3 mb-2">
                            <i class="fa-solid fa-id-card text-gray-400"></i>
                            <span class="text-sm text-gray-400 font-semibold uppercase">User ID</span>
                        </div>
                        <p class="text-white font-mono text-sm">${profile.id}</p>
                    </div>

                    <!-- Balance -->
                    <div class="bg-gray-900 rounded-xl p-4">
                        <div class="flex items-center gap-3 mb-2">
                            <i class="fa-solid fa-wallet text-gray-400"></i>
                            <span class="text-sm text-gray-400 font-semibold uppercase">Balance</span>
                        </div>
                        <p class="text-2xl font-bold" style="color: #00CB97;">J$${parseFloat(profile.balance || 0).toFixed(2)}</p>
                    </div>

                    <!-- Role -->
                    <div class="bg-gray-900 rounded-xl p-4">
                        <div class="flex items-center gap-3 mb-2">
                            <i class="fa-solid fa-shield-halved text-gray-400"></i>
                            <span class="text-sm text-gray-400 font-semibold uppercase">Role</span>
                        </div>
                        <span class="px-4 py-2 rounded-lg font-bold text-sm inline-block" style="background: #631BDD; color: white;">
                            <i class="fa-solid fa-user-shield"></i> ADMINISTRATOR
                        </span>
                    </div>

                    <!-- Account Created -->
                    <div class="bg-gray-900 rounded-xl p-4">
                        <div class="flex items-center gap-3 mb-2">
                            <i class="fa-solid fa-calendar-plus text-gray-400"></i>
                            <span class="text-sm text-gray-400 font-semibold uppercase">Account Created</span>
                        </div>
                        <p class="text-white font-medium">${new Date(profile.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</p>
                    </div>
                </div>

                <!-- Footer -->
                <div class="p-6 border-t-2 border-gray-700 flex gap-3">
                    <button onclick="window.location.href='index.html'" class="flex-1 px-4 py-3 rounded-xl font-semibold transition" style="background: var(--accent); color: white;">
                        <i class="fa-solid fa-home"></i> Go to App
                    </button>
                    <button onclick="document.getElementById('admin-signout').click(); this.closest('.admin-modal-overlay').remove();" class="flex-1 px-4 py-3 rounded-xl font-semibold border-2 transition" style="border-color: #EF4444; color: #EF4444;">
                        <i class="fa-solid fa-right-from-bracket"></i> Sign Out
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    async renderTransactions(container) {
        const transactions = await this.api.getAllTransactions({ limit: 100 });

        container.innerHTML = `
            <div class="bg-gray-800 rounded-lg overflow-hidden">
                <div class="table-container">
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
                                    <td class="font-semibold">J$${parseFloat(tx.amount).toFixed(2)}</td>
                                    <td class="text-sm text-gray-400">J$${parseFloat(tx.balance_after).toFixed(2)}</td>
                                    <td class="text-sm text-gray-400">${new Date(tx.created_at).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
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
                            <option value="Jamaican Parliament">Jamaican Parliament</option>
                            <option value="Dancehall">Dancehall</option>
                            <option value="Reggae">Reggae</option>
                            <option value="Jamaica Sports">Jamaica Sports</option>
                            <option value="Caribbean Cricket">Caribbean Cricket</option>
                            <option value="Jamaica Business">Jamaica Business</option>
                            <option value="JMD & Crypto">JMD & Crypto</option>
                            <option value="Jamaican Culture">Jamaican Culture</option>
                            <option value="Caribbean News">Caribbean News</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Market Image (optional)</label>

                        <!-- Dimension Guide for Markets -->
                        <div class="bg-gray-700 border-l-4 border-green-500 p-3 mb-3 rounded text-sm">
                            <div class="flex items-start gap-2">
                                <svg class="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <div>
                                    <p class="text-green-300 font-semibold mb-1">Recommended Image Dimensions</p>
                                    <div class="grid grid-cols-3 gap-2 text-xs mb-2">
                                        <div class="bg-gray-800 px-2 py-1.5 rounded">
                                            <p class="text-gray-400">Desktop</p>
                                            <p class="text-white font-bold">800×400px</p>
                                        </div>
                                        <div class="bg-gray-800 px-2 py-1.5 rounded">
                                            <p class="text-gray-400">Mobile</p>
                                            <p class="text-white font-bold">600×300px</p>
                                        </div>
                                        <div class="bg-gray-800 px-2 py-1.5 rounded">
                                            <p class="text-gray-400">Min Size</p>
                                            <p class="text-white font-bold">400×200px</p>
                                        </div>
                                    </div>
                                    <p class="text-gray-400 text-xs"><strong class="text-green-400">Tip:</strong> Use 2:1 aspect ratio. Images below 400px wide may appear pixelated.</p>
                                </div>
                            </div>
                        </div>

                        <div class="space-y-2">
                            <div id="adminMarketImagePreview" class="relative w-full h-48 bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 overflow-hidden">
                                <span>No image selected</span>
                            </div>
                            <input type="file" id="adminMarketImageInput" accept="image/*"
                                   class="block w-full text-sm text-gray-400
                                   file:mr-4 file:py-2 file:px-4
                                   file:rounded file:border-0
                                   file:text-sm file:font-semibold
                                   file:bg-green-600 file:text-white
                                   hover:file:bg-green-700 file:cursor-pointer cursor-pointer">
                            <div class="flex items-start gap-2 text-xs text-gray-400">
                                <svg class="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <span>Max file size: 5MB. Dimensions will be validated after upload. Higher resolution = better quality.</span>
                            </div>
                        </div>
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

        // Handle image preview
        const imageInput = document.getElementById('adminMarketImageInput');
        const imagePreview = document.getElementById('adminMarketImagePreview');

        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size must be less than 5MB');
                e.target.value = '';
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                e.target.value = '';
                return;
            }

            // Show preview with dimension analysis
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const width = img.width;
                    const height = img.height;
                    const aspectRatio = (width / height).toFixed(2);
                    const fileSize = (file.size / 1024 / 1024).toFixed(2);

                    // Quality check
                    let qualityStatus = '';
                    let statusColor = 'text-yellow-400';
                    let statusIcon = 'ℹ';

                    if (width >= 800 && height >= 400) {
                        qualityStatus = 'Excellent quality';
                        statusColor = 'text-green-400';
                        statusIcon = '✓';
                    } else if (width >= 600 && height >= 300) {
                        qualityStatus = 'Good quality';
                        statusColor = 'text-green-400';
                        statusIcon = '✓';
                    } else if (width >= 400 && height >= 200) {
                        qualityStatus = 'Acceptable quality';
                        statusColor = 'text-yellow-400';
                        statusIcon = '⚠';
                    } else {
                        qualityStatus = 'May appear pixelated';
                        statusColor = 'text-red-400';
                        statusIcon = '⚠';
                    }

                    // Aspect ratio check
                    const targetRatio = 2.0; // 2:1 ratio
                    const ratioDiff = Math.abs(aspectRatio - targetRatio);
                    let ratioWarning = '';
                    if (ratioDiff > 0.3) {
                        ratioWarning = '<div class="text-orange-400 text-xs mt-1">⚠ Image may be cropped or distorted</div>';
                    }

                    imagePreview.innerHTML = `
                        <img src="${event.target.result}" class="w-full h-full object-cover">
                        <div class="absolute bottom-2 right-2 bg-black bg-opacity-90 px-3 py-2 rounded-lg text-xs space-y-1 max-w-xs">
                            <div class="text-white font-bold">${width} × ${height}px</div>
                            <div class="text-gray-400">Ratio: ${aspectRatio}:1 • ${fileSize}MB</div>
                            <div class="${statusColor} font-semibold">${statusIcon} ${qualityStatus}</div>
                            ${ratioWarning}
                        </div>
                    `;
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });

        document.getElementById('create-market-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;

            try {
                // Show loading
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<div class="spinner-glow inline-block w-4 h-4 mr-2"></div>Creating...';

                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData);
                let imageUrl = null;

                // Upload image if selected
                if (imageInput.files.length > 0) {
                    const file = imageInput.files[0];
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                    const { data: uploadData, error: uploadError } = await this.api.db.storage
                        .from('market-images')
                        .upload(fileName, file, {
                            cacheControl: '3600',
                            upsert: false
                        });

                    if (uploadError) throw uploadError;

                    // Get public URL
                    const { data: urlData } = this.api.db.storage
                        .from('market-images')
                        .getPublicUrl(fileName);

                    imageUrl = urlData.publicUrl;
                }

                await this.api.createMarket({
                    title: data.title,
                    description: data.description,
                    category: data.category,
                    image_url: imageUrl,
                    end_date: new Date(data.end_date).toISOString(),
                    yes_price: 0.5,
                    no_price: 0.5
                });

                modal.remove();
                this.renderView('markets');
            } catch (error) {
                alert('Error creating market: ' + error.message);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    async showEditMarketModal(marketId) {
        try {
            // Load existing market data
            const market = await this.api.getMarket(marketId);

            const modal = document.createElement('div');
            modal.className = 'admin-modal';

            // Format end_date for datetime-local input
            const endDate = new Date(market.end_date);
            const formattedEndDate = endDate.toISOString().slice(0, 16);

            modal.innerHTML = `
                <div class="admin-modal-content">
                    <div class="p-6 border-b border-gray-700">
                        <h3 class="text-xl font-bold">Edit Market</h3>
                    </div>
                    <form id="edit-market-form" class="p-6 space-y-4">
                        <div class="form-group">
                            <label class="form-label">Title</label>
                            <input type="text" name="title" required class="form-input" value="${market.title.replace(/"/g, '&quot;')}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea name="description" rows="3" class="form-input">${market.description || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Category</label>
                            <select name="category" class="form-select">
                                <option value="Jamaican Parliament" ${market.category === 'Jamaican Parliament' ? 'selected' : ''}>Jamaican Parliament</option>
                                <option value="Dancehall" ${market.category === 'Dancehall' ? 'selected' : ''}>Dancehall</option>
                                <option value="Reggae" ${market.category === 'Reggae' ? 'selected' : ''}>Reggae</option>
                                <option value="Jamaica Sports" ${market.category === 'Jamaica Sports' ? 'selected' : ''}>Jamaica Sports</option>
                                <option value="Caribbean Cricket" ${market.category === 'Caribbean Cricket' ? 'selected' : ''}>Caribbean Cricket</option>
                                <option value="Jamaica Business" ${market.category === 'Jamaica Business' ? 'selected' : ''}>Jamaica Business</option>
                                <option value="JMD & Crypto" ${market.category === 'JMD & Crypto' ? 'selected' : ''}>JMD & Crypto</option>
                                <option value="Jamaican Culture" ${market.category === 'Jamaican Culture' ? 'selected' : ''}>Jamaican Culture</option>
                                <option value="Caribbean News" ${market.category === 'Caribbean News' ? 'selected' : ''}>Caribbean News</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Market Image</label>

                            <!-- Dimension Guide for Markets -->
                            <div class="bg-gray-700 border-l-4 border-green-500 p-3 mb-3 rounded text-sm">
                                <div class="flex items-start gap-2">
                                    <svg class="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <div>
                                        <p class="text-green-300 font-semibold mb-1">Recommended: 800×400px (Desktop) or 600×300px (Mobile)</p>
                                        <p class="text-gray-400 text-xs">Min: 400×200px. Images below minimum may appear pixelated.</p>
                                    </div>
                                </div>
                            </div>

                            <div class="space-y-2">
                                <div id="editAdminMarketImagePreview" class="relative w-full h-48 bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 overflow-hidden">
                                    ${market.image_url
                                        ? `<img src="${market.image_url}" class="w-full h-full object-cover">`
                                        : '<span>No image selected</span>'
                                    }
                                </div>
                                <input type="file" id="editAdminMarketImageInput" accept="image/*"
                                       class="block w-full text-sm text-gray-400
                                       file:mr-4 file:py-2 file:px-4
                                       file:rounded file:border-0
                                       file:text-sm file:font-semibold
                                       file:bg-green-600 file:text-white
                                       hover:file:bg-green-700 file:cursor-pointer cursor-pointer">
                                <div class="flex items-start gap-2 text-xs text-gray-400">
                                    <svg class="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <span>Upload new image or keep existing (max 5MB). Quality checked after upload.</span>
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="form-group">
                                <label class="form-label">YES Price</label>
                                <input type="number" name="yes_price" step="0.01" min="0" max="1" value="${market.yes_price}" required class="form-input">
                                <p class="text-xs text-gray-400 mt-1">0.00 - 1.00 (50% = 0.50)</p>
                            </div>
                            <div class="form-group">
                                <label class="form-label">End Date</label>
                                <input type="datetime-local" name="end_date" required value="${formattedEndDate}" class="form-input">
                            </div>
                        </div>
                        <div class="flex gap-3 justify-end">
                            <button type="button" onclick="this.closest('.admin-modal').remove()" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition">Cancel</button>
                            <button type="submit" class="btn-primary">Update Market</button>
                        </div>
                    </form>
                </div>
            `;

            document.body.appendChild(modal);

            // Handle image preview
            const imageInput = document.getElementById('editAdminMarketImageInput');
            const imagePreview = document.getElementById('editAdminMarketImagePreview');

            imageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                // Validate file size (5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('Image size must be less than 5MB');
                    e.target.value = '';
                    return;
                }

                // Validate file type
                if (!file.type.startsWith('image/')) {
                    alert('Please select an image file');
                    e.target.value = '';
                    return;
                }

                // Show preview with dimension analysis
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const width = img.width;
                        const height = img.height;
                        const aspectRatio = (width / height).toFixed(2);
                        const fileSize = (file.size / 1024 / 1024).toFixed(2);

                        // Quality check
                        let qualityStatus = '';
                        let statusColor = 'text-yellow-400';
                        let statusIcon = 'ℹ';

                        if (width >= 800 && height >= 400) {
                            qualityStatus = 'Excellent quality';
                            statusColor = 'text-green-400';
                            statusIcon = '✓';
                        } else if (width >= 600 && height >= 300) {
                            qualityStatus = 'Good quality';
                            statusColor = 'text-green-400';
                            statusIcon = '✓';
                        } else if (width >= 400 && height >= 200) {
                            qualityStatus = 'Acceptable quality';
                            statusColor = 'text-yellow-400';
                            statusIcon = '⚠';
                        } else {
                            qualityStatus = 'May appear pixelated';
                            statusColor = 'text-red-400';
                            statusIcon = '⚠';
                        }

                        // Aspect ratio check
                        const targetRatio = 2.0; // 2:1 ratio
                        const ratioDiff = Math.abs(aspectRatio - targetRatio);
                        let ratioWarning = '';
                        if (ratioDiff > 0.3) {
                            ratioWarning = '<div class="text-orange-400 text-xs mt-1">⚠ Image may be cropped or distorted</div>';
                        }

                        imagePreview.innerHTML = `
                            <img src="${event.target.result}" class="w-full h-full object-cover">
                            <div class="absolute bottom-2 right-2 bg-black bg-opacity-90 px-3 py-2 rounded-lg text-xs space-y-1 max-w-xs">
                                <div class="text-white font-bold">${width} × ${height}px</div>
                                <div class="text-gray-400">Ratio: ${aspectRatio}:1 • ${fileSize}MB</div>
                                <div class="${statusColor} font-semibold">${statusIcon} ${qualityStatus}</div>
                                ${ratioWarning}
                            </div>
                        `;
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            });

            // Handle form submission
            document.getElementById('edit-market-form').addEventListener('submit', async (e) => {
                e.preventDefault();

                const submitBtn = e.target.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;

                try {
                    // Show loading
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<div class="spinner-glow inline-block w-4 h-4 mr-2"></div>Updating...';

                    const formData = new FormData(e.target);
                    const data = Object.fromEntries(formData);
                    let imageUrl = market.image_url; // Keep existing image by default

                    // Upload new image if selected
                    if (imageInput.files.length > 0) {
                        const file = imageInput.files[0];
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                        const { data: uploadData, error: uploadError } = await this.api.db.storage
                            .from('market-images')
                            .upload(fileName, file, {
                                cacheControl: '3600',
                                upsert: false
                            });

                        if (uploadError) throw uploadError;

                        // Get public URL
                        const { data: urlData } = this.api.db.storage
                            .from('market-images')
                            .getPublicUrl(fileName);

                        imageUrl = urlData.publicUrl;
                    }

                    const marketData = {
                        title: data.title,
                        description: data.description,
                        category: data.category,
                        image_url: imageUrl,
                        yes_price: parseFloat(data.yes_price),
                        no_price: 1 - parseFloat(data.yes_price),
                        end_date: new Date(data.end_date).toISOString()
                    };

                    const { error } = await this.api.db
                        .from('markets')
                        .update(marketData)
                        .eq('id', marketId);

                    if (error) throw error;

                    alert('Market updated successfully!');
                    modal.remove();
                    this.renderView('markets');
                } catch (error) {
                    alert('Error updating market: ' + error.message);
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        } catch (error) {
            alert('Error loading market: ' + error.message);
        }
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

        const newCount = messages.filter(m => m.status === 'new').length;
        const readCount = messages.filter(m => m.status === 'read').length;
        const repliedCount = messages.filter(m => m.status === 'replied').length;
        const resolvedCount = messages.filter(m => m.status === 'resolved').length;

        container.innerHTML = `
            <!-- Stats Overview -->
            <div class="message-stats-grid">
                <div class="message-stat-card" data-status="all">
                    <i class="fa-solid fa-inbox"></i>
                    <div class="stat-number">${messages.length}</div>
                    <div class="stat-label">Total</div>
                </div>
                <div class="message-stat-card" data-status="new" style="border-color: var(--success);">
                    <i class="fa-solid fa-envelope" style="color: var(--success);"></i>
                    <div class="stat-number" style="color: var(--success);">${newCount}</div>
                    <div class="stat-label">New</div>
                </div>
                <div class="message-stat-card" data-status="read" style="border-color: var(--info);">
                    <i class="fa-solid fa-eye" style="color: var(--info);"></i>
                    <div class="stat-number" style="color: var(--info);">${readCount}</div>
                    <div class="stat-label">Read</div>
                </div>
                <div class="message-stat-card" data-status="replied" style="border-color: var(--warning);">
                    <i class="fa-solid fa-reply" style="color: var(--warning);"></i>
                    <div class="stat-number" style="color: var(--warning);">${repliedCount}</div>
                    <div class="stat-label">Replied</div>
                </div>
                <div class="message-stat-card" data-status="resolved" style="border-color: var(--muted);">
                    <i class="fa-solid fa-check-circle" style="color: var(--muted);"></i>
                    <div class="stat-number" style="color: var(--muted);">${resolvedCount}</div>
                    <div class="stat-label">Resolved</div>
                </div>
            </div>

            <!-- Messages List -->
            <div id="messages-list" class="messages-container">
                ${this.renderMessagesList(messages)}
            </div>
        `;

        // Attach stat card click listeners for filtering
        container.querySelectorAll('.message-stat-card').forEach(card => {
            card.addEventListener('click', () => {
                const status = card.dataset.status;
                const filteredMessages = status === 'all' ? messages : messages.filter(m => m.status === status);

                // Update active state
                container.querySelectorAll('.message-stat-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                // Update list
                document.getElementById('messages-list').innerHTML = this.renderMessagesList(filteredMessages);
            });
        });

        // Set initial active state
        container.querySelector('.message-stat-card[data-status="all"]').classList.add('active');
    }

    renderMessagesList(messages) {
        if (messages.length === 0) {
            return `
                <div style="text-align: center; padding: 60px 20px; color: var(--muted);">
                    <i class="fa-solid fa-inbox" style="font-size: 64px; opacity: 0.2; margin-bottom: 16px;"></i>
                    <p style="font-size: 16px;">No messages found</p>
                </div>
            `;
        }

        const priorityIcons = {
            urgent: 'fa-circle-exclamation',
            high: 'fa-arrow-up',
            normal: 'fa-minus',
            low: 'fa-arrow-down'
        };

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
            const date = new Date(msg.created_at);
            const timeAgo = this.getTimeAgo(date);
            const username = msg.profiles?.username || 'Unknown User';
            const userEmail = msg.email;

            return `
                <div class="message-card">
                    <!-- Header -->
                    <div class="message-header">
                        <div class="message-title-row">
                            <h3 class="message-subject">${this.escapeHtml(msg.subject)}</h3>
                            <div class="message-badges">
                                <span class="message-badge" style="background: ${statusColors[msg.status]}20; color: ${statusColors[msg.status]}; border-color: ${statusColors[msg.status]};">
                                    ${msg.status}
                                </span>
                                <span class="message-badge" style="background: ${priorityColors[msg.priority]}20; color: ${priorityColors[msg.priority]}; border-color: ${priorityColors[msg.priority]};">
                                    <i class="fa-solid ${priorityIcons[msg.priority]}"></i>
                                    ${msg.priority}
                                </span>
                            </div>
                        </div>
                        <div class="message-meta">
                            <div>
                                <i class="fa-solid fa-user"></i>
                                <strong>${this.escapeHtml(msg.name)}</strong>
                                ${msg.user_id ? `<span class="text-muted">(${this.escapeHtml(username)})</span>` : '<span class="text-muted">(Guest)</span>'}
                            </div>
                            <div>
                                <i class="fa-solid fa-envelope"></i>
                                <a href="mailto:${this.escapeHtml(userEmail)}" style="color: var(--accent);">${this.escapeHtml(userEmail)}</a>
                            </div>
                            <div>
                                <i class="fa-solid fa-clock"></i>
                                ${timeAgo}
                            </div>
                        </div>
                    </div>

                    <!-- Message Body -->
                    <div class="message-body">
                        <p>${this.escapeHtml(msg.message)}</p>
                    </div>

                    ${msg.admin_notes ? `
                        <div class="message-notes">
                            <i class="fa-solid fa-note-sticky"></i>
                            <strong>Admin Notes:</strong>
                            <p>${this.escapeHtml(msg.admin_notes)}</p>
                        </div>
                    ` : ''}

                    <!-- Actions -->
                    <div class="message-actions">
                        ${msg.status === 'new' ? `
                            <button onclick="adminPanel.updateMessageStatus('${msg.id}', 'read')" class="message-action-btn" style="background: #631BDD;">
                                <i class="fa-solid fa-eye"></i>
                                <span>Read</span>
                            </button>
                        ` : ''}
                        ${msg.status !== 'replied' && msg.status !== 'resolved' ? `
                            <button onclick="adminPanel.showReplyModal('${msg.id}', '${this.escapeHtml(userEmail)}', '${this.escapeHtml(msg.name)}', ${msg.user_id ? `'${msg.user_id}'` : 'null'})" class="message-action-btn" style="background: var(--accent);">
                                <i class="fa-solid fa-reply"></i>
                                <span>Reply</span>
                            </button>
                        ` : ''}
                        ${msg.status !== 'resolved' ? `
                            <button onclick="adminPanel.updateMessageStatus('${msg.id}', 'resolved')" class="message-action-btn" style="background: #10B981;">
                                <i class="fa-solid fa-check"></i>
                                <span>Resolve</span>
                            </button>
                        ` : ''}

                        <!-- More Actions Dropdown -->
                        <div class="message-dropdown-wrapper">
                            <button onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle('show-dropdown')" class="message-action-btn" style="background: var(--bg3);">
                                <i class="fa-solid fa-ellipsis-vertical"></i>
                                <span>More</span>
                            </button>
                            <div class="message-dropdown-menu">
                                <button onclick="adminPanel.showNotesModal('${msg.id}', ${msg.admin_notes ? `'${this.escapeHtml(msg.admin_notes)}'` : 'null'}); this.closest('.message-dropdown-menu').classList.remove('show-dropdown')">
                                    <i class="fa-solid fa-note-sticky"></i>
                                    ${msg.admin_notes ? 'Edit Notes' : 'Add Notes'}
                                </button>
                                <button onclick="adminPanel.updateMessageStatus('${msg.id}', 'archived'); this.closest('.message-dropdown-menu').classList.remove('show-dropdown')">
                                    <i class="fa-solid fa-box-archive"></i>
                                    Archive
                                </button>
                                <button onclick="adminPanel.deleteMessage('${msg.id}'); this.closest('.message-dropdown-menu').classList.remove('show-dropdown')" style="color: #EF4444;">
                                    <i class="fa-solid fa-trash"></i>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
            }
        }
        return 'Just now';
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
        modal.className = 'admin-modal-overlay';
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
                        <button type="button" onclick="this.closest('.admin-modal-overlay').remove()"
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
        modal.className = 'admin-modal-overlay';
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
                        <button type="button" onclick="this.closest('.admin-modal-overlay').remove()"
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
        const totalCount = proposals.length;
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

                <!-- Statistics Cards (Clickable Filters) -->
                <div class="voting-stats-grid">
                    <div class="voting-stat-card" data-status="all">
                        <div class="voting-stat-icon">
                            <i class="fa-solid fa-poll"></i>
                        </div>
                        <div class="voting-stat-value">${totalCount}</div>
                        <div class="voting-stat-label">Total Proposals</div>
                    </div>
                    <div class="voting-stat-card" data-status="pending">
                        <div class="voting-stat-icon text-yellow-400">
                            <i class="fa-solid fa-clock"></i>
                        </div>
                        <div class="voting-stat-value text-yellow-400">${pendingCount}</div>
                        <div class="voting-stat-label">Pending Review</div>
                    </div>
                    <div class="voting-stat-card" data-status="approved">
                        <div class="voting-stat-icon text-green-400">
                            <i class="fa-solid fa-circle-check"></i>
                        </div>
                        <div class="voting-stat-value text-green-400">${approvedCount}</div>
                        <div class="voting-stat-label">Approved & Live</div>
                    </div>
                    <div class="voting-stat-card" data-status="rejected">
                        <div class="voting-stat-icon text-red-400">
                            <i class="fa-solid fa-circle-xmark"></i>
                        </div>
                        <div class="voting-stat-value text-red-400">${rejectedCount}</div>
                        <div class="voting-stat-label">Rejected</div>
                    </div>
                </div>
            </div>

            <div id="proposals-list" class="proposals-list">
                ${this.renderProposalsList(proposals)}
            </div>
        `;

        // Attach filter listeners to stat cards
        container.querySelectorAll('.voting-stat-card').forEach(card => {
            card.addEventListener('click', () => {
                const status = card.dataset.status;

                // Update active state
                container.querySelectorAll('.voting-stat-card').forEach(c => {
                    c.classList.toggle('active', c === card);
                });

                // Filter proposals
                const filteredProposals = status === 'all'
                    ? proposals
                    : proposals.filter(p => p.status === status);

                document.getElementById('proposals-list').innerHTML = this.renderProposalsList(filteredProposals);

                // Re-attach dropdown listeners
                this.attachProposalDropdownListeners();
            });
        });

        // Set first card as active by default
        const firstCard = container.querySelector('.voting-stat-card');
        if (firstCard) {
            firstCard.classList.add('active');
        }

        // Attach dropdown listeners
        this.attachProposalDropdownListeners();
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

            const statusBadge = {
                pending: { class: 'proposal-status-pending', label: 'PENDING' },
                approved: { class: 'proposal-status-approved', label: 'APPROVED' },
                rejected: { class: 'proposal-status-rejected', label: 'REJECTED' }
            }[proposal.status];

            return `
                <div class="proposal-list-item">
                    ${proposal.image_url ? `
                        <img src="${proposal.image_url}" alt="${proposal.title}" class="proposal-list-image">
                    ` : ''}

                    <div class="proposal-list-content">
                        <div class="proposal-list-header">
                            <div class="proposal-list-title-section">
                                <h4 class="proposal-list-title">${proposal.title}</h4>
                                <span class="proposal-status-badge ${statusBadge.class}">${statusBadge.label}</span>
                            </div>
                            <div class="proposal-list-meta">
                                <span><i class="fa-solid fa-user"></i> ${proposal.profiles?.username || 'Unknown'}</span>
                                <span><i class="fa-solid fa-calendar"></i> ${new Date(proposal.created_at).toLocaleDateString()}</span>
                                <span><i class="fa-solid fa-comments"></i> ${commentCount}</span>
                                ${proposal.category ? `<span class="proposal-list-category"><i class="fa-solid fa-tag"></i> ${proposal.category}</span>` : ''}
                            </div>
                        </div>

                        <p class="proposal-list-description">${proposal.description}</p>

                        <div class="proposal-list-votes">
                            <div class="proposal-vote-item">
                                <div class="proposal-vote-header">
                                    <span class="proposal-vote-label"><i class="fa-solid fa-thumbs-up"></i> Yes</span>
                                    <span class="proposal-vote-count text-green-400">${yesVotes}</span>
                                </div>
                                <div class="proposal-vote-bar">
                                    <div class="proposal-vote-fill bg-green-400" style="width: ${yesPercent}%"></div>
                                </div>
                            </div>
                            <div class="proposal-vote-item">
                                <div class="proposal-vote-header">
                                    <span class="proposal-vote-label"><i class="fa-solid fa-thumbs-down"></i> No</span>
                                    <span class="proposal-vote-count text-red-400">${noVotes}</span>
                                </div>
                                <div class="proposal-vote-bar">
                                    <div class="proposal-vote-fill bg-red-400" style="width: ${100 - yesPercent}%"></div>
                                </div>
                            </div>
                            <div class="proposal-vote-summary">
                                <span class="proposal-vote-total"><i class="fa-solid fa-chart-simple"></i> ${totalVotes} total votes</span>
                                <span class="proposal-vote-percent">${yesPercent}% approval</span>
                            </div>
                        </div>
                    </div>

                    <div class="proposal-list-actions">
                        ${proposal.status === 'pending' ? `
                            <button onclick="adminPanel.approveProposal('${proposal.id}')" class="proposal-action-btn proposal-btn-approve" title="Approve">
                                <i class="fa-solid fa-circle-check"></i>
                                <span class="proposal-btn-text">Approve</span>
                            </button>
                            <button onclick="adminPanel.rejectProposal('${proposal.id}')" class="proposal-action-btn proposal-btn-reject" title="Reject">
                                <i class="fa-solid fa-circle-xmark"></i>
                                <span class="proposal-btn-text">Reject</span>
                            </button>
                        ` : ''}
                        ${proposal.status === 'approved' || proposal.status === 'rejected' ? `
                            <button onclick="adminPanel.resetProposalStatus('${proposal.id}')" class="proposal-action-btn proposal-btn-reset" title="Reset">
                                <i class="fa-solid fa-rotate-left"></i>
                                <span class="proposal-btn-text">Reset</span>
                            </button>
                        ` : ''}
                        <div class="proposal-dropdown">
                            <button class="proposal-action-btn proposal-btn-more" data-proposal-id="${proposal.id}" title="More options">
                                <i class="fa-solid fa-ellipsis-vertical"></i>
                            </button>
                            <div class="proposal-dropdown-menu" data-proposal-id="${proposal.id}">
                                <button onclick="adminPanel.deleteProposal('${proposal.id}')" class="proposal-dropdown-item proposal-dropdown-delete">
                                    <i class="fa-solid fa-trash"></i>
                                    <span>Delete Proposal</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    attachProposalDropdownListeners() {
        // Close all dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.proposal-dropdown')) {
                document.querySelectorAll('.proposal-dropdown-menu').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        });

        // Toggle dropdowns
        document.querySelectorAll('.proposal-btn-more').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const proposalId = btn.dataset.proposalId;
                const menu = document.querySelector(`.proposal-dropdown-menu[data-proposal-id="${proposalId}"]`);

                // Close other dropdowns
                document.querySelectorAll('.proposal-dropdown-menu').forEach(m => {
                    if (m !== menu) m.classList.remove('show');
                });

                // Toggle current dropdown
                if (menu) {
                    menu.classList.toggle('show');
                }
            });
        });
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

    async renderBanners(container) {
        container.innerHTML = '<div id="admin-banners-section"></div>';

        // Initialize and render the AdminBanners component
        if (window.AdminBanners) {
            window.adminBanners = new AdminBanners(this.api);
            await window.adminBanners.init();
        } else {
            container.innerHTML = '<div class="text-center py-12 text-red-400">Banner management component not loaded</div>';
        }
    }

    async renderActivity(container) {
        try {
            // Fetch all activities
            const [recentBets, recentMarkets, recentComments, recentUsers, recentProposals, transactions] = await Promise.all([
                window.supabaseClient
                    .from('bets')
                    .select('*, user:profiles!bets_user_id_fkey(username), market:markets(title)')
                    .order('created_at', { ascending: false })
                    .limit(50),
                window.supabaseClient
                    .from('markets')
                    .select('*, creator:profiles!markets_created_by_fkey(username)')
                    .order('created_at', { ascending: false })
                    .limit(30),
                window.supabaseClient
                    .from('comments')
                    .select('*, user:profiles!comments_user_id_fkey(username), market:markets(title)')
                    .order('created_at', { ascending: false })
                    .limit(40),
                window.supabaseClient
                    .from('profiles')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(20),
                window.supabaseClient
                    .from('proposals')
                    .select('*, user:profiles!proposals_user_id_fkey(username)')
                    .order('created_at', { ascending: false })
                    .limit(20),
                this.api.getAllTransactions({ limit: 100 })
            ]);

            // Combine all activities
            const allActivities = [];

            // Add bets
            if (recentBets?.data) {
                recentBets.data.forEach(bet => {
                    allActivities.push({
                        type: 'bet',
                        created_at: bet.created_at,
                        user: bet.user?.username || 'Unknown',
                        data: bet
                    });
                });
            }

            // Add new markets
            if (recentMarkets?.data) {
                recentMarkets.data.forEach(market => {
                    allActivities.push({
                        type: 'market_created',
                        created_at: market.created_at,
                        user: market.creator?.username || 'Unknown',
                        data: market
                    });
                });
            }

            // Add comments
            if (recentComments?.data) {
                recentComments.data.forEach(comment => {
                    allActivities.push({
                        type: 'comment',
                        created_at: comment.created_at,
                        user: comment.user?.username || 'Unknown',
                        data: comment
                    });
                });
            }

            // Add new users
            if (recentUsers?.data) {
                recentUsers.data.forEach(user => {
                    allActivities.push({
                        type: 'user_joined',
                        created_at: user.created_at,
                        user: user.username,
                        data: user
                    });
                });
            }

            // Add proposals
            if (recentProposals?.data) {
                recentProposals.data.forEach(proposal => {
                    allActivities.push({
                        type: 'proposal',
                        created_at: proposal.created_at,
                        user: proposal.user?.username || 'Unknown',
                        data: proposal
                    });
                });
            }

            // Add transactions (payouts, deposits, withdrawals)
            if (transactions) {
                transactions.forEach(tx => {
                    if (tx.type !== 'bet') {
                        allActivities.push({
                            type: tx.type,
                            created_at: tx.created_at,
                            user: tx.user?.username || 'Unknown',
                            data: tx
                        });
                    }
                });
            }

            // Sort by date (most recent first)
            allActivities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            // Render activities in a table
            container.innerHTML = `
                <div style="background: var(--bg2); border-radius: 12px; padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h3 style="font-size: 18px; font-weight: 600;">All Site Activity</h3>
                        <span style="color: var(--muted);">${allActivities.length} total activities</span>
                    </div>

                    ${allActivities.length === 0 ? `
                        <div style="text-align: center; padding: 48px; color: var(--muted);">
                            <i class="fa-solid fa-inbox" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                            <p>No activities yet</p>
                        </div>
                    ` : `
                        <div style="overflow-x: auto;">
                            ${allActivities.map(activity => {
                                const date = new Date(activity.created_at);
                                const timeAgo = this.getTimeAgo(date);
                                const fullDate = date.toLocaleString();

                                let typeIcon, typeColor, typeText, description;

                                switch (activity.type) {
                                    case 'bet':
                                        typeIcon = 'fa-chart-line';
                                        typeColor = '#00CB97';
                                        typeText = 'Bet Placed';
                                        description = `${activity.data.outcome?.toUpperCase()} on "${activity.data.market?.title || 'Unknown Market'}" - J$${parseFloat(activity.data.amount).toFixed(2)}`;
                                        break;
                                    case 'market_created':
                                        typeIcon = 'fa-plus-circle';
                                        typeColor = '#631BDD';
                                        typeText = 'Market Created';
                                        description = activity.data.title;
                                        break;
                                    case 'comment':
                                        typeIcon = 'fa-comment';
                                        typeColor = '#027A40';
                                        typeText = 'Comment';
                                        description = `On "${activity.data.market?.title || 'Unknown Market'}"`;
                                        break;
                                    case 'user_joined':
                                        typeIcon = 'fa-user-plus';
                                        typeColor = '#F2C300';
                                        typeText = 'New Member';
                                        description = `@${activity.user} joined`;
                                        break;
                                    case 'proposal':
                                        typeIcon = 'fa-lightbulb';
                                        typeColor = '#00e5af';
                                        typeText = 'Proposal';
                                        description = activity.data.title || activity.data.market_question;
                                        break;
                                    case 'payout':
                                        typeIcon = 'fa-trophy';
                                        typeColor = '#F2C300';
                                        typeText = 'Payout';
                                        description = `Won J$${parseFloat(activity.data.amount).toFixed(2)}`;
                                        break;
                                    case 'deposit':
                                        typeIcon = 'fa-arrow-down';
                                        typeColor = '#027A40';
                                        typeText = 'Deposit';
                                        description = `+J$${parseFloat(activity.data.amount).toFixed(2)}`;
                                        break;
                                    case 'withdrawal':
                                        typeIcon = 'fa-arrow-up';
                                        typeColor = '#ef4444';
                                        typeText = 'Withdrawal';
                                        description = `-J$${parseFloat(Math.abs(activity.data.amount)).toFixed(2)}`;
                                        break;
                                    default:
                                        typeIcon = 'fa-circle-info';
                                        typeColor = '#9333ea';
                                        typeText = activity.type;
                                        description = activity.data.description || '';
                                }

                                return `
                                    <div style="display: flex; align-items: center; gap: 16px; padding: 16px; border-bottom: 1px solid var(--bg3); transition: background 0.2s;" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background='transparent'">
                                        <div style="flex-shrink: 0;">
                                            <i class="fa-solid ${typeIcon}" style="color: ${typeColor}; font-size: 20px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(${parseInt(typeColor.slice(1,3), 16)}, ${parseInt(typeColor.slice(3,5), 16)}, ${parseInt(typeColor.slice(5,7), 16)}, 0.1); border-radius: 8px;"></i>
                                        </div>
                                        <div style="flex: 1; min-width: 0;">
                                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                                <strong style="color: var(--text-primary); font-size: 14px;">${typeText}</strong>
                                                <span style="color: var(--muted); font-size: 12px;">•</span>
                                                <span style="color: var(--muted); font-size: 12px;">${activity.user}</span>
                                            </div>
                                            <div style="color: var(--muted); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                                ${description}
                                            </div>
                                        </div>
                                        <div style="flex-shrink: 0; text-align: right;">
                                            <div style="color: var(--text-primary); font-size: 13px; margin-bottom: 2px;" title="${fullDate}">${timeAgo}</div>
                                            <div style="color: var(--muted); font-size: 11px;">${date.toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            `;

        } catch (error) {
            console.error('Error loading activities:', error);
            container.innerHTML = `<div class="text-center py-12" style="color: var(--error);">Error loading activities: ${error.message}</div>`;
        }
    }

    getTimeAgo(date) {
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    }
}

// Initialize on load
window.adminPanel = new AdminPanel();
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel.init();
});
