# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GoatMouth is a modern prediction betting application inspired by Polymarket. Users can browse prediction markets, place bets on binary outcomes (YES/NO), track their portfolio, and participate in community governance through proposals and voting.

**Tech Stack:**
- Frontend: Pure HTML5, Tailwind CSS, Vanilla JavaScript (no framework)
- Backend: Supabase (PostgreSQL, Auth, Realtime subscriptions)
- Build: Tailwind CLI (standalone binary)
- Hosting: Static site (can deploy to Vercel, Netlify, GitHub Pages)

## Common Commands

### Development
```bash
# Watch Tailwind CSS for changes (development mode)
./watch.sh

# Build Tailwind CSS for production (minified)
./build.sh

# Serve locally
python -m http.server 8000
# or
npx http-server
```

### Database
- All SQL schema files are in `sql/` directory
- Main schema: `sql/database-schema.sql`
- Contact system: `sql/database-contact-messages.sql`
- Voting/governance: `sql/voting_system.sql`
- Execute SQL in Supabase dashboard at: https://app.supabase.com/project/hvdivdqxsdhabeurwkfb

## Architecture

### Core Application Structure

**Main Controller Pattern:**
The app uses a single-page application (SPA) pattern with a main controller class:
- `js/app.js` - `GoatMouth` class manages routing, auth state, view rendering
- View system: `renderMarketsView()`, `renderPortfolioView()`, `renderActivityView()`
- Navigation handled via `switchView(viewName)` method

**API Service Layer:**
- `js/api.js` - `GoatMouthAPI` class wraps all Supabase operations
- Centralized error handling and data transformation
- Methods grouped by domain: Auth, Markets, Bets, Transactions, Admin, Comments
- All database operations go through this layer (never call Supabase directly in UI code)

**Supabase Client:**
- `js/supabase-client.js` - Initializes Supabase with credentials
- Exports `window.supabaseClient` for use across modules
- **IMPORTANT:** Supabase URL and anon key are in this file (not .env)

### Key JavaScript Files

- `js/app.js` - Main application controller and UI rendering
- `js/api.js` - Complete API service layer for all backend operations
- `js/supabase-client.js` - Supabase initialization
- `js/auth-guard.js` - Page-level authentication guards (for admin.html, voting.html)
- `js/admin.js` - Admin dashboard logic (user/market/message management)
- `js/voting.js` - Governance system (proposals, voting)
- `js/contact.js` - Contact form handling
- `js/market-detail.js` - Market detail modal logic

### HTML Pages

- `index.html` - Main app (markets, portfolio, activity views)
- `admin.html` - Admin dashboard (protected route, role check)
- `voting.html` - Community proposals and voting
- `contact.html` - Contact form for support
- `how-it-works.html` - Educational content
- `privacy.html` / `terms.html` - Legal pages

### Database Schema

**Core Tables:**
- `profiles` - User data (balance, role, username, avatar)
  - Created via trigger on auth.users insert
  - Default balance: $1000
  - RLS: Users can only read/update their own profile
- `markets` - Prediction markets with prices and status
  - Statuses: active, closed, resolved, cancelled
  - Prices stored as decimals (0-1), displayed as cents
- `bets` - User bet orders
  - Auto-matched for now (no order book yet)
  - Statuses: pending, matched, cancelled, settled
- `positions` - Aggregated user positions per market
- `transactions` - Financial audit trail (bets, payouts, deposits, withdrawals)

**Extended Tables:**
- `contact_messages` - Support inquiries
- `message_replies` - Admin responses to contact messages
- `user_messages` - Admin-to-user notifications
- `proposals` - Community governance proposals
- `proposal_votes` - User votes on proposals
- `proposal_comments` - Discussion threads on proposals
- `comments` - Market discussion (nested, with parent_id for replies)

**Row-Level Security (RLS):**
- All tables have RLS enabled
- Users can only access their own financial data
- Markets are publicly readable
- Admin role can access all data

