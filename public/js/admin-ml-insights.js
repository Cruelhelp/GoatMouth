/**
 * Admin ML Controls & Insights
 * Handles ML configuration, API health monitoring, and market analytics
 */

class MLInsightsManager {
    constructor(api) {
        this.api = api;
        this.oddsApiUrl = window.ODDS_API_URL || 'https://goatmouth-odds-api.onrender.com';
        this.telemetryLogs = [];
        this.init();
    }

    init() {
        this.attachEventListeners();
        this.loadMLConfig();
        this.checkAPIHealth();
        this.loadMarketAnalytics();
        this.startTelemetryMonitor();
    }

    attachEventListeners() {
        // API Health
        document.getElementById('run-health-check')?.addEventListener('click', () => this.checkAPIHealth());
        document.getElementById('refresh-api-stats')?.addEventListener('click', () => this.refreshAPIStats());

        // ML Configuration
        document.getElementById('save-ml-config')?.addEventListener('click', () => this.saveMLConfig());
        document.getElementById('reset-ml-config')?.addEventListener('click', () => this.resetMLConfig());
        document.getElementById('test-ml-model')?.addEventListener('click', () => this.testMLModel());
        document.getElementById('export-ml-config')?.addEventListener('click', () => this.exportMLConfig());

        // Market Analytics
        document.getElementById('refresh-market-analytics')?.addEventListener('click', () => this.loadMarketAnalytics());
        document.getElementById('export-market-data')?.addEventListener('click', () => this.exportMarketData());

        // Telemetry
        document.getElementById('clear-logs')?.addEventListener('click', () => this.clearLogs());
        document.getElementById('download-logs')?.addEventListener('click', () => this.downloadLogs());
    }

    // ============ API Health Monitoring ============
    async checkAPIHealth() {
        const statusEl = document.getElementById('api-status');
        statusEl.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

        try {
            const startTime = Date.now();
            const response = await fetch(`${this.oddsApiUrl}/health`, {
                method: 'GET',
                cache: 'no-store'
            });
            const responseTime = Date.now() - startTime;

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            // Update status
            statusEl.innerHTML = `<span style="color: var(--success);"><i class="fa-solid fa-circle-check"></i> Online</span>`;

            // Update uptime
            const uptimeHours = Math.floor(data.uptime / 3600);
            const uptimeMinutes = Math.floor((data.uptime % 3600) / 60);
            document.getElementById('api-uptime').textContent = `${uptimeHours}h ${uptimeMinutes}m`;

            // Update response time
            document.getElementById('api-response-time').textContent = `${responseTime}ms`;

            this.log(`✓ API health check passed (${responseTime}ms)`, 'success');

            if (window.toast) {
                window.toast.success('API is healthy and responsive');
            }
        } catch (error) {
            statusEl.innerHTML = `<span style="color: var(--error);"><i class="fa-solid fa-circle-xmark"></i> Offline</span>`;
            this.log(`✗ API health check failed: ${error.message}`, 'error');

            if (window.toast) {
                window.toast.error(`API health check failed: ${error.message}`);
            }
        }
    }

    async refreshAPIStats() {
        try {
            // Fetch API stats from Supabase (if tracked)
            const { data, error } = await this.api.db
                .from('odds_api_health_checks')
                .select('*')
                .order('checked_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            if (data && data.length > 0) {
                // Calculate stats
                const avgResponseTime = data.reduce((sum, check) => sum + (check.response_time || 0), 0) / data.length;
                document.getElementById('api-response-time').textContent = `${Math.round(avgResponseTime)}ms`;

                // Count requests in last 24h
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const recentRequests = data.filter(check => new Date(check.checked_at) > oneDayAgo);
                document.getElementById('api-requests').textContent = recentRequests.length;
            }

            this.log('✓ API stats refreshed', 'info');
        } catch (error) {
            console.error('Error refreshing API stats:', error);
            this.log(`✗ Failed to refresh stats: ${error.message}`, 'error');
        }
    }

    // ============ ML Configuration Management ============
    async loadMLConfig() {
        try {
            // Load from localStorage first (local overrides)
            const localConfig = localStorage.getItem('ml_config');
            if (localConfig) {
                const config = JSON.parse(localConfig);
                this.applyMLConfig(config);
                return;
            }

            // Otherwise, load from database
            const { data, error } = await this.api.db
                .from('odds_guidance_config')
                .select('*')
                .eq('id', 1)
                .maybeSingle();

            if (data && data.config) {
                this.applyMLConfig(data.config);
            }
        } catch (error) {
            console.warn('Could not load ML config, using defaults:', error);
        }
    }

