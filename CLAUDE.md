# 🧠 Claude Project Memory

## 🗂️ Project Overview
**GoatMouth** is a modern prediction betting platform inspired by Polymarket. Users browse prediction markets, place bets on binary outcomes (YES/NO), track portfolios, and participate in community governance through proposals and voting.

Built as a fast, responsive static web application with real-time data synchronization and a mobile-first design philosophy.

## 🎯 Project Goals
- Enable users to discover, bet on, and track prediction markets across multiple categories
- Provide real-time market updates and portfolio tracking via Supabase subscriptions
- Implement secure, role-based admin controls for market creation and resolution
- Support community governance through proposal voting system
- Deliver seamless mobile and desktop experiences with responsive UI
- Maintain audit trail for all financial transactions and user activities

## 🛠️ Tech Stack
- **Frontend:** Pure HTML5, Tailwind CSS, Vanilla JavaScript (no framework dependencies)
- **Backend:** Supabase (PostgreSQL, Auth, Row-Level Security, Realtime subscriptions)
- **Build:** Tailwind CLI (standalone binary), npm scripts
- **Deployment:** Static hosting (Vercel, Netlify, GitHub Pages compatible)
- **Database:** PostgreSQL via Supabase with RLS policies
- **Auth:** Supabase Auth with email verification

## 🧑 Developer Context
This project is developed by **Ruel McNeil** — senior software developer with strong UI/UX expertise and system-level problem solving.

- Assume high technical proficiency — no hand-holding needed
- Prioritize clean, maintainable, performant code
- Mobile-first responsive design is non-negotiable
- Security through RLS policies, not client-side validation alone
- Terminal and CLI proficiency expected

## 📁 Project Structure

```
GoatMouth-main/
├── public/                  # Static assets (HTML, CSS, JS, images)
│   ├── index.html          # Main app entry point
│   ├── admin.html          # Admin dashboard (protected)
│   ├── voting.html         # Governance proposals
│   ├── contact.html        # Support contact form
│   ├── deposit.html        # Deposit/withdrawal interface
│   ├── earn.html           # Rewards/earnings page
│   ├── how-it-works.html   # Educational content
│   ├── css/
│   │   ├── output.css      # Compiled Tailwind CSS (gitignored)
│   │   ├── styles.css      # Custom styles, animations, modals
│   │   ├── mobile.css      # Mobile-specific overrides
│   │   └── admin.css       # Admin-specific styles
│   ├── js/
│   │   ├── app.js          # Main application controller (GoatMouth class)
│   │   ├── api.js          # API service layer (GoatMouthAPI class)
│   │   ├── supabase-client.js # Supabase initialization
│   │   ├── admin.js        # Admin dashboard logic
│   │   ├── voting.js       # Governance system
│   │   ├── market-detail.js # Market modal logic
│   │   ├── market-page.js  # Market page rendering
│   │   ├── profile.js      # User profile management
│   │   ├── deposit.js      # Deposit/withdrawal handling
│   │   ├── auth-guard.js   # Page-level authentication
│   │   ├── contact.js      # Contact form handling
│   │   ├── header-component.js    # Reusable header
│   │   ├── footer-component.js    # Reusable footer
│   │   ├── sidebar-component.js   # Navigation sidebar
│   │   ├── mobile-nav-component.js # Mobile navigation
│   │   ├── mobile-search.js       # Mobile search UI
│   │   ├── shared-components.js   # Reusable UI elements
│   │   ├── banner-carousel.js     # Banner rotation system
│   │   ├── admin-banners.js       # Admin banner management
│   │   ├── twitter-feed.js        # Twitter integration
│   │   └── toast.js        # Toast notification system
│   └── assets/             # Images, logos, icons
├── src/
│   ├── css/
│   │   └── input.css       # Tailwind input file
│   ├── services/           # Backend service integrations
│   └── middleware/         # Custom middleware (if needed)
├── db/
│   ├── sql/                # SQL schema files
│   ├── migrations/         # Database migration scripts
│   └── supabase-profile-migration.sql # Profile setup
├── docs/                   # Documentation and guides
│   ├── CLAUDE.md           # Extended Claude context (detailed)
│   ├── NOTIFICATIONS_GUIDE.md
│   ├── PROFILE_SETUP.md
│   └── [other guides]
├── archive/                # Backup files
├── scripts/                # Utility scripts
├── package.json            # npm dependencies (Tailwind)
├── tailwind.config.js      # Tailwind configuration
└── vercel.json             # Vercel deployment config
```

## 🏗️ Architecture

### Frontend Architecture Pattern
**Single-Page Application (SPA) with View Controller:**
- Main controller: `GoatMouth` class in `js/app.js`
- View rendering methods: `renderMarketsView()`, `renderPortfolioView()`, `renderActivityView()`
- Routing: `switchView(viewName)` method handles navigation
- State management: `currentUser`, `markets`, `userBets` stored in app instance

### API Service Layer
**Centralized data operations via `GoatMouthAPI` class (`js/api.js`):**
- All Supabase operations go through this layer
- Grouped by domain: Auth, Markets, Bets, Transactions, Admin, Comments, Voting
- Standardized error handling and data transformation
- **IMPORTANT:** Never call Supabase directly in UI code — always use API methods