### Authentication Flow

1. User signs up via `api.signUp(email, password, username)`
2. Email verification link sent by Supabase
3. Profile created automatically via database trigger (`handle_new_user()`)
4. User signs in via `api.signIn(email, password)`
5. Auth state managed via `onAuthStateChange` listener
6. Current user stored in `app.currentUser`

### Betting Flow

1. User clicks "Buy YES" or "Buy NO" on a market
2. Validation: Check balance, amount > 0
3. Calculate potential return: `amount / price` (for YES) or `amount / (1 - price)` (for NO)
4. Insert bet record with status='matched' (auto-match)
5. Deduct amount from user balance
6. Update or create position record
7. Log transaction in audit trail
8. Update UI via Supabase realtime subscription

### Admin Resolution Flow

1. Admin navigates to admin.html (guarded by role check)
2. Selects market and resolves with outcome (YES/NO/INVALID)
3. `api.resolveMarket(marketId, outcome)` processes all bets:
   - Winning bets: Calculate payout, add to balance, log transaction
   - Losing bets: Mark as settled with $0 payout
4. Market status updated to 'resolved'

### Real-time Updates

Markets and bets update live via Supabase subscriptions:
```javascript
api.subscribeToMarket(marketId, callback)
api.subscribeToUserBets(userId, callback)
```

### Custom Theming

Tailwind config defines brand colors:
- `goat-teal`: #00CB97
- `goat-purple`: #631BDD
- `goat-yellow`: #FFC107

Custom CSS in `css/styles.css` for animations, modals, loaders.
Mobile-specific styles in `css/mobile.css`.

## Important Notes

### No Build Process Required
The app runs entirely in the browser. The only "build" step is compiling Tailwind CSS (optional for development if using CDN).

### Price Display
- Prices stored as decimals (0-1) in database
- Displayed as cents in UI (0.65 → 65¢)
- JavaScript converts: `Math.round(price * 100)`

### Auto-Matching
Current implementation auto-matches all bets immediately. Order book matching engine is on the roadmap.

### Timezone
All dates are UTC. Use `TIMESTAMP WITH TIME ZONE` in PostgreSQL.

### Initial Balance
New users start with $1000 (set in database trigger).

### File Organization
- Static assets in `assets/`
- Compiled CSS in `css/output.css` (gitignored)
- SQL migrations in `sql/` (run manually in Supabase dashboard)

### Security
- Never commit Supabase credentials (they're public for read-only demo)
- RLS policies enforce data access control
- Admin role checked on both client and server side
- Input validation in both UI and database (CHECK constraints)

## Development Workflow

1. Make changes to HTML/JS files
2. Edit `css/input.css` for custom styles
3. Run `./watch.sh` to auto-compile Tailwind
4. Test locally with a static server
5. Deploy static files to any host

## Supabase Access

- Project URL: https://hvdivdqxsdhabeurwkfb.supabase.co
- Dashboard: https://app.supabase.com/project/hvdivdqxsdhabeurwkfb
- Execute SQL migrations in the SQL Editor
- Monitor realtime subscriptions in the Database > Replication tab

## Common Patterns

### Adding a new API method
1. Add method to `GoatMouthAPI` class in `js/api.js`
2. Use `this.db` to access Supabase client
3. Handle errors with try/catch
4. Return data directly, throw errors

### Adding a new view
1. Create `render{ViewName}View()` method in `GoatMouth` class
2. Add navigation link in `renderNav()`
3. Handle route in `switchView(viewName)`
4. Update view on relevant data changes

### Creating a new table
1. Write SQL migration in `sql/` directory
2. Add RLS policies for security
3. Create indexes for performance
4. Add API methods in `js/api.js`
5. Update UI rendering logic

### Real-time subscriptions
Use Supabase channels for live updates:
```javascript
this.api.db.channel('channel-name')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'table_name' }, callback)
  .subscribe()
```