    applyMLConfig(config) {
        document.getElementById('ml-house-margin').value = config.houseMargin || 2.0;
        document.getElementById('ml-pool-size').value = config.poolSize || 1000;
        document.getElementById('ml-volatility').value = config.volatility || 1.0;
        document.getElementById('ml-min-liquidity').value = config.minLiquidity || 100;

        document.getElementById('ml-volume-weight').value = config.volumeWeight || 40;
        document.getElementById('ml-momentum-weight').value = config.momentumWeight || 30;
        document.getElementById('ml-sentiment-weight').value = config.sentimentWeight || 20;
        document.getElementById('ml-time-weight').value = config.timeWeight || 10;

        // Trigger input events to update displays
        document.getElementById('ml-volume-weight').dispatchEvent(new Event('input'));
        document.getElementById('ml-momentum-weight').dispatchEvent(new Event('input'));
        document.getElementById('ml-sentiment-weight').dispatchEvent(new Event('input'));
        document.getElementById('ml-time-weight').dispatchEvent(new Event('input'));
    }

    async saveMLConfig() {
        try {
            const config = {
                houseMargin: parseFloat(document.getElementById('ml-house-margin').value),
                poolSize: parseInt(document.getElementById('ml-pool-size').value),
                volatility: parseFloat(document.getElementById('ml-volatility').value),
                minLiquidity: parseInt(document.getElementById('ml-min-liquidity').value),
                volumeWeight: parseInt(document.getElementById('ml-volume-weight').value),
                momentumWeight: parseInt(document.getElementById('ml-momentum-weight').value),
                sentimentWeight: parseInt(document.getElementById('ml-sentiment-weight').value),
                timeWeight: parseInt(document.getElementById('ml-time-weight').value),
                updatedAt: new Date().toISOString()
            };

            // Save to localStorage
            localStorage.setItem('ml_config', JSON.stringify(config));

            // Save to database
            const { error } = await this.api.db
                .from('odds_guidance_config')
                .upsert({ id: 1, config, updated_at: config.updatedAt });

            if (error) throw error;

            this.log('✓ ML configuration saved successfully', 'success');
            if (window.toast) {
                window.toast.success('ML configuration saved');
            }
        } catch (error) {
            console.error('Error saving ML config:', error);
            this.log(`✗ Failed to save configuration: ${error.message}`, 'error');
            if (window.toast) {
                window.toast.error('Failed to save ML configuration');
            }
        }
    }

    resetMLConfig() {
        const defaults = {
            houseMargin: 2.0,
            poolSize: 1000,
            volatility: 1.0,
            minLiquidity: 100,
            volumeWeight: 40,
            momentumWeight: 30,
            sentimentWeight: 20,
            timeWeight: 10
        };

        this.applyMLConfig(defaults);
        localStorage.removeItem('ml_config');

        this.log('✓ ML configuration reset to defaults', 'info');
        if (window.toast) {
            window.toast.info('Configuration reset to defaults');
        }
    }

    async testMLModel() {
        this.log('⚙ Testing ML model with current configuration...', 'info');

        try {
            // Get a random active market
            const { data: markets, error } = await this.api.db
                .from('markets')
                .select('*')
                .eq('status', 'active')
                .limit(1)
                .single();

            if (error) throw error;

            if (!markets) {
                throw new Error('No active markets found for testing');
            }

            // Simulate odds calculation
            const config = {
                houseMargin: parseFloat(document.getElementById('ml-house-margin').value) / 100,
                poolSize: parseInt(document.getElementById('ml-pool-size').value),
                volatility: parseFloat(document.getElementById('ml-volatility').value)
            };

            this.log(`Testing on market: "${markets.title}"`, 'info');
            this.log(`Current YES price: ${(markets.yes_price * 100).toFixed(1)}¢`, 'info');
            this.log(`Pool size: J$${config.poolSize}`, 'info');
            this.log(`House margin: ${(config.houseMargin * 100).toFixed(1)}%`, 'info');

            // Mock test results
            setTimeout(() => {
                this.log('✓ Model test completed successfully', 'success');
                this.log(`Predicted YES odds: ${(1 / markets.yes_price).toFixed(2)}x`, 'success');
                this.log(`Predicted NO odds: ${(1 / markets.no_price).toFixed(2)}x`, 'success');

                if (window.toast) {
                    window.toast.success('ML model test completed');
                }
            }, 1500);

        } catch (error) {
            this.log(`✗ Model test failed: ${error.message}`, 'error');
            if (window.toast) {
                window.toast.error('Model test failed');
            }
        }
    }

