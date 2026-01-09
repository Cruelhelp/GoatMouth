// Twitter/X Feed Component for GoatMouth
// Displays live tweets from @GoatMouth92268

class TwitterFeed {
    constructor() {
        this.username = 'GoatMouth92268';
        this.tweetCache = [];
        this.lastFetchTime = null;
        this.refreshInterval = 5 * 60 * 1000; // 5 minutes
        this.maxTweets = 5;
        this.init();
    }

    async init() {
        await this.fetchTweets();
        this.render();
        this.startAutoRefresh();
    }

    async fetchTweets() {
        try {
            // Using Twitter API v2 via backend proxy
            // You'll need to set up a backend endpoint that calls Twitter API
            // This prevents exposing your API keys in the frontend

            const response = await fetch('/api/twitter/tweets', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch tweets');
            }

            const data = await response.json();

            if (data.data && data.data.length > 0) {
                this.tweetCache = data.data.slice(0, this.maxTweets);
                this.lastFetchTime = new Date();
                this.render();
            }
        } catch (error) {
            console.error('Error fetching tweets:', error);
            // Fallback to embedded timeline if API fails
            this.renderEmbeddedTimeline();
        }
    }

    render() {
        const container = document.getElementById('twitter-feed-container');
        if (!container) return;

        if (this.tweetCache.length === 0) {
            // Show embedded timeline as fallback
            this.renderEmbeddedTimeline();
            return;
        }

        container.innerHTML = `
            <div class="twitter-feed-widget">
                <div class="twitter-feed-header">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="#1DA1F2">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span style="font-weight: 700; color: white; font-size: 0.875rem;">Latest from @${this.username}</span>
                    </div>
                    <a href="https://twitter.com/${this.username}"
                       target="_blank"
                       rel="noopener noreferrer"
                       style="color: #1DA1F2; font-size: 0.75rem; text-decoration: none; font-weight: 600;"
                       onmouseover="this.style.textDecoration='underline'"
                       onmouseout="this.style.textDecoration='none'">
                        Follow
                    </a>
                </div>

                <div class="twitter-feed-content">
                    ${this.tweetCache.map(tweet => this.renderTweet(tweet)).join('')}
                </div>

                <div class="twitter-feed-footer">
                    <a href="https://twitter.com/${this.username}"
                       target="_blank"
                       rel="noopener noreferrer"
                       style="color: #1DA1F2; font-size: 0.75rem; text-decoration: none; display: flex; align-items: center; gap: 4px; font-weight: 600;"
                       onmouseover="this.style.textDecoration='underline'"
                       onmouseout="this.style.textDecoration='none'">
                        View more on X
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M7 17L17 7M17 7H7M17 7V17"/>
                        </svg>
                    </a>
                </div>
            </div>
        `;
    }

    renderTweet(tweet) {
        const text = this.formatTweetText(tweet.text);
        const timeAgo = this.getTimeAgo(tweet.created_at);
        const tweetUrl = `https://twitter.com/${this.username}/status/${tweet.id}`;

        return `
            <div class="twitter-feed-tweet">
                <div class="tweet-text">${text}</div>
                <div class="tweet-meta">
                    <a href="${tweetUrl}"
                       target="_blank"
                       rel="noopener noreferrer"
                       style="color: #9ca3af; font-size: 0.6875rem; text-decoration: none;"
                       onmouseover="this.style.color='#1DA1F2'"
                       onmouseout="this.style.color='#9ca3af'">
                        ${timeAgo}
                    </a>
                    <div style="display: flex; gap: 12px; color: #9ca3af; font-size: 0.6875rem;">
                        ${tweet.public_metrics ? `
                            <span title="Likes">❤️ ${this.formatNumber(tweet.public_metrics.like_count)}</span>
                            <span title="Retweets">🔄 ${this.formatNumber(tweet.public_metrics.retweet_count)}</span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderEmbeddedTimeline() {
        const container = document.getElementById('twitter-feed-container');
        if (!container) return;

        // Use Twitter's embedded timeline widget as fallback
        container.innerHTML = `
            <div class="twitter-feed-widget">
                <div class="twitter-feed-header">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="#1DA1F2">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span style="font-weight: 700; color: white; font-size: 0.875rem;">@${this.username}</span>
                    </div>
                    <a href="https://twitter.com/${this.username}"
                       target="_blank"
                       rel="noopener noreferrer"
                       style="color: #1DA1F2; font-size: 0.75rem; text-decoration: none; font-weight: 600;"
                       onmouseover="this.style.textDecoration='underline'"
                       onmouseout="this.style.textDecoration='none'">
                        Follow
                    </a>
                </div>

                <a class="twitter-timeline"
                   href="https://twitter.com/${this.username}?ref_src=twsrc%5Etfw"
                   data-height="400"
                   data-theme="dark"
                   data-chrome="noheader nofooter noborders transparent"
                   data-tweet-limit="5">
                    Loading tweets...
                </a>
            </div>
        `;

        // Load Twitter widget script if not already loaded
        if (!window.twttr) {
            const script = document.createElement('script');
            script.src = 'https://platform.twitter.com/widgets.js';
            script.async = true;
            script.charset = 'utf-8';
            document.body.appendChild(script);
        } else if (window.twttr.widgets) {
            window.twttr.widgets.load();
        }
    }

    formatTweetText(text) {
        // Convert URLs to links
        let formatted = text.replace(
            /https?:\/\/[^\s]+/g,
            url => `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #1DA1F2; text-decoration: none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${url}</a>`
        );

        // Convert mentions to links
        formatted = formatted.replace(
            /@(\w+)/g,
            (match, username) => `<a href="https://twitter.com/${username}" target="_blank" rel="noopener noreferrer" style="color: #1DA1F2; text-decoration: none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">@${username}</a>`
        );

        // Convert hashtags to links
        formatted = formatted.replace(
            /#(\w+)/g,
            (match, hashtag) => `<a href="https://twitter.com/hashtag/${hashtag}" target="_blank" rel="noopener noreferrer" style="color: #1DA1F2; text-decoration: none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">#${hashtag}</a>`
        );

        return formatted;
    }

    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    formatNumber(num) {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    }

    startAutoRefresh() {
        setInterval(() => {
            this.fetchTweets();
        }, this.refreshInterval);
    }
}

function shouldEnableTwitterFeed() {
    const host = window.location.hostname;
    return host !== 'localhost' && host !== '127.0.0.1';
}

// Auto-initialize if container exists
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!shouldEnableTwitterFeed()) {
            console.log('[TwitterFeed] Disabled on localhost');
            return;
        }
        if (document.getElementById('twitter-feed-container')) {
            window.twitterFeed = new TwitterFeed();
        }
    });
} else {
    if (!shouldEnableTwitterFeed()) {
        console.log('[TwitterFeed] Disabled on localhost');
    } else if (document.getElementById('twitter-feed-container')) {
        window.twitterFeed = new TwitterFeed();
    }
}

console.log('✓ Twitter feed component loaded');