### Database Schema

**Core Tables:**
- `profiles` - User accounts (balance, role, username, avatar, bio)
  - Auto-created via database trigger on `auth.users` insert
  - Default balance: $1000
  - RLS: Users can read/update only their own profile
- `markets` - Prediction markets (title, description, category, prices, status)
  - Statuses: `active`, `closed`, `resolved`, `cancelled`
  - Prices: stored as decimals (0-1), displayed as cents in UI
- `bets` - User bet orders (market, user, side, amount, price, status)
  - Statuses: `pending`, `matched`, `cancelled`, `settled`
  - Auto-matched for now (order book matching engine is roadmap)
- `positions` - Aggregated user holdings per market (YES/NO shares)
- `transactions` - Financial audit trail (type, amount, reference, timestamp)

**Extended Tables:**
- `contact_messages` - Support inquiries from users
- `message_replies` - Admin responses to contact messages
- `user_messages` - Admin-to-user notifications
- `proposals` - Community governance proposals (title, description, status, votes)
- `proposal_votes` - User votes on proposals (YES/NO)
- `proposal_comments` - Discussion threads on proposals (nested with `parent_id`)
- `comments` - Market discussion threads (nested with `parent_id` for replies)
- `banners` - Homepage banner carousel content (image, link, display_order)
- `notifications` - User notification system (type, message, read status)

**Row-Level Security (RLS):**
- Enabled on all tables
- Users access only their own financial data (bets, positions, transactions)
- Markets and comments are publicly readable
- Admin role bypasses restrictions for management operations

### Authentication Flow
1. User signs up: `api.signUp(email, password, username)`
2. Email verification sent by Supabase
3. Profile auto-created via `handle_new_user()` trigger
4. User signs in: `api.signIn(email, password)`
5. Auth state managed via `onAuthStateChange` listener
6. Current user stored in `app.currentUser`

### Betting Flow
1. User clicks "Buy YES" or "Buy NO" on market
2. **Validation:**
   - Check user balance >= bet amount
   - Verify amount > 0
   - Ensure market is active
3. **Calculate potential return:**
   - YES bet: `amount / price`
   - NO bet: `amount / (1 - price)`
4. **Execute transaction:**
   - Insert bet record with `status='matched'` (auto-match)
   - Deduct amount from user balance
   - Create or update position record
   - Log transaction in audit trail
5. **UI update:** Realtime subscription triggers UI refresh

### Market Resolution Flow (Admin Only)
1. Admin navigates to `admin.html` (protected by role check in `auth-guard.js`)
2. Selects market, chooses outcome (YES/NO/INVALID)
3. `api.resolveMarket(marketId, outcome)` processes all bets:
   - **Winning bets:** Calculate payout, credit user balance, log transaction
   - **Losing bets:** Mark as settled with $0 payout
   - **Invalid market:** Refund all bets
4. Market status updated to `resolved`

### Real-time Updates
**Supabase Realtime Subscriptions:**
```javascript
// Subscribe to market changes
api.subscribeToMarket(marketId, callback)

// Subscribe to user's bets
api.subscribeToUserBets(userId, callback)

// Subscribe to user's notifications
api.subscribeToNotifications(userId, callback)
```

Markets, bets, and notifications update live across all connected clients.

### Custom Theming
**Tailwind brand colors (`tailwind.config.js`):**
- `goat-teal`: #00CB97
- `goat-purple`: #631BDD
- `goat-yellow`: #FFC107

**Custom CSS (`css/styles.css`):**
- Animations, modal overlays, loading spinners
- Mobile-specific styles in `css/mobile.css`
- Admin-specific styles in `css/admin.css`

## 🧾 Key Constraints
- **No frontend framework:** Pure vanilla JavaScript for maximum performance and minimal bundle size
- **Mobile-first:** All UI must work flawlessly on mobile before desktop
- **Static hosting:** No server-side rendering or backend logic — deploy anywhere
- **Security via RLS:** Database policies enforce access control, not just client-side checks
- **Realtime required:** All critical data (markets, bets, balances) must update live
- **Production-ready code:** No placeholder comments, TODO notes, or incomplete features in main branch

## 📜 Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Watch Tailwind CSS for changes (dev mode)
npm run watch

# Build Tailwind CSS for production (minified)
npm run build

# Serve locally
python -m http.server 8000
# or
npx http-server ./public
```

### Database Management
- All SQL schema files in `db/sql/` and `db/migrations/`
- Execute migrations in Supabase SQL Editor:
  - URL: https://app.supabase.com/project/hvdivdqxsdhabeurwkfb
- Monitor realtime subscriptions in **Database > Replication** tab
- Test RLS policies using **Authentication > Users** to impersonate

### Adding New Features

**1. Adding a new API method:**
```javascript
// In js/api.js
async newMethod() {
  try {
    const { data, error } = await this.db
      .from('table_name')
      .select('*')
      .eq('column', value);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in newMethod:', error);
    throw error;
  }
}
```

**2. Adding a new view:**
```javascript
// In js/app.js (GoatMouth class)
renderNewView() {
  const container = document.getElementById('app-container');
  container.innerHTML = `
    <div class="view-content">
      <!-- Your HTML here -->
    </div>
  `;
  // Attach event listeners
}
```

**3. Creating a new table:**
```sql
-- In db/migrations/your_migration.sql
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can read own data" ON new_table
  FOR SELECT USING (auth.uid() = user_id);