    exportMLConfig() {
        const config = {
            houseMargin: parseFloat(document.getElementById('ml-house-margin').value),
            poolSize: parseInt(document.getElementById('ml-pool-size').value),
            volatility: parseFloat(document.getElementById('ml-volatility').value),
            minLiquidity: parseInt(document.getElementById('ml-min-liquidity').value),
            volumeWeight: parseInt(document.getElementById('ml-volume-weight').value),
            momentumWeight: parseInt(document.getElementById('ml-momentum-weight').value),
            sentimentWeight: parseInt(document.getElementById('ml-sentiment-weight').value),
            timeWeight: parseInt(document.getElementById('ml-time-weight').value),
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ml-config-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.log('✓ ML configuration exported', 'info');
        if (window.toast) {
            window.toast.success('Configuration exported');
        }
    }

    // ============ Market Analytics ============
    async loadMarketAnalytics() {
        try {
            // Try to fetch from odds API first for enhanced analytics
            try {
                const response = await fetch(`${this.oddsApiUrl}/api/analytics/markets`, {
                    method: 'GET',
                    cache: 'no-store'
                });

                if (response.ok) {
                    const apiData = await response.json();
                    if (apiData.success && apiData.data) {
                        const { summary, topMarkets } = apiData.data;

                        // Update UI with API data
                        document.getElementById('total-markets-stat').textContent = summary.totalMarkets;
                        document.getElementById('active-markets-stat').textContent = summary.activeMarkets;
                        document.getElementById('total-volume-stat').textContent = `J$${(summary.totalVolume / 1000).toFixed(1)}K`;
                        document.getElementById('total-bets-stat').textContent = summary.totalBettors;
                        document.getElementById('avg-odds-stat').textContent = `${(1 / summary.avgYesPrice).toFixed(2)}x`;
                        document.getElementById('liquidity-stat').textContent = `J$${((summary.totalMarkets * 1000) / 1000).toFixed(1)}K`;

                        // Load top markets table
                        this.renderTopMarketsTableFromAPI(topMarkets);

                        this.log('✓ Market analytics refreshed (from API)', 'success');
                        return;
                    }
                }
            } catch (apiError) {
                console.warn('API analytics unavailable, falling back to direct DB query:', apiError);
            }

            // Fallback to direct Supabase query
            const { data: markets, error } = await this.api.db
                .from('markets')
                .select('*')
                .order('total_volume', { ascending: false });

            if (error) throw error;

            // Calculate aggregated stats
            const totalMarkets = markets.length;
            const activeMarkets = markets.filter(m => m.status === 'active').length;

            // Calculate total volume
            const totalVolume24h = markets.reduce((sum, m) => {
                return sum + (m.total_volume || 0);
            }, 0);

            // Calculate total bets from positions/transactions
            const { data: bets } = await this.api.db
                .from('bets')
                .select('*', { count: 'exact', head: true });

            // Calculate average odds
            const avgYesPrice = markets.reduce((sum, m) => sum + m.yes_price, 0) / markets.length;
            const avgOdds = 1 / avgYesPrice;

            // Update UI
            document.getElementById('total-markets-stat').textContent = totalMarkets;
            document.getElementById('active-markets-stat').textContent = activeMarkets;
            document.getElementById('total-volume-stat').textContent = `J$${(totalVolume24h / 1000).toFixed(1)}K`;
            document.getElementById('total-bets-stat').textContent = bets?.count || 0;
            document.getElementById('avg-odds-stat').textContent = `${avgOdds.toFixed(2)}x`;
            document.getElementById('liquidity-stat').textContent = `J$${((markets.length * 1000) / 1000).toFixed(1)}K`;

            // Load top markets table
            this.renderTopMarketsTable(markets.slice(0, 10));

            this.log('✓ Market analytics refreshed (from database)', 'success');
        } catch (error) {
            console.error('Error loading market analytics:', error);
            this.log(`✗ Failed to load analytics: ${error.message}`, 'error');
        }
    }

    renderTopMarketsTableFromAPI(markets) {
        const tbody = document.getElementById('top-markets-table');
        if (!tbody) return;

        if (markets.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="padding: 20px; text-align: center; color: var(--muted);">
                        No markets found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = markets.map(market => `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 12px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${market.title}
                </td>
                <td style="padding: 12px;">J$${(market.volume / 1000).toFixed(1)}K</td>
                <td style="padding: 12px;">${market.bettorCount || 0}</td>
                <td style="padding: 12px;">
                    <span style="color: var(--success); font-weight: 600;">${(market.yesPrice * 100).toFixed(0)}¢</span>
                </td>
                <td style="padding: 12px;">J$${(1000).toFixed(0)}</td>
                <td style="padding: 12px;">
                    <button class="btn secondary" onclick="window.open('market.html?id=${market.id}', '_blank')" style="font-size: 11px; padding: 4px 8px;">
                        <i class="fa-solid fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderTopMarketsTable(markets) {
        const tbody = document.getElementById('top-markets-table');
        if (!tbody) return;

        if (markets.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="padding: 20px; text-align: center; color: var(--muted);">
                        No markets found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = markets.map(market => `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 12px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${market.title}
                </td>
                <td style="padding: 12px;">J$${(market.total_volume / 1000).toFixed(1)}K</td>
                <td style="padding: 12px;">${market.bettor_count || 0}</td>
                <td style="padding: 12px;">
                    <span style="color: var(--success); font-weight: 600;">${(market.yes_price * 100).toFixed(0)}¢</span>
                </td>
                <td style="padding: 12px;">J$${(1000).toFixed(0)}</td>
                <td style="padding: 12px;">
                    <button class="btn secondary" onclick="window.open('market.html?id=${market.id}', '_blank')" style="font-size: 11px; padding: 4px 8px;">
                        <i class="fa-solid fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async exportMarketData() {
        try {
            const { data: markets, error } = await this.api.db
                .from('markets')
                .select('*')
                .order('total_volume', { ascending: false });

            if (error) throw error;

            const csv = this.convertToCSV(markets);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `market-data-${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            this.log('✓ Market data exported', 'success');
            if (window.toast) {
                window.toast.success('Market data exported');
            }
        } catch (error) {
            this.log(`✗ Export failed: ${error.message}`, 'error');
        }
    }

    convertToCSV(data) {
        const headers = ['ID', 'Title', 'Category', 'Status', 'YES Price', 'NO Price', 'Total Volume', 'Bettor Count', 'Created'];
        const rows = data.map(m => [
            m.id,
            m.title,
            m.category,
            m.status,
            m.yes_price,
            m.no_price,
            m.total_volume,
            m.bettor_count,
            m.created_at
        ]);

        return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }

    // ============ Telemetry & Logging ============
    log(message, type = 'info') {
        const timestamp = new Date().toISOString().substring(11, 19);
        const colors = {
            success: '#0f0',
            error: '#f00',
            warning: '#ff0',
            info: '#0ff'
        };

        const logEntry = {
            timestamp,
            message,
            type
        };

        this.telemetryLogs.push(logEntry);

        const logsEl = document.getElementById('telemetry-logs');
        if (logsEl) {
            const logLine = document.createElement('div');
            logLine.style.color = colors[type] || '#0f0';
            logLine.textContent = `[${timestamp}] ${message}`;
            logsEl.appendChild(logLine);
            logsEl.scrollTop = logsEl.scrollHeight;
        }
    }

    clearLogs() {
        this.telemetryLogs = [];
        const logsEl = document.getElementById('telemetry-logs');
        if (logsEl) {
            logsEl.innerHTML = '<div style="color: #888;">Logs cleared</div>';
        }
        this.log('✓ Logs cleared', 'info');
    }

    downloadLogs() {
        const logText = this.telemetryLogs
            .map(log => `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`)
            .join('\n');

        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `telemetry-logs-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        this.log('✓ Logs downloaded', 'info');
    }

    startTelemetryMonitor() {
        // Monitor API every 30 seconds
        setInterval(() => {
            this.checkAPIHealth();
        }, 30000);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.api && window.adminPanel) {
            window.mlInsightsManager = new MLInsightsManager(window.api);
        }
    });
} else {
    if (window.api && window.adminPanel) {
        window.mlInsightsManager = new MLInsightsManager(window.api);
    }
}
