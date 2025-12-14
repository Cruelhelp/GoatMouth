# GoatMouth Prediction Market

A modern prediction betting application built with HTML, CSS, JavaScript, Tailwind CSS, and Supabase.

## Setup Instructions

### 1. Database Setup

1. Go to your Supabase dashboard: https://app.supabase.com/project/hvdivdqxsdhabeurwkfb
2. Navigate to the SQL Editor
3. Copy the contents of `database-schema.sql`
4. Execute the SQL to create all tables, indexes, and security policies

### 2. Test Data (Optional)

Run this SQL to add sample markets:

```sql
-- Insert sample markets
INSERT INTO markets (title, description, category, end_date, yes_price, no_price, total_volume) VALUES
('Will Bitcoin reach $100k by end of 2025?', 'Market resolves YES if Bitcoin (BTC) reaches or exceeds $100,000 USD on any major exchange before December 31, 2025, 11:59 PM UTC.', 'Crypto', '2025-12-31 23:59:00+00', 0.6500, 0.3500, 15420.50),
('Will AI replace 10% of software jobs by 2026?', 'Market resolves YES if credible research shows that AI has directly replaced at least 10% of software engineering positions by January 1, 2026.', 'Technology', '2026-01-01 00:00:00+00', 0.4200, 0.5800, 8750.25),
('Will SpaceX land humans on Mars by 2030?', 'Market resolves YES if SpaceX successfully lands at least one human on the surface of Mars before December 31, 2030.', 'Science', '2030-12-31 23:59:00+00', 0.2800, 0.7200, 22100.00);
```

### 3. Local Development

1. Open `index.html` in a modern browser
2. Or use a local server:
   ```bash
   python -m http.server 8000
   # or
   npx http-server
   ```
3. Navigate to `http://localhost:8000`

### 4. First User Setup

1. Click "Sign In"
2. Click "Sign Up"
3. Enter email, password, and username
4. Check your email for verification link
5. After verification, sign in

## Features

### Implemented
- ✅ User authentication (email/password)
- ✅ Market browsing with live prices
- ✅ Bet placement system
- ✅ User portfolio tracking
- ✅ Activity history
- ✅ Real-time updates via Supabase subscriptions
- ✅ Row-level security
- ✅ Responsive design

### Coming Soon
- 📋 Market detail modal with charts
- 📋 Order book matching engine
- 📋 Market creation UI
- 📋 Market resolution workflow
- 📋 Wallet integration (MetaMask)
- 📋 Payment processing
- 📋 Advanced analytics
- 📋 Social features (comments, shares)

## File Structure

```
GoatMouth Market/
├── index.html              # Main entry point
├── database-schema.sql     # Supabase DB schema
├── assets/                 # Images, icons, logo
├── css/
│   └── styles.css         # Custom styles
├── js/
│   ├── supabase-client.js # Supabase initialization
│   ├── api.js             # API service layer
│   └── app.js             # Main application logic
└── pages/                  # Additional pages (future)
```

## Database Schema

### Tables
- `profiles` - User profiles with balance
- `markets` - Prediction markets
- `bets` - User bets/orders
- `positions` - Aggregated user positions
- `transactions` - Financial audit trail

### Security
- Row-level security enabled on all tables
- Users can only view/modify their own data
- Public read access to markets
- Authenticated write access with validation

## Tech Stack

- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Hosting**: Any static host (Vercel, Netlify, GitHub Pages)

## Environment

No build process required - everything runs in the browser.

## API Reference

See `js/api.js` for full API documentation. Key methods:

```javascript
// Auth
api.signUp(email, password, username)
api.signIn(email, password)
api.signOut()

// Markets
api.getMarkets(filters)
api.getMarket(id)
api.createMarket(data)

// Betting
api.placeBet(marketId, outcome, amount, price)
api.getUserBets(userId)
api.getUserPositions(userId)

// Real-time
api.subscribeToMarket(marketId, callback)
api.subscribeToUserBets(userId, callback)
```

## Development Notes

- Auto-matching enabled (no order book yet)
- Prices are in decimal (0-1), displayed as cents
- All monetary values in USD
- UTC timezone for all dates
- Initial balance: $1000 per user

## Next Steps

1. Run the database schema
2. Add sample markets
3. Test authentication flow
4. Place some test bets
5. Check portfolio and activity views

---

Built by Ruel McNeil
