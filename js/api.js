// API Service Layer for GoatMouth
class GoatMouthAPI {
    constructor(supabase) {
        this.db = supabase;
    }

    // ============ AUTH ============
    async signUp(email, password, username) {
        // Sign up with username in metadata - trigger will create profile
        const { data: authData, error: authError } = await this.db.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username
                }
            }
        });

        if (authError) throw authError;

        // Profile is created automatically via database trigger
        return authData;
    }

    async signIn(email, password) {
        const { data, error } = await this.db.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    }

    async signOut() {
        const { error } = await this.db.auth.signOut();
        if (error) throw error;
    }

    async getCurrentUser() {
        const { data: { user } } = await this.db.auth.getUser();
        return user;
    }

    async getProfile(userId) {
        try {
            const { data, error } = await this.db
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('Profile fetch error:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code,
                    userId: userId
                });
                // Return null instead of throwing for missing profiles
                if (error.code === 'PGRST116') return null;
                throw error;
            }
            return data;
        } catch (err) {
            console.error('Profile fetch exception:', err);
            return null;
        }
    }

    // ============ MARKETS ============
    async getMarkets(filters = {}) {
        let query = this.db
            .from('markets')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(2000); // Ensure we fetch all markets

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.category) {
            query = query.eq('category', filters.category);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Fetch creator info for each market (handle RLS gracefully)
        const marketsWithCreators = await Promise.all(data.map(async (market) => {
            if (market.created_by) {
                try {
                    const { data: profile, error } = await this.db
                        .from('profiles')
                        .select('username, avatar_url')
                        .eq('id', market.created_by)
                        .single();

                    if (!error && profile) {
                        return { ...market, creator: profile };
                    }
                } catch (err) {
                    // RLS policy may block access, that's okay
                }
            }
            return market;
        }));

        return marketsWithCreators;
    }

    async getMarket(id) {
        const { data, error } = await this.db
            .from('markets')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Fetch creator info (handle RLS gracefully)
        if (data.created_by) {
            try {
                const { data: profile, error: profileError } = await this.db
                    .from('profiles')
                    .select('username, avatar_url')
                    .eq('id', data.created_by)
                    .single();

                if (!profileError && profile) {
                    data.creator = profile;
                }
            } catch (err) {
                // RLS policy may block access, that's okay
            }
        }

        // Count unique traders/bettors
        try {
            const { data: bets, error: betsError } = await this.db
                .from('bets')
                .select('user_id')
                .eq('market_id', id);

            if (!betsError && bets) {
                // Count unique user IDs
                const uniqueTraders = new Set(bets.map(bet => bet.user_id));
                data.bettor_count = uniqueTraders.size;
            } else {
                data.bettor_count = 0;
            }
        } catch (err) {
            data.bettor_count = 0;
        }

        return data;
    }

    async createMarket(marketData) {
        const user = await this.getCurrentUser();

        const { data, error } = await this.db
            .from('markets')
            .insert({
                ...marketData,
                created_by: user.id
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // ============ BETS ============
    async placeBet(marketId, outcome, amount, price) {
        const user = await this.getCurrentUser();
        const profile = await this.getProfile(user.id);

        // Check balance
        if (profile.balance < amount) {
            throw new Error('Insufficient balance');
        }

        const shares = outcome === 'yes'
            ? (amount / price)
            : (amount / (1 - price));
        const potentialReturn = shares; // Shares equal potential return in prediction markets

        // Start transaction
        const { data: bet, error: betError } = await this.db
            .from('bets')
            .insert({
                market_id: marketId,
                user_id: user.id,
                outcome,
                amount,
                price,
                shares,
                potential_return: potentialReturn,
                status: 'matched' // Auto-match for now (later: implement order book)
            })
            .select()
            .single();

        if (betError) throw betError;

        // Update user balance
        const newBalance = profile.balance - amount;
        const { error: balanceError } = await this.db
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', user.id);

        if (balanceError) throw balanceError;

        // Update or create position
        await this.updatePosition(user.id, marketId, outcome, amount, price);

        // Log transaction
        await this.logTransaction(user.id, 'bet', amount, newBalance, bet.id);

        return bet;
    }

    async updatePosition(userId, marketId, outcome, amount, price) {
        // Check existing position
        const { data: existing } = await this.db
            .from('positions')
            .select('*')
            .eq('user_id', userId)
            .eq('market_id', marketId)
            .eq('outcome', outcome)
            .single();

        if (existing) {
            // Update existing position
            const newShares = parseFloat(existing.shares) + (amount / price);
            const newTotalInvested = parseFloat(existing.total_invested) + amount;
            const newAvgPrice = newTotalInvested / newShares;

            await this.db
                .from('positions')
                .update({
                    shares: newShares,
                    total_invested: newTotalInvested,
                    avg_price: newAvgPrice,
                    current_value: newShares * price
                })
                .eq('id', existing.id);
        } else {
            // Create new position
            await this.db
                .from('positions')
                .insert({
                    user_id: userId,
                    market_id: marketId,
                    outcome,
                    shares: amount / price,
                    avg_price: price,
                    total_invested: amount,
                    current_value: amount
                });
        }
    }

    async getUserBets(userId) {
        const { data, error } = await this.db
            .from('bets')
            .select('*, markets(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    async getUserPositions(userId) {
        const { data, error } = await this.db
            .from('positions')
            .select('*, markets(*)')
            .eq('user_id', userId);

        if (error) throw error;
        return data;
    }

    // ============ TRANSACTIONS ============
    async logTransaction(userId, type, amount, balanceAfter, referenceId = null) {
        const { error } = await this.db
            .from('transactions')
            .insert({
                user_id: userId,
                type,
                amount,
                balance_after: balanceAfter,
                reference_id: referenceId
            });

        if (error) throw error;
    }

    async getUserTransactions(userId) {
        const { data, error } = await this.db
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    // ============ ADMIN ============
    async updateMarket(marketId, updates) {
        const { data, error } = await this.db
            .from('markets')
            .update(updates)
            .eq('id', marketId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteMarket(marketId) {
        const { error } = await this.db
            .from('markets')
            .delete()
            .eq('id', marketId);

        if (error) throw error;
    }

    async resolveMarket(marketId, outcome) {
        // Update market status and outcome
        const { error: marketError } = await this.db
            .from('markets')
            .update({
                status: 'resolved',
                resolved_outcome: outcome,
                resolution_date: new Date().toISOString()
            })
            .eq('id', marketId);

        if (marketError) throw marketError;

        // Get all bets for this market
        const { data: bets, error: betsError } = await this.db
            .from('bets')
            .select('*')
            .eq('market_id', marketId)
            .eq('status', 'matched');

        if (betsError) throw betsError;

        // Process payouts for winning bets
        for (const bet of bets) {
            if (bet.outcome === outcome) {
                const payout = bet.potential_return;

                // Update bet status
                await this.db
                    .from('bets')
                    .update({
                        status: 'settled',
                        payout: payout,
                        settled_at: new Date().toISOString()
                    })
                    .eq('id', bet.id);

                // Update user balance
                const profile = await this.getProfile(bet.user_id);
                const newBalance = parseFloat(profile.balance) + payout;

                await this.db
                    .from('profiles')
                    .update({ balance: newBalance })
                    .eq('id', bet.user_id);

                // Log payout transaction
                await this.logTransaction(bet.user_id, 'payout', payout, newBalance, bet.id);
            } else {
                // Mark losing bets as settled
                await this.db
                    .from('bets')
                    .update({
                        status: 'settled',
                        payout: 0,
                        settled_at: new Date().toISOString()
                    })
                    .eq('id', bet.id);
            }
        }
    }

    async getAllUsers(filters = {}) {
        let query = this.db
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10000); // Ensure we fetch all users (Supabase default limit is 1000)

        if (filters.role) {
            query = query.eq('role', filters.role);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async updateUserProfile(userId, updates) {
        const { data, error } = await this.db
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async changeUserRole(userId, newRole) {
        if (!['user', 'admin'].includes(newRole)) {
            throw new Error('Invalid role. Must be "user" or "admin"');
        }

        const { data, error } = await this.db
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateUserBalance(userId, newBalance) {
        const { data, error } = await this.db
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteUser(userId) {
        // Delete user profile (cascades to positions, bets, transactions)
        const { error } = await this.db
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) throw error;
    }

    async getAllTransactions(filters = {}) {
        let query = this.db
            .from('transactions')
            .select('*, profiles(username)')
            .order('created_at', { ascending: false });

        if (filters.type) {
            query = query.eq('type', filters.type);
        }

        if (filters.userId) {
            query = query.eq('user_id', filters.userId);
        }

        // Apply limit (default to 5000 if not specified to ensure we get all data)
        query = query.limit(filters.limit || 5000);

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async getMarketStats() {
        const { data: markets, error: marketsError } = await this.db
            .from('markets')
            .select('status, total_volume');

        if (marketsError) throw marketsError;

        const stats = {
            total: markets.length,
            active: markets.filter(m => m.status === 'active').length,
            resolved: markets.filter(m => m.status === 'resolved').length,
            totalVolume: markets.reduce((sum, m) => sum + parseFloat(m.total_volume || 0), 0)
        };

        return stats;
    }

    async getUserStats() {
        const { data: profiles, error: profilesError } = await this.db
            .from('profiles')
            .select('role, balance');

        if (profilesError) throw profilesError;

        const stats = {
            total: profiles.length,
            admins: profiles.filter(p => p.role === 'admin').length,
            users: profiles.filter(p => p.role === 'user').length,
            totalBalance: profiles.reduce((sum, p) => sum + parseFloat(p.balance || 0), 0)
        };

        return stats;
    }

    async getLeaderboard(limit = 10) {
        const { data, error } = await this.db
            .from('profiles')
            .select('id, username, balance, created_at')
            .order('balance', { ascending: false })
            .limit(limit);

        if (error) throw error;

        // Fetch bet counts for each user
        const usersWithBets = await Promise.all(
            data.map(async (user) => {
                const { count } = await this.db
                    .from('bets')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);

                return {
                    ...user,
                    total_bets: count || 0
                };
            })
        );

        return usersWithBets;
    }

    // ============ REAL-TIME ============
    subscribeToMarket(marketId, callback) {
        return this.db
            .channel(`market-${marketId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'markets',
                    filter: `id=eq.${marketId}`
                },
                callback
            )
            .subscribe();
    }

    subscribeToUserBets(userId, callback) {
        return this.db
            .channel(`user-bets-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'bets',
                    filter: `user_id=eq.${userId}`
                },
                callback
            )
            .subscribe();
    }

    // ============ CONTACT MESSAGES ============
    async createContactMessage(messageData) {
        const user = await this.getCurrentUser();

        const { data, error } = await this.db
            .from('contact_messages')
            .insert({
                user_id: user?.id || null,
                name: messageData.name,
                email: messageData.email,
                subject: messageData.subject,
                message: messageData.message,
                priority: messageData.priority || 'normal',
                status: 'new'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getContactMessages(filters = {}) {
        let query = this.db
            .from('contact_messages')
            .select('*, profiles(username)')
            .order('created_at', { ascending: false })
            .limit(5000); // Ensure we fetch all messages

        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.priority) {
            query = query.eq('priority', filters.priority);
        }
        if (filters.userId) {
            query = query.eq('user_id', filters.userId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async getContactMessage(messageId) {
        const { data, error } = await this.db
            .from('contact_messages')
            .select('*, profiles(username)')
            .eq('id', messageId)
            .single();

        if (error) throw error;
        return data;
    }

    async updateContactMessage(messageId, updates) {
        const { data, error } = await this.db
            .from('contact_messages')
            .update(updates)
            .eq('id', messageId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteContactMessage(messageId) {
        const { error } = await this.db
            .from('contact_messages')
            .delete()
            .eq('id', messageId);

        if (error) throw error;
    }

    // ============ MESSAGE REPLIES ============
    async addMessageReply(contactMessageId, replyText, senderType = 'admin') {
        const user = await this.getCurrentUser();

        const { data, error } = await this.db
            .from('message_replies')
            .insert({
                contact_message_id: contactMessageId,
                sender_type: senderType,
                sender_id: user?.id,
                reply_text: replyText
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getMessageReplies(contactMessageId) {
        const { data, error } = await this.db
            .from('message_replies')
            .select('*, profiles(username, email)')
            .eq('contact_message_id', contactMessageId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data;
    }

    // ============ USER MESSAGES (Admin to User) ============
    async createUserMessage(userId, subject, message, messageType = 'info', relatedContactId = null) {
        const { data, error } = await this.db
            .from('user_messages')
            .insert({
                user_id: userId,
                subject,
                message,
                message_type: messageType,
                related_contact_id: relatedContactId
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getUserMessages(userId, unreadOnly = false) {
        let query = this.db
            .from('user_messages')
            .select('*')
            .eq('user_id', userId);

        if (unreadOnly) {
            query = query.eq('is_read', false);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async markUserMessageAsRead(messageId) {
        const { data, error } = await this.db
            .from('user_messages')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', messageId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getUnreadMessageCount(userId) {
        const { count, error } = await this.db
            .from('user_messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;
        return count || 0;
    }

    // ============ COMMENTS ============
    async getMarketComments(marketId) {
        const { data, error } = await this.db
            .from('comments')
            .select('*')
            .eq('market_id', marketId)
            .is('parent_id', null)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch user info for each comment
        const commentsWithUsers = await Promise.all(data.map(async (comment) => {
            try {
                const { data: profile } = await this.db
                    .from('profiles')
                    .select('username, avatar_url')
                    .eq('id', comment.user_id)
                    .single();

                return { ...comment, user: profile || { username: 'Unknown' } };
            } catch (err) {
                return { ...comment, user: { username: 'Unknown' } };
            }
        }));

        return commentsWithUsers;
    }

    async createComment(marketId, content, parentId = null) {
        const user = await this.getCurrentUser();
        if (!user) throw new Error('Must be logged in to comment');

        const { data, error } = await this.db
            .from('comments')
            .insert({
                market_id: marketId,
                user_id: user.id,
                content: content.trim(),
                parent_id: parentId
            })
            .select('*')
            .single();

        if (error) throw error;

        // Fetch user info for the new comment
        try {
            const { data: profile } = await this.db
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', data.user_id)
                .single();

            data.user = profile || { username: 'Unknown' };
        } catch (err) {
            data.user = { username: 'Unknown' };
        }

        return data;
    }

    async deleteComment(commentId) {
        const { error } = await this.db
            .from('comments')
            .delete()
            .eq('id', commentId);

        if (error) throw error;
    }

    async getCommentReplies(parentId) {
        const { data, error } = await this.db
            .from('comments')
            .select('*')
            .eq('parent_id', parentId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Fetch user info for each reply
        const repliesWithUsers = await Promise.all(data.map(async (comment) => {
            try {
                const { data: profile } = await this.db
                    .from('profiles')
                    .select('username, avatar_url')
                    .eq('id', comment.user_id)
                    .single();

                return { ...comment, user: profile || { username: 'Unknown' } };
            } catch (err) {
                return { ...comment, user: { username: 'Unknown' } };
            }
        }));

        return repliesWithUsers;
    }
}

// Export API instance
window.GoatMouthAPI = GoatMouthAPI;
