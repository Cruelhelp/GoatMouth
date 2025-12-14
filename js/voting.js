// Voting System Controller
class VotingSystem {
    constructor() {
        this.api = null;
        this.currentUser = null;
        this.currentProfile = null;
        this.currentTab = 'active';
        this.init();
    }

    async init() {
        // Wait for Supabase client to be ready
        if (!window.supabaseClient) {
            console.error('Supabase client not initialized');
            return;
        }

        this.api = new GoatMouthAPI(window.supabaseClient);

        // Check auth state
        await this.checkAuth();

        // Render initial UI
        this.renderCreateProposalButton();
        await this.loadProposals();

        // Set up event listeners
        this.attachEventListeners();
    }

    async checkAuth() {
        try {
            this.currentUser = await this.api.getCurrentUser();
            if (this.currentUser) {
                this.currentProfile = await this.api.getProfile(this.currentUser.id);
            }
        } catch (error) {
            console.log('No user logged in');
        }
    }

    attachEventListeners() {
        // Tab switching
        document.querySelectorAll('.vote-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Create proposal button - using event delegation
        document.addEventListener('click', (e) => {
            // Check if clicked element or its parent has the data-action
            const target = e.target.closest('[data-action="create-proposal"]');
            if (target) {
                e.preventDefault();
                console.log('Create proposal clicked');
                this.showCreateProposalModal();
            }

            if (e.target.matches('[data-action="vote-yes"]')) {
                const proposalId = e.target.dataset.proposalId;
                this.vote(proposalId, 'yes');
            }

            if (e.target.matches('[data-action="vote-no"]')) {
                const proposalId = e.target.dataset.proposalId;
                this.vote(proposalId, 'no');
            }

            if (e.target.matches('[data-action="show-comments"]')) {
                const proposalId = e.target.dataset.proposalId;
                this.showCommentsModal(proposalId);
            }

            if (e.target.matches('[data-action="approve-proposal"]')) {
                const proposalId = e.target.dataset.proposalId;
                this.adminApprove(proposalId);
            }

            if (e.target.matches('[data-action="reject-proposal"]')) {
                const proposalId = e.target.dataset.proposalId;
                this.adminReject(proposalId);
            }
        });
    }

    renderCreateProposalButton() {
        const suggestBtn = document.getElementById('suggest-market-btn');
        const adminPanel = document.getElementById('admin-panel');

        if (!suggestBtn) return;

        // Show admin panel if user is admin
        if (this.currentProfile?.role === 'admin' && adminPanel) {
            adminPanel.style.display = 'block';
        }

        if (this.currentUser) {
            suggestBtn.innerHTML = `
                <button type="button"
                        class="py-3 px-8 rounded-xl font-bold text-base transition text-white flex items-center gap-2 whitespace-nowrap"
                        style="background: linear-gradient(135deg, #00CB97 0%, #00e5af 100%); box-shadow: 0 4px 12px rgba(0, 203, 151, 0.3);"
                        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(0, 203, 151, 0.4)'"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0, 203, 151, 0.3)'"
                        data-action="create-proposal">
                    <i class="ri-add-circle-line text-xl"></i>
                    <span>Suggest Market</span>
                </button>
            `;

            // Add direct event listener
            const button = suggestBtn.querySelector('[data-action="create-proposal"]');
            if (button) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showCreateProposalModal();
                });
            }
        } else {
            suggestBtn.innerHTML = `
                <a href="index.html" class="py-3 px-8 rounded-xl font-bold text-base transition flex items-center gap-2"
                   style="background: rgba(0, 203, 151, 0.15); color: #00CB97; border: 2px solid rgba(0, 203, 151, 0.3);"
                   onmouseover="this.style.background='rgba(0, 203, 151, 0.25)'"
                   onmouseout="this.style.background='rgba(0, 203, 151, 0.15)'">
                    <i class="ri-login-box-line text-xl"></i>
                    <span>Sign In to Participate</span>
                </a>
            `;
        }
    }

    switchTab(tab) {
        this.currentTab = tab;

        // Update tab styles
        document.querySelectorAll('.vote-tab').forEach(t => {
            t.classList.remove('active');
            if (t.dataset.tab === tab) {
                t.classList.add('active');
            }
        });

        // Update active styles
        document.querySelectorAll('.vote-tab').forEach(t => {
            if (t.dataset.tab === tab) {
                if (tab === 'active') {
                    t.style.background = 'rgba(0, 203, 151, 0.2)';
                    t.style.color = '#00CB97';
                    t.style.borderColor = 'rgba(0, 203, 151, 0.5)';
                } else if (tab === 'approved') {
                    t.style.background = 'rgba(99, 27, 221, 0.2)';
                    t.style.color = '#631BDD';
                    t.style.borderColor = 'rgba(99, 27, 221, 0.5)';
                } else if (tab === 'rejected') {
                    t.style.background = 'rgba(239, 68, 68, 0.2)';
                    t.style.color = '#ef4444';
                    t.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                }
            } else {
                if (t.dataset.tab === 'active') {
                    t.style.background = 'rgba(0, 203, 151, 0.1)';
                    t.style.borderColor = 'rgba(0, 203, 151, 0.3)';
                } else if (t.dataset.tab === 'approved') {
                    t.style.background = 'rgba(99, 27, 221, 0.1)';
                    t.style.borderColor = 'rgba(99, 27, 221, 0.3)';
                } else if (t.dataset.tab === 'rejected') {
                    t.style.background = 'rgba(239, 68, 68, 0.1)';
                    t.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                }
            }
        });

        // Reload proposals
        this.loadProposals();
    }

    async loadProposals() {
        const container = document.getElementById('proposals-container');
        container.innerHTML = `
            <div class="inline-loader">
                <div class="spinner-container">
                    <div class="spinner-glow"></div>
                    <div class="spinner-text">Loading proposals...</div>
                </div>
            </div>
        `;

        try {
            // Get proposals based on current tab
            let status = this.currentTab === 'active' ? 'pending' : this.currentTab;

            const { data: proposals, error } = await window.supabaseClient
                .from('proposals')
                .select(`
                    *,
                    profiles:created_by (username),
                    proposal_votes (vote, user_id),
                    proposal_comments (id)
                `)
                .eq('status', status)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Update dashboard stats
            await this.updateDashboardStats();

            if (!proposals || proposals.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-12">
                        <div class="inline-block p-8 rounded-2xl bg-gray-800/50 border border-gray-700">
                            <svg class="h-16 w-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                            </svg>
                            <p class="text-gray-400 text-lg font-semibold">No ${this.currentTab} proposals yet</p>
                            <p class="text-gray-500 text-sm mt-2">Be the first to suggest a new market!</p>
                        </div>
                    </div>
                `;
                return;
            }

            // Render proposals
            container.innerHTML = `
                <div class="grid grid-cols-1 gap-4">
                    ${proposals.map(proposal => this.renderProposalCard(proposal)).join('')}
                </div>
            `;

        } catch (error) {
            console.error('Error loading proposals:', error);
            container.innerHTML = `
                <div class="text-center py-12">
                    <p class="text-red-400">Error loading proposals: ${error.message}</p>
                </div>
            `;
        }
    }

    async updateDashboardStats() {
        try {
            // Get total proposals count (all time)
            const { count: totalCount } = await window.supabaseClient
                .from('proposals')
                .select('*', { count: 'exact', head: true });

            // Get total votes count
            const { count: votesCount } = await window.supabaseClient
                .from('proposal_votes')
                .select('*', { count: 'exact', head: true });

            // Get approved proposals count
            const { count: approvedCount } = await window.supabaseClient
                .from('proposals')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'approved');

            // Get total users count
            const { count: usersCount } = await window.supabaseClient
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            // Get unique voters count
            const { data: uniqueVoters } = await window.supabaseClient
                .from('proposal_votes')
                .select('user_id');

            const uniqueVotersCount = uniqueVoters ? new Set(uniqueVoters.map(v => v.user_id)).size : 0;

            // Calculate participation rate
            const participationRate = usersCount > 0
                ? ((uniqueVotersCount / usersCount) * 100).toFixed(1)
                : 0;

            // Calculate average votes per proposal
            const avgVotes = totalCount > 0
                ? (votesCount / totalCount).toFixed(1)
                : 0;

            // Update UI
            document.getElementById('stat-total').textContent = totalCount || 0;
            document.getElementById('stat-participation').textContent = participationRate + '%';
            document.getElementById('stat-approved').textContent = approvedCount || 0;
            document.getElementById('stat-avg-votes').textContent = avgVotes;

        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    renderProposalCard(proposal) {
        const yesVotes = proposal.proposal_votes?.filter(v => v.vote === 'yes').length || 0;
        const noVotes = proposal.proposal_votes?.filter(v => v.vote === 'no').length || 0;
        const totalVotes = yesVotes + noVotes;
        const yesPercent = totalVotes > 0 ? ((yesVotes / totalVotes) * 100).toFixed(0) : 0;
        const commentsCount = proposal.proposal_comments?.length || 0;

        const userVote = this.currentUser
            ? proposal.proposal_votes?.find(v => v.user_id === this.currentUser.id)
            : null;

        const isAdmin = this.currentProfile?.role === 'admin';

        const statusColors = {
            pending: { bg: 'rgba(0, 203, 151, 0.1)', border: 'rgba(0, 203, 151, 0.3)', text: '#00CB97', glow: 'rgba(0, 203, 151, 0.2)' },
            approved: { bg: 'rgba(99, 27, 221, 0.1)', border: 'rgba(99, 27, 221, 0.3)', text: '#631BDD', glow: 'rgba(99, 27, 221, 0.2)' },
            rejected: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#ef4444', glow: 'rgba(239, 68, 68, 0.2)' }
        };

        const colors = statusColors[proposal.status] || statusColors.pending;

        return `
            <div class="proposal-accordion"
                 data-proposal-id="${proposal.id}"
                 style="background: linear-gradient(135deg, rgba(31, 41, 55, 0.8) 0%, rgba(17, 24, 39, 0.9) 100%);
                        border: 2px solid var(--border);
                        border-radius: 16px;
                        margin-bottom: 16px;
                        transition: all 0.3s ease;
                        cursor: pointer;
                        position: relative;
                        overflow: hidden;">

                <!-- Accordion Header (Always Visible) -->
                <div class="proposal-header" onclick="toggleProposal('${proposal.id}')"
                     style="padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">

                    <!-- Left: Title and Quick Info -->
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            ${proposal.image_url ? `
                                <div style="width: 60px; height: 60px; border-radius: 10px; overflow: hidden; border: 2px solid rgba(0, 203, 151, 0.3); flex-shrink: 0;">
                                    <img src="${proposal.image_url}"
                                         alt="${proposal.title}"
                                         style="width: 100%; height: 100%; object-fit: cover;"
                                         onerror="this.parentElement.innerHTML='<div style=\\'width:60px;height:60px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#00CB97 0%,#631BDD 100%);font-size:0.875rem;font-weight:700;\\'>${proposal.profiles?.username?.charAt(0).toUpperCase() || 'U'}</div>'">
                                </div>
                            ` : `
                                <div style="width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 0.875rem; font-weight: 700; background: linear-gradient(135deg, #00CB97 0%, #631BDD 100%); flex-shrink: 0;">
                                    ${proposal.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            `}
                            <div style="flex: 1; min-width: 0;">
                                <p style="font-weight: 700; font-size: 1.125rem; color: white; margin: 0; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${proposal.title}</p>
                                <p style="font-size: 0.75rem; color: #9ca3af; margin: 4px 0 0 0;">
                                    <i class="ri-user-line"></i> ${proposal.profiles?.username || 'Unknown'} •
                                    <i class="ri-calendar-line"></i> ${new Date(proposal.created_at).toLocaleDateString()}
                                    ${proposal.image_url ? ' • <i class="ri-image-line"></i>' : ''}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Quick Stats and Expand Icon -->
                    <div style="display: flex; align-items: center; gap: 16px; flex-shrink: 0;">
                        <!-- Vote Count -->
                        <div style="display: flex; align-items: center; gap: 12px; padding: 8px 16px; background: rgba(0, 203, 151, 0.1); border-radius: 10px; border: 1px solid rgba(0, 203, 151, 0.3);">
                            <div style="text-align: center;">
                                <i class="ri-thumb-up-fill" style="color: #00CB97; font-size: 1.25rem;"></i>
                                <p style="margin: 0; font-size: 0.875rem; font-weight: 700; color: white;">${yesVotes}</p>
                            </div>
                            <div style="width: 1px; height: 24px; background: rgba(255, 255, 255, 0.1);"></div>
                            <div style="text-align: center;">
                                <i class="ri-thumb-down-fill" style="color: #ef4444; font-size: 1.25rem;"></i>
                                <p style="margin: 0; font-size: 0.875rem; font-weight: 700; color: white;">${noVotes}</p>
                            </div>
                        </div>

                        <!-- Status Badge -->
                        <span style="padding: 6px 16px; border-radius: 10px; font-size: 0.75rem; font-weight: 700; background: ${colors.bg}; color: ${colors.text}; border: 2px solid ${colors.border};">
                            ${proposal.status.toUpperCase()}
                        </span>

                        <!-- Expand Icon -->
                        <div class="expand-icon" style="transition: transform 0.3s ease;">
                            <svg style="width: 28px; height: 28px; color: #00CB97;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
                            </svg>
                        </div>
                    </div>
                </div>

                <!-- Accordion Content (Expandable) -->
                <div class="proposal-content" style="display: none; border-top: 2px solid var(--border); padding: 24px;">
                    ${proposal.image_url ? `
                        <!-- Market Image -->
                        <div style="margin-bottom: 24px;">
                            <div style="border-radius: 12px; overflow: hidden; border: 2px solid rgba(0, 203, 151, 0.3); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
                                <img src="${proposal.image_url}"
                                     alt="${proposal.title}"
                                     style="width: 100%; height: auto; max-height: 400px; object-fit: cover; display: block;"
                                     onerror="this.parentElement.style.display='none'">
                            </div>
                        </div>
                    ` : ''}

                    <!-- Description -->
                    <div style="margin-bottom: 24px;">
                        <h4 style="color: #00CB97; font-weight: 700; font-size: 0.875rem; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                            <i class="ri-file-text-line"></i> Description
                        </h4>
                        <p style="color: #d1d5db; font-size: 0.9375rem; line-height: 1.6; margin: 0;">${proposal.description}</p>
                    </div>

                    ${proposal.category ? `
                        <div style="margin-bottom: 24px;">
                            <span style="padding: 6px 14px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; background: rgba(242, 195, 0, 0.2); color: #F2C300; border: 1px solid rgba(242, 195, 0, 0.3);">
                                <i class="ri-folder-line"></i> ${proposal.category}
                            </span>
                        </div>
                    ` : ''}

                    <!-- Voting Section with Chart -->
                    <div style="background: rgba(17, 24, 39, 0.5); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid rgba(55, 65, 81, 1);">
                        <h4 style="color: #00CB97; font-weight: 700; font-size: 0.875rem; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">
                            <i class="ri-bar-chart-line"></i> Voting Analytics
                        </h4>

                        <!-- Vote Distribution Chart -->
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
                            <!-- YES Column -->
                            <div style="text-align: center;">
                                <div style="height: 120px; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; position: relative;">
                                    <div style="width: 60%; background: linear-gradient(180deg, #00CB97 0%, #00e5af 100%); border-radius: 8px 8px 0 0; transition: all 0.5s ease; box-shadow: 0 -4px 12px rgba(0, 203, 151, 0.4); height: ${totalVotes > 0 ? Math.max((yesVotes / totalVotes) * 100, 5) : 5}%; min-height: 30px; display: flex; align-items: center; justify-content: center;">
                                        <span style="font-size: 1.25rem; font-weight: 700; color: white;">${yesVotes}</span>
                                    </div>
                                </div>
                                <div style="margin-top: 8px; padding: 8px; background: rgba(0, 203, 151, 0.1); border-radius: 8px; border: 1px solid rgba(0, 203, 151, 0.3);">
                                    <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                                        <i class="ri-thumb-up-fill" style="color: #00CB97; font-size: 1.125rem;"></i>
                                        <span style="font-weight: 700; color: #00CB97;">YES</span>
                                    </div>
                                    <p style="margin: 4px 0 0 0; font-size: 1.125rem; font-weight: 700; color: white;">${yesPercent}%</p>
                                </div>
                            </div>

                            <!-- NO Column -->
                            <div style="text-align: center;">
                                <div style="height: 120px; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; position: relative;">
                                    <div style="width: 60%; background: linear-gradient(180deg, #ef4444 0%, #f87171 100%); border-radius: 8px 8px 0 0; transition: all 0.5s ease; box-shadow: 0 -4px 12px rgba(239, 68, 68, 0.4); height: ${totalVotes > 0 ? Math.max(((totalVotes - yesVotes) / totalVotes) * 100, 5) : 5}%; min-height: 30px; display: flex; align-items: center; justify-content: center;">
                                        <span style="font-size: 1.25rem; font-weight: 700; color: white;">${noVotes}</span>
                                    </div>
                                </div>
                                <div style="margin-top: 8px; padding: 8px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3);">
                                    <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                                        <i class="ri-thumb-down-fill" style="color: #ef4444; font-size: 1.125rem;"></i>
                                        <span style="font-weight: 700; color: #ef4444;">NO</span>
                                    </div>
                                    <p style="margin: 4px 0 0 0; font-size: 1.125rem; font-weight: 700; color: white;">${100 - yesPercent}%</p>
                                </div>
                            </div>
                        </div>

                        <!-- Total Votes Summary -->
                        <div style="text-align: center; padding: 12px; background: rgba(0, 203, 151, 0.05); border-radius: 8px; border: 1px solid rgba(0, 203, 151, 0.2);">
                            <p style="margin: 0; color: #9ca3af; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;">Total Votes</p>
                            <p style="margin: 4px 0 0 0; font-size: 1.5rem; font-weight: 700; color: white;">${totalVotes}</p>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
                        ${this.currentUser && proposal.status === 'pending' ? `
                            <button style="flex: 1; min-width: 140px; padding: 14px 24px; border-radius: 12px; font-size: 0.9375rem; font-weight: 700; transition: all 0.2s; background: ${userVote?.vote === 'yes' ? 'linear-gradient(135deg, #00CB97 0%, #00e5af 100%)' : 'rgba(0, 203, 151, 0.15)'}; color: ${userVote?.vote === 'yes' ? 'white' : '#00CB97'}; border: 2px solid rgba(0, 203, 151, 0.3); box-shadow: ${userVote?.vote === 'yes' ? '0 4px 12px rgba(0, 203, 151, 0.4)' : 'none'}; ${userVote?.vote === 'yes' ? 'box-shadow: 0 0 0 4px rgba(0, 203, 151, 0.2);' : ''}"
                                    data-action="vote-yes"
                                    data-proposal-id="${proposal.id}"
                                    ${userVote ? 'disabled' : ''}
                                    onclick="event.stopPropagation();"
                                    onmouseover="if(!this.disabled) { this.style.background='linear-gradient(135deg, #00CB97 0%, #00e5af 100%)'; this.style.color='white'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(0, 203, 151, 0.4)'; }"
                                    onmouseout="if(!this.disabled) { this.style.background='rgba(0, 203, 151, 0.15)'; this.style.color='#00CB97'; this.style.transform='translateY(0)'; this.style.boxShadow='none'; }">
                                <i class="ri-thumb-up-fill" style="font-size: 1.25rem;"></i> Vote YES
                            </button>
                            <button style="flex: 1; min-width: 140px; padding: 14px 24px; border-radius: 12px; font-size: 0.9375rem; font-weight: 700; transition: all 0.2s; background: ${userVote?.vote === 'no' ? 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)' : 'rgba(239, 68, 68, 0.15)'}; color: ${userVote?.vote === 'no' ? 'white' : '#ef4444'}; border: 2px solid rgba(239, 68, 68, 0.3); box-shadow: ${userVote?.vote === 'no' ? '0 4px 12px rgba(239, 68, 68, 0.4)' : 'none'}; ${userVote?.vote === 'no' ? 'box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2);' : ''}"
                                    data-action="vote-no"
                                    data-proposal-id="${proposal.id}"
                                    ${userVote ? 'disabled' : ''}
                                    onclick="event.stopPropagation();"
                                    onmouseover="if(!this.disabled) { this.style.background='linear-gradient(135deg, #ef4444 0%, #f87171 100%)'; this.style.color='white'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(239, 68, 68, 0.4)'; }"
                                    onmouseout="if(!this.disabled) { this.style.background='rgba(239, 68, 68, 0.15)'; this.style.color='#ef4444'; this.style.transform='translateY(0)'; this.style.boxShadow='none'; }">
                                <i class="ri-thumb-down-fill" style="font-size: 1.25rem;"></i> Vote NO
                            </button>
                        ` : !this.currentUser && proposal.status === 'pending' ? `
                            <div style="flex: 1; padding: 14px 24px; border-radius: 12px; text-align: center; background: #1f2937; border: 2px solid #374151;">
                                <p style="color: #9ca3af; margin: 0;"><i class="ri-lock-line" style="font-size: 1.25rem;"></i> <a href="index.html" style="color: #14b8a6; text-decoration: underline; font-weight: 700;">Sign in</a> to vote on this proposal</p>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Secondary Actions -->
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        <button style="padding: 12px 20px; border-radius: 10px; font-size: 0.875rem; font-weight: 700; transition: all 0.2s; background: rgba(242, 195, 0, 0.15); color: #F2C300; border: 1px solid rgba(242, 195, 0, 0.3);"
                                data-action="show-comments"
                                data-proposal-id="${proposal.id}"
                                onclick="event.stopPropagation();"
                                onmouseover="this.style.background='rgba(242, 195, 0, 0.25)'; this.style.borderColor='#F2C300';"
                                onmouseout="this.style.background='rgba(242, 195, 0, 0.15)'; this.style.borderColor='rgba(242, 195, 0, 0.3)';">
                            <i class="ri-chat-3-line" style="font-size: 1.125rem;"></i> ${commentsCount} Comments
                        </button>

                        ${isAdmin && proposal.status === 'pending' ? `
                            <button style="padding: 12px 20px; border-radius: 10px; font-size: 0.875rem; font-weight: 700; transition: all 0.2s; background: rgba(99, 27, 221, 0.2); color: #631BDD; border: 1px solid rgba(99, 27, 221, 0.3);"
                                    data-action="approve-proposal"
                                    data-proposal-id="${proposal.id}"
                                    onclick="event.stopPropagation();"
                                    onmouseover="this.style.background='rgba(99, 27, 221, 0.3)'; this.style.borderColor='#631BDD';"
                                    onmouseout="this.style.background='rgba(99, 27, 221, 0.2)'; this.style.borderColor='rgba(99, 27, 221, 0.3)';">
                                <i class="ri-check-double-line" style="font-size: 1.125rem;"></i> Approve & Go Live
                            </button>
                            <button style="padding: 12px 20px; border-radius: 10px; font-size: 0.875rem; font-weight: 700; transition: all 0.2s; background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);"
                                    data-action="reject-proposal"
                                    data-proposal-id="${proposal.id}"
                                    onclick="event.stopPropagation();"
                                    onmouseover="this.style.background='rgba(239, 68, 68, 0.3)'; this.style.borderColor='#ef4444';"
                                    onmouseout="this.style.background='rgba(239, 68, 68, 0.2)'; this.style.borderColor='rgba(239, 68, 68, 0.3)';">
                                <i class="ri-close-circle-line" style="font-size: 1.125rem;"></i> Reject Proposal
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    showCreateProposalModal() {
        console.log('showCreateProposalModal called');

        // Remove any existing modals first
        const existingModal = document.querySelector('.proposal-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'proposal-modal fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
        modal.style.backdropFilter = 'blur(4px)';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl border-2"
                 style="border-color: rgba(0, 203, 151, 0.3);">
                <!-- Header -->
                <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center gap-3">
                        <img src="assets/vote.png" alt="Vote" class="h-10 w-10 logo-no-bg">
                        <h2 class="text-2xl font-bold text-white">Suggest New Market</h2>
                    </div>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <!-- Form -->
                <form id="create-proposal-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Market Title *</label>
                        <input type="text" id="proposal-title" required
                               placeholder="e.g., Will Bitcoin reach $100k in 2025?"
                               class="w-full px-4 py-3 bg-gray-700 border-2 rounded-lg text-white focus:outline-none transition"
                               style="border-color: rgba(0, 203, 151, 0.3);"
                               onfocus="this.style.borderColor='#00CB97'"
                               onblur="this.style.borderColor='rgba(0, 203, 151, 0.3)'">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Description *</label>
                        <textarea id="proposal-description" required rows="4"
                                  placeholder="Describe the market event and resolution criteria..."
                                  class="w-full px-4 py-3 bg-gray-700 border-2 rounded-lg text-white focus:outline-none transition"
                                  style="border-color: rgba(0, 203, 151, 0.3);"
                                  onfocus="this.style.borderColor='#00CB97'"
                                  onblur="this.style.borderColor='rgba(0, 203, 151, 0.3)'"></textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Category</label>
                        <select id="proposal-category"
                                class="w-full px-4 py-3 bg-gray-700 border-2 rounded-lg text-white focus:outline-none transition"
                                style="border-color: rgba(0, 203, 151, 0.3);"
                                onfocus="this.style.borderColor='#00CB97'"
                                onblur="this.style.borderColor='rgba(0, 203, 151, 0.3)'">
                            <option value="">Select category...</option>
                            <option value="Politics">Politics</option>
                            <option value="Sports">Sports</option>
                            <option value="Finance">Finance</option>
                            <option value="Crypto">Crypto</option>
                            <option value="Technology">Technology</option>
                            <option value="Science">Science</option>
                            <option value="Culture">Culture</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Proposed End Date</label>
                        <input type="date" id="proposal-end-date"
                               class="w-full px-4 py-3 bg-gray-700 border-2 rounded-lg text-white focus:outline-none transition"
                               style="border-color: rgba(0, 203, 151, 0.3);"
                               onfocus="this.style.borderColor='#00CB97'"
                               onblur="this.style.borderColor='rgba(0, 203, 151, 0.3)'">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">
                            <i class="ri-image-line"></i> Market Image
                        </label>
                        <div style="display: flex; gap: 12px; margin-bottom: 8px;">
                            <button type="button" id="upload-tab"
                                    style="flex: 1; padding: 8px 16px; border-radius: 8px; font-size: 0.875rem; font-weight: 600; transition: all 0.2s; background: rgba(0, 203, 151, 0.2); color: #00CB97; border: 2px solid rgba(0, 203, 151, 0.4);"
                                    onclick="document.getElementById('upload-section').style.display='block'; document.getElementById('url-section').style.display='none'; this.style.background='rgba(0, 203, 151, 0.2)'; this.style.borderColor='rgba(0, 203, 151, 0.4)'; document.getElementById('url-tab').style.background='rgba(0, 203, 151, 0.05)'; document.getElementById('url-tab').style.borderColor='rgba(0, 203, 151, 0.2)';">
                                <i class="ri-upload-cloud-line"></i> Upload Image
                            </button>
                            <button type="button" id="url-tab"
                                    style="flex: 1; padding: 8px 16px; border-radius: 8px; font-size: 0.875rem; font-weight: 600; transition: all 0.2s; background: rgba(0, 203, 151, 0.05); color: #00CB97; border: 2px solid rgba(0, 203, 151, 0.2);"
                                    onclick="document.getElementById('url-section').style.display='block'; document.getElementById('upload-section').style.display='none'; this.style.background='rgba(0, 203, 151, 0.2)'; this.style.borderColor='rgba(0, 203, 151, 0.4)'; document.getElementById('upload-tab').style.background='rgba(0, 203, 151, 0.05)'; document.getElementById('upload-tab').style.borderColor='rgba(0, 203, 151, 0.2)';">
                                <i class="ri-link"></i> Image URL
                            </button>
                        </div>

                        <!-- Upload Section -->
                        <div id="upload-section">
                            <div style="position: relative; border: 2px dashed rgba(0, 203, 151, 0.3); border-radius: 12px; padding: 24px; text-align: center; background: rgba(0, 203, 151, 0.05); cursor: pointer; transition: all 0.2s;"
                                 onclick="document.getElementById('proposal-image-upload').click()"
                                 onmouseover="this.style.borderColor='#00CB97'; this.style.background='rgba(0, 203, 151, 0.1)'"
                                 onmouseout="this.style.borderColor='rgba(0, 203, 151, 0.3)'; this.style.background='rgba(0, 203, 151, 0.05)'">
                                <input type="file" id="proposal-image-upload" accept="image/*" style="display: none;"
                                       onchange="handleImageUpload(this)">
                                <div id="upload-placeholder">
                                    <i class="ri-image-add-line" style="font-size: 3rem; color: #00CB97; margin-bottom: 8px; display: block;"></i>
                                    <p style="color: #00CB97; font-weight: 600; margin: 0;">Click to upload an image</p>
                                    <p style="color: #6b7280; font-size: 0.75rem; margin: 4px 0 0 0;">PNG, JPG, GIF up to 5MB</p>
                                </div>
                                <div id="image-preview" style="display: none;">
                                    <img id="preview-img" style="max-width: 100%; max-height: 200px; border-radius: 8px; margin-bottom: 8px;">
                                    <p style="color: #00CB97; font-weight: 600; margin: 0;" id="file-name"></p>
                                </div>
                            </div>
                        </div>

                        <!-- URL Section -->
                        <div id="url-section" style="display: none;">
                            <input type="url" id="proposal-image-url"
                                   placeholder="https://example.com/image.jpg"
                                   class="w-full px-4 py-3 bg-gray-700 border-2 rounded-lg text-white focus:outline-none transition"
                                   style="border-color: rgba(0, 203, 151, 0.3);"
                                   onfocus="this.style.borderColor='#00CB97'"
                                   onblur="this.style.borderColor='rgba(0, 203, 151, 0.3)'">
                        </div>
                    </div>

                    <div class="pt-4">
                        <button type="submit"
                                class="w-full px-6 py-4 rounded-xl font-bold text-white text-lg transition"
                                style="background: linear-gradient(135deg, #00CB97 0%, #00e5af 100%);"
                                onmouseover="this.style.transform='scale(1.02)'"
                                onmouseout="this.style.transform='scale(1)'">
                            Submit Proposal
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        console.log('Modal appended to body');

        // Make sure modal is visible
        modal.style.display = 'flex';
        modal.style.zIndex = '9999';

        // Set min date to today
        const dateInput = modal.querySelector('#proposal-end-date');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.setAttribute('min', today);
        }

        // Form submission
        const form = modal.querySelector('#create-proposal-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.createProposal(modal);
            });
        } else {
            console.error('Form not found in modal');
        }

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async createProposal(modal) {
        const title = modal.querySelector('#proposal-title').value;
        const description = modal.querySelector('#proposal-description').value;
        const category = modal.querySelector('#proposal-category').value;
        const endDate = modal.querySelector('#proposal-end-date').value;
        const imageUrl = modal.querySelector('#proposal-image-url').value;
        const imageFile = modal.querySelector('#proposal-image-upload').files[0];
        const submitBtn = modal.querySelector('button[type="submit"]');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';

        try {
            let finalImageUrl = imageUrl || null;

            // If user uploaded a file, upload to Supabase Storage
            if (imageFile) {
                submitBtn.textContent = 'Uploading image...';

                // Create a unique filename
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${this.currentUser.id}_${Date.now()}.${fileExt}`;
                const filePath = `proposal-images/${fileName}`;

                // Upload to Supabase Storage
                const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
                    .from('public-assets')
                    .upload(filePath, imageFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: urlData } = window.supabaseClient.storage
                    .from('public-assets')
                    .getPublicUrl(filePath);

                finalImageUrl = urlData.publicUrl;
            }

            submitBtn.textContent = 'Submitting proposal...';

            const { data, error } = await window.supabaseClient
                .from('proposals')
                .insert([{
                    title,
                    description,
                    category: category || null,
                    image_url: finalImageUrl,
                    end_date: endDate || null,
                    created_by: this.currentUser.id,
                    status: 'pending'
                }]);

            if (error) throw error;

            modal.remove();
            this.loadProposals();

            // Show success message
            this.showToast('Proposal submitted successfully!', 'success');

        } catch (error) {
            console.error('Error creating proposal:', error);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Proposal';
            this.showToast('Error creating proposal: ' + error.message, 'error');
        }
    }

    async vote(proposalId, voteType) {
        if (!this.currentUser) {
            this.showToast('Please sign in to vote', 'error');
            return;
        }

        try {
            const { data, error } = await window.supabaseClient
                .from('proposal_votes')
                .insert([{
                    proposal_id: proposalId,
                    user_id: this.currentUser.id,
                    vote: voteType
                }]);

            if (error) throw error;

            this.showToast(`Voted ${voteType.toUpperCase()}!`, 'success');
            this.loadProposals();

        } catch (error) {
            console.error('Error voting:', error);
            this.showToast('Error voting: ' + error.message, 'error');
        }
    }

    async showCommentsModal(proposalId) {
        // Get proposal and comments
        const { data: proposal, error: proposalError } = await window.supabaseClient
            .from('proposals')
            .select('*, profiles:created_by (username)')
            .eq('id', proposalId)
            .single();

        if (proposalError) {
            this.showToast('Error loading proposal', 'error');
            return;
        }

        const { data: comments, error: commentsError } = await window.supabaseClient
            .from('proposal_comments')
            .select('*, profiles:user_id (username)')
            .eq('proposal_id', proposalId)
            .order('created_at', { ascending: true });

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
        modal.style.backdropFilter = 'blur(4px)';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-2xl p-8 max-w-3xl w-full mx-4 shadow-2xl border-2 max-h-[90vh] overflow-y-auto"
                 style="border-color: rgba(242, 195, 0, 0.3);">
                <!-- Header -->
                <div class="flex items-center justify-between mb-6 sticky top-0 bg-gray-800 pb-4 border-b border-gray-700">
                    <h2 class="text-2xl font-bold text-white">Comments</h2>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <!-- Proposal Title -->
                <div class="mb-6 p-4 rounded-xl" style="background: rgba(242, 195, 0, 0.1);">
                    <h3 class="font-bold text-lg mb-2">${proposal.title}</h3>
                    <p class="text-sm text-gray-400">by ${proposal.profiles?.username || 'Unknown'}</p>
                </div>

                <!-- Comments List -->
                <div id="comments-list" class="space-y-4 mb-6">
                    ${comments && comments.length > 0 ? comments.map(comment => `
                        <div class="p-4 rounded-xl" style="background: rgba(255, 255, 255, 0.05);">
                            <div class="flex items-center gap-2 mb-2">
                                <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                                     style="background: linear-gradient(135deg, #00CB97 0%, #631BDD 100%);">
                                    ${comment.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <p class="font-semibold text-sm">${comment.profiles?.username || 'Unknown'}</p>
                                    <p class="text-xs text-gray-400">${new Date(comment.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                            <p class="text-gray-300">${comment.comment}</p>
                        </div>
                    `).join('') : '<p class="text-gray-400 text-center py-8">No comments yet. Be the first!</p>'}
                </div>

                <!-- Add Comment Form -->
                ${this.currentUser ? `
                    <form id="add-comment-form" class="sticky bottom-0 bg-gray-800 pt-4 border-t border-gray-700">
                        <textarea id="comment-text" required rows="3"
                                  placeholder="Share your thoughts..."
                                  class="w-full px-4 py-3 bg-gray-700 border-2 rounded-lg text-white focus:outline-none transition mb-3"
                                  style="border-color: rgba(242, 195, 0, 0.3);"
                                  onfocus="this.style.borderColor='#F2C300'"
                                  onblur="this.style.borderColor='rgba(242, 195, 0, 0.3)'"></textarea>
                        <button type="submit"
                                class="w-full px-6 py-3 rounded-xl font-bold transition"
                                style="background: linear-gradient(135deg, #F2C300 0%, #ffd700 100%); color: black;"
                                onmouseover="this.style.transform='scale(1.02)'"
                                onmouseout="this.style.transform='scale(1)'">
                            Post Comment
                        </button>
                    </form>
                ` : `
                    <p class="text-gray-400 text-center py-4">
                        <a href="index.html" class="text-teal-400 hover:text-teal-300 underline">Sign in</a> to comment
                    </p>
                `}
            </div>
        `;

        document.body.appendChild(modal);

        // Comment form submission
        if (this.currentUser) {
            modal.querySelector('#add-comment-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.addComment(proposalId, modal);
            });
        }
    }

    async addComment(proposalId, modal) {
        const commentText = modal.querySelector('#comment-text').value;
        const submitBtn = modal.querySelector('button[type="submit"]');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';

        try {
            const { data, error } = await window.supabaseClient
                .from('proposal_comments')
                .insert([{
                    proposal_id: proposalId,
                    user_id: this.currentUser.id,
                    comment: commentText
                }]);

            if (error) throw error;

            // Close and reopen modal to refresh comments
            modal.remove();
            this.showCommentsModal(proposalId);
            this.showToast('Comment posted!', 'success');

        } catch (error) {
            console.error('Error posting comment:', error);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post Comment';
            this.showToast('Error posting comment: ' + error.message, 'error');
        }
    }

    async adminApprove(proposalId) {
        if (!confirm('Approve this proposal and create the market?')) return;

        try {
            // Update proposal status
            const { error } = await window.supabaseClient
                .from('proposals')
                .update({ status: 'approved' })
                .eq('id', proposalId);

            if (error) throw error;

            this.showToast('Proposal approved! You can now create the market in admin panel.', 'success');
            this.loadProposals();

        } catch (error) {
            console.error('Error approving proposal:', error);
            this.showToast('Error approving proposal: ' + error.message, 'error');
        }
    }

    async adminReject(proposalId) {
        if (!confirm('Reject this proposal?')) return;

        try {
            const { error } = await window.supabaseClient
                .from('proposals')
                .update({ status: 'rejected' })
                .eq('id', proposalId);

            if (error) throw error;

            this.showToast('Proposal rejected', 'success');
            this.loadProposals();

        } catch (error) {
            console.error('Error rejecting proposal:', error);
            this.showToast('Error rejecting proposal: ' + error.message, 'error');
        }
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 px-6 py-4 rounded-lg shadow-2xl z-50 animate-slide-in';
        toast.style.background = type === 'success' ? 'rgba(0, 203, 151, 0.9)' : 'rgba(239, 68, 68, 0.9)';
        toast.style.color = 'white';
        toast.style.fontWeight = 'bold';
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(400px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Global function to handle image upload preview
function handleImageUpload(input) {
    const file = input.files[0];
    if (!file) return;

    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        input.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('upload-placeholder').style.display = 'none';
        document.getElementById('image-preview').style.display = 'block';
        document.getElementById('preview-img').src = e.target.result;
        document.getElementById('file-name').textContent = file.name;
    };
    reader.readAsDataURL(file);
}

// Global function to toggle proposal accordion
function toggleProposal(proposalId) {
    const accordion = document.querySelector(`[data-proposal-id="${proposalId}"]`);
    if (!accordion) return;

    const content = accordion.querySelector('.proposal-content');
    const expandIcon = accordion.querySelector('.expand-icon');
    const isExpanded = content.style.display !== 'none';

    if (isExpanded) {
        // Collapse
        content.style.display = 'none';
        expandIcon.style.transform = 'rotate(0deg)';
        accordion.style.borderColor = 'var(--border)';
        accordion.style.boxShadow = 'none';
    } else {
        // Expand
        content.style.display = 'block';
        expandIcon.style.transform = 'rotate(180deg)';
        accordion.style.borderColor = '#00CB97';
        accordion.style.boxShadow = '0 8px 24px rgba(0, 203, 151, 0.2)';
    }
}

// Initialize voting system when DOM is ready (only on standalone voting.html page)
// On index.html, VotingSystem will be initialized by app.js when rendering the voting view
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Only auto-initialize if we're NOT on index.html (no #app div)
        if (!document.getElementById('app')) {
            new VotingSystem();
        }
    });
} else {
    // Only auto-initialize if we're NOT on index.html (no #app div)
    if (!document.getElementById('app')) {
        new VotingSystem();
    }
}

// Expose VotingSystem globally so app.js can use it
window.VotingSystem = VotingSystem;