```

**4. Adding realtime subscription:**
```javascript
// In js/api.js or component file
subscribeToNewTable(userId, callback) {
  return this.db
    .channel('new-table-channel')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'new_table',
      filter: `user_id=eq.${userId}`
    }, callback)
    .subscribe();
}
```

## 🔒 Security Best Practices
- **Never commit Supabase credentials** (they're in `supabase-client.js` for demo purposes only)
- **RLS policies are the source of truth** — client-side validation is UX, not security
- **Admin role checked on client AND server** — always verify in RLS policies too
- **Input validation:** CHECK constraints in database, plus client-side checks for UX
- **SQL injection:** Supabase client handles parameterization automatically
- **XSS protection:** Always sanitize user-generated content before rendering HTML

## ⚙️ Common Commands

### Development
```bash
# Watch CSS changes
npm run watch

# Build for production
npm run build

# Serve locally (Python)
python -m http.server 8000

# Serve locally (Node)
npx http-server ./public
```

### Database
```bash
# Connect to Supabase project
# Dashboard: https://app.supabase.com/project/hvdivdqxsdhabeurwkfb

# Run migration
# Copy SQL from db/migrations/ and paste in SQL Editor
```

### Deployment
```bash
# Deploy to Vercel (if linked)
vercel --prod

# Deploy to Netlify
netlify deploy --prod --dir=public
```

## 📌 Important Notes

### Price Display
- **Database:** Prices stored as decimals (0.00 to 1.00)
- **UI:** Displayed as cents (0.65 → 65¢)
- **Conversion:** `Math.round(price * 100)`

### Auto-Matching
Current implementation auto-matches all bets immediately. Order book matching engine with limit orders is on the roadmap.

### Timezone
All timestamps are UTC. Use `TIMESTAMP WITH TIME ZONE` in PostgreSQL. Convert to local time in UI if needed.

### Initial Balance
New users receive $1000 starting balance (set in `handle_new_user()` trigger).

### File Organization
- **Static assets:** `public/assets/`
- **Compiled CSS:** `public/css/output.css` (gitignored, built from `src/css/input.css`)
- **SQL migrations:** `db/` directory (run manually in Supabase dashboard)

### No Build Process Required
The app runs entirely in the browser. The only build step is compiling Tailwind CSS (optional for development if using CDN).

## 🔗 Supabase Project Access
- **Project URL:** https://hvdivdqxsdhabeurwkfb.supabase.co
- **Dashboard:** https://app.supabase.com/project/hvdivdqxsdhabeurwkfb
- **SQL Editor:** Execute migrations here
- **Realtime:** Monitor subscriptions in Database > Replication tab
- **Auth:** Manage users in Authentication > Users tab

## 🎨 UI/UX Patterns

### Component Structure
- Reusable components in separate JS files (`header-component.js`, `footer-component.js`, etc.)
- Each component exports render function and optional event handlers
- Mobile components have separate implementations for optimized experience

### Toast Notifications
```javascript
// Import toast.js
showToast('Success message', 'success'); // success, error, info, warning
```

### Modal Pattern
```javascript
// Show modal
document.getElementById('modal-id').classList.remove('hidden');

// Hide modal
document.getElementById('modal-id').classList.add('hidden');
```

### Loading States
```html
<!-- Spinner -->
<div class="spinner"></div>

<!-- Skeleton loader -->
<div class="skeleton-loader"></div>
```

## 🐛 Debugging Tips
- **Auth issues:** Check Supabase dashboard > Authentication > Users
- **RLS errors:** Test policies using "View as user" feature in Supabase
- **Realtime not working:** Check Database > Replication tab for active subscriptions
- **Balance not updating:** Check transactions table for audit trail
- **UI not rendering:** Console.log in render methods, check for JS errors

## 📚 Additional Documentation
See `docs/` directory for:
- `NOTIFICATIONS_GUIDE.md` - Notification system implementation
- `PROFILE_SETUP.md` - User profile configuration
- `BANNER_REDESIGN_SUMMARY.md` - Banner carousel design decisions
- `CONSOLIDATION_PLAN.md` - Code consolidation strategy
- `CLAUDE.md` (in docs/) - Extended, detailed Claude context reference

## 🧠 Claude Instructions
- Reference file locations using `path:line_number` format for easy navigation
- Suggest minimal, production-ready solutions — no over-engineering
- Assume Ruel's high technical proficiency — be concise and direct
- Prioritize performance, maintainability, and clean UI/UX
- When debugging, check RLS policies, database triggers, and realtime subscriptions first
- Remember field mappings, API methods, and architecture patterns as features are built
