// Market Detail Modal Component
class MarketDetailModal {
    constructor(app, marketId) {
        this.app = app;
        this.marketId = marketId;
        this.market = null;
        this.betAmount = '';
        this.selectedOutcome = null;
    }

    async show() {
        try {
            this.market = await this.app.api.getMarket(this.marketId);
            this.render();
        } catch (error) {
            alert('Error loading market: ' + error.message);
        }
    }

    render() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 modal-backdrop';
        modal.innerHTML = this.getHTML();

        document.body.appendChild(modal);

        // Attach event listeners
        this.attachListeners(modal);

        // Load comments
        this.loadComments(modal);
    }

    getHTML() {
        const market = this.market;
        const yesPercent = (market.yes_price * 100).toFixed(1);
        const noPercent = (market.no_price * 100).toFixed(1);
        const timeLeft = this.app.getTimeLeft(market.end_date);

        return `
            <div class="bg-gray-800 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <!-- Header -->
                <div class="p-6 border-b border-gray-700">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex-1">
                            ${market.category ? `<span class="text-xs px-2 py-1 rounded mb-2 inline-block" style="background-color: #631BDD;">${market.category}</span>` : ''}
                            <h2 class="text-2xl font-bold">${market.title}</h2>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="navigator.share ? navigator.share({title: '${market.title.replace(/'/g, "\\'")}', text: 'Check out this market on GoatMouth!', url: window.location.href + '?market=${market.id}'}) : (navigator.clipboard.writeText(window.location.href + '?market=${market.id}').then(() => alert('Link copied to clipboard!')))" class="p-2 rounded-lg hover:bg-gray-700 transition" title="Share market">
                                <svg class="h-5 w-5" style="color: #00CB97;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                                </svg>
                            </button>
                            <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                        </div>
                    </div>
                    <p class="text-gray-300">${market.description || ''}</p>
                    <div class="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-400">
                        ${market.creator ? `
                            <div class="flex items-center gap-2">
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                </svg>
                                <span style="color: #00CB97;">@${market.creator.username}</span>
                            </div>
                            <span>•</span>
                        ` : ''}
                        <span>Volume: $${parseFloat(market.total_volume).toFixed(0)}</span>
                        <span>•</span>
                        <span>${timeLeft}</span>
                        <span>•</span>
                        <span>Ends: ${new Date(market.end_date).toLocaleDateString()}</span>
                    </div>
                </div>

                <!-- Prices -->
                <div class="p-6 border-b border-gray-700">
                    <h3 class="font-semibold mb-4">Current Prices</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-green-900 bg-opacity-20 border border-green-500 rounded-lg p-4">
                            <div class="text-green-400 font-semibold mb-2">YES</div>
                            <div class="text-3xl font-bold">${yesPercent}¢</div>
                            <div class="text-sm text-gray-400 mt-2">${(100 - parseFloat(yesPercent)).toFixed(1)}% return</div>
                        </div>
                        <div class="bg-red-900 bg-opacity-20 border border-red-500 rounded-lg p-4">
                            <div class="text-red-400 font-semibold mb-2">NO</div>
                            <div class="text-3xl font-bold">${noPercent}¢</div>
                            <div class="text-sm text-gray-400 mt-2">${(100 - parseFloat(noPercent)).toFixed(1)}% return</div>
                        </div>
                    </div>
                </div>

                <!-- Betting Interface -->
                ${this.app.currentUser ? `
                    <div class="p-6">
                        <h3 class="font-semibold mb-4">Place Your Bet</h3>

                        <!-- Outcome Selection -->
                        <div class="mb-4">
                            <label class="block text-sm text-gray-400 mb-2">Select Outcome</label>
                            <div class="grid grid-cols-2 gap-3">
                                <button
                                    data-outcome="yes"
                                    class="outcome-btn px-4 py-3 border-2 rounded-lg transition ${this.selectedOutcome === 'yes' ? 'border-green-500 bg-green-900 bg-opacity-20' : 'border-gray-600 hover:border-green-500'}"
                                >
                                    <span class="block font-semibold">YES</span>
                                    <span class="block text-sm">${yesPercent}¢</span>
                                </button>
                                <button
                                    data-outcome="no"
                                    class="outcome-btn px-4 py-3 border-2 rounded-lg transition ${this.selectedOutcome === 'no' ? 'border-red-500 bg-red-900 bg-opacity-20' : 'border-gray-600 hover:border-red-500'}"
                                >
                                    <span class="block font-semibold">NO</span>
                                    <span class="block text-sm">${noPercent}¢</span>
                                </button>
                            </div>
                        </div>

                        <!-- Amount Input -->
                        <div class="mb-4">
                            <label class="block text-sm text-gray-400 mb-2">Bet Amount ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="1"
                                placeholder="10.00"
                                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg" style="focus:border-color: #00CB97;"
                                id="bet-amount"
                            >
                        </div>

                        <!-- Bet Summary -->
                        <div id="bet-summary" class="mb-4 p-4 bg-gray-700 rounded-lg hidden">
                            <div class="flex justify-between text-sm mb-2">
                                <span class="text-gray-400">Shares</span>
                                <span id="shares-amount">-</span>
                            </div>
                            <div class="flex justify-between text-sm mb-2">
                                <span class="text-gray-400">Avg Cost</span>
                                <span id="avg-cost">-</span>
                            </div>
                            <div class="flex justify-between font-semibold">
                                <span>Potential Return</span>
                                <span id="potential-return" class="text-green-400">-</span>
                            </div>
                        </div>

                        <!-- Place Bet Button -->
                        <button
                            id="place-bet-btn"
                            disabled
                            class="w-full px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-white transition" style="background-color: #00CB97;" onmouseover="if(!this.disabled) this.style.backgroundColor='#00e5af'" onmouseout="if(!this.disabled) this.style.backgroundColor='#00CB97'"
                        >
                            Place Bet
                        </button>
                    </div>
                ` : `
                    <div class="p-6 text-center">
                        <p class="text-gray-400 mb-4">Sign in to place bets</p>
                        <button onclick="app.showAuthModal(); this.closest('.fixed').remove();" class="px-6 py-2 rounded-lg text-white transition" style="background-color: #00CB97;" onmouseover="this.style.backgroundColor='#00e5af'" onmouseout="this.style.backgroundColor='#00CB97'">
                            Sign In
                        </button>
                    </div>
                `}

                <!-- Comments Section -->
                <div class="p-6 border-t border-gray-700">
                    <h3 class="font-semibold mb-4 text-lg">Discussion</h3>

                    <!-- Comment Form -->
                    ${this.app.currentUser ? `
                        <div class="mb-6">
                            <textarea
                                id="comment-input"
                                placeholder="Share your thoughts on this market..."
                                class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-gray-500 resize-none"
                                rows="3"
                                maxlength="1000"
                            ></textarea>
                            <div class="flex justify-between items-center mt-2">
                                <span class="text-xs text-gray-400">Max 1000 characters</span>
                                <button
                                    id="post-comment-btn"
                                    class="px-4 py-2 rounded-lg font-semibold transition text-white"
                                    style="background-color: #00CB97;"
                                    onmouseover="this.style.backgroundColor='#00e5af'"
                                    onmouseout="this.style.backgroundColor='#00CB97'"
                                >
                                    Post Comment
                                </button>
                            </div>
                        </div>
                    ` : `
                        <div class="mb-6 p-4 bg-gray-700 rounded-lg text-center">
                            <p class="text-gray-400 mb-2">Sign in to join the discussion</p>
                            <button onclick="app.showAuthModal(); this.closest('.fixed').remove();" class="text-sm px-4 py-2 rounded-lg text-white transition" style="background-color: #00CB97;" onmouseover="this.style.backgroundColor='#00e5af'" onmouseout="this.style.backgroundColor='#00CB97'">
                                Sign In
                            </button>
                        </div>
                    `}

                    <!-- Comments List -->
                    <div id="comments-list">
                        <div class="text-center py-4 text-gray-400">
                            Loading comments...
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    attachListeners(modal) {
        if (!this.app.currentUser) return;

        // Outcome selection
        modal.querySelectorAll('.outcome-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedOutcome = btn.dataset.outcome;

                // Update UI
                modal.querySelectorAll('.outcome-btn').forEach(b => {
                    b.classList.remove('border-green-500', 'border-red-500', 'bg-green-900', 'bg-red-900', 'bg-opacity-20');
                    b.classList.add('border-gray-600');
                });

                if (this.selectedOutcome === 'yes') {
                    btn.classList.remove('border-gray-600');
                    btn.classList.add('border-green-500', 'bg-green-900', 'bg-opacity-20');
                } else {
                    btn.classList.remove('border-gray-600');
                    btn.classList.add('border-red-500', 'bg-red-900', 'bg-opacity-20');
                }

                this.updateBetSummary(modal);
            });
        });

        // Amount input
        const amountInput = modal.querySelector('#bet-amount');
        amountInput.addEventListener('input', (e) => {
            this.betAmount = e.target.value;
            this.updateBetSummary(modal);
        });

        // Place bet button
        modal.querySelector('#place-bet-btn').addEventListener('click', () => {
            this.handlePlaceBet(modal);
        });

        // Comment post button
        const postCommentBtn = modal.querySelector('#post-comment-btn');
        if (postCommentBtn) {
            postCommentBtn.addEventListener('click', () => {
                this.handlePostComment(modal);
            });
        }
    }

    updateBetSummary(modal) {
        const summary = modal.querySelector('#bet-summary');
        const placeBtn = modal.querySelector('#place-bet-btn');

        if (!this.selectedOutcome || !this.betAmount || parseFloat(this.betAmount) < 1) {
            summary.classList.add('hidden');
            placeBtn.disabled = true;
            return;
        }

        const amount = parseFloat(this.betAmount);
        const price = this.selectedOutcome === 'yes' ? this.market.yes_price : this.market.no_price;
        const shares = amount / price;
        const potentialReturn = shares - amount;

        summary.classList.remove('hidden');
        modal.querySelector('#shares-amount').textContent = shares.toFixed(2);
        modal.querySelector('#avg-cost').textContent = `${(price * 100).toFixed(1)}¢`;
        modal.querySelector('#potential-return').textContent = `$${potentialReturn.toFixed(2)}`;

        placeBtn.disabled = false;
    }

    async handlePlaceBet(modal) {
        const amount = parseFloat(this.betAmount);
        const price = this.selectedOutcome === 'yes' ? this.market.yes_price : this.market.no_price;

        if (!confirm(`Confirm bet: $${amount.toFixed(2)} on ${this.selectedOutcome.toUpperCase()} @ ${(price * 100).toFixed(1)}¢?`)) {
            return;
        }

        try {
            modal.querySelector('#place-bet-btn').disabled = true;
            modal.querySelector('#place-bet-btn').textContent = 'Placing bet...';

            await this.app.api.placeBet(this.marketId, this.selectedOutcome, amount, price);

            alert('Bet placed successfully!');
            modal.remove();

            // Refresh views
            this.app.render();
        } catch (error) {
            alert('Error placing bet: ' + error.message);
            modal.querySelector('#place-bet-btn').disabled = false;
            modal.querySelector('#place-bet-btn').textContent = 'Place Bet';
        }
    }

    async loadComments(modal) {
        const commentsList = modal.querySelector('#comments-list');
        try {
            const comments = await this.app.api.getMarketComments(this.marketId);

            if (comments.length === 0) {
                commentsList.innerHTML = `
                    <div class="text-center py-8 text-gray-400">
                        <p>No comments yet. Be the first to share your thoughts!</p>
                    </div>
                `;
                return;
            }

            commentsList.innerHTML = comments.map(comment => this.renderComment(comment)).join('');
        } catch (error) {
            commentsList.innerHTML = `
                <div class="text-center py-4 text-red-400">
                    Error loading comments
                </div>
            `;
        }
    }

    renderComment(comment) {
        const timeAgo = this.getTimeAgo(comment.created_at);
        const isCurrentUser = this.app.currentUser && comment.user_id === this.app.currentUser.id;

        return `
            <div class="mb-4 p-4 bg-gray-700 rounded-lg" data-comment-id="${comment.id}">
                <div class="flex items-start justify-between mb-2">
                    <div class="flex items-center gap-2">
                        <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                        <div>
                            <div class="font-semibold" style="color: #00CB97;">@${comment.user.username}</div>
                            <div class="text-xs text-gray-400">${timeAgo}</div>
                        </div>
                    </div>
                    ${isCurrentUser ? `
                        <button onclick="event.stopPropagation(); app.marketDetailModal.deleteComment('${comment.id}')" class="text-xs text-red-400 hover:text-red-300">
                            Delete
                        </button>
                    ` : ''}
                </div>
                <p class="text-gray-200 whitespace-pre-wrap">${this.escapeHtml(comment.content)}</p>
            </div>
        `;
    }

    async handlePostComment(modal) {
        const input = modal.querySelector('#comment-input');
        const content = input.value.trim();

        if (!content) {
            alert('Please enter a comment');
            return;
        }

        if (content.length > 1000) {
            alert('Comment is too long (max 1000 characters)');
            return;
        }

        try {
            const button = modal.querySelector('#post-comment-btn');
            button.disabled = true;
            button.textContent = 'Posting...';

            await this.app.api.createComment(this.marketId, content);

            input.value = '';
            button.disabled = false;
            button.textContent = 'Post Comment';

            // Reload comments
            this.loadComments(modal);
        } catch (error) {
            alert('Error posting comment: ' + error.message);
            const button = modal.querySelector('#post-comment-btn');
            button.disabled = false;
            button.textContent = 'Post Comment';
        }
    }

    async deleteComment(commentId) {
        if (!confirm('Are you sure you want to delete this comment?')) {
            return;
        }

        try {
            await this.app.api.deleteComment(commentId);
            const modal = document.querySelector('.modal-backdrop');
            this.loadComments(modal);
        } catch (error) {
            alert('Error deleting comment: ' + error.message);
        }
    }

    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export to window
window.MarketDetailModal = MarketDetailModal;
