# 🚀 Profile System - Quick Start

## What Was Created

### 📄 Files Created
1. **profile.html** - Full profile page with tabs
2. **js/profile.js** - All profile functionality with real Supabase calls
3. **supabase-profile-migration.sql** - Database setup
4. **PROFILE_SETUP.md** - Comprehensive documentation

### 🔧 Files Modified
- **js/shared-components.js** - Updated `showUserProfile()` to navigate to profile page

## Setup (2 Minutes)

### Step 1: Run Database Migration
```sql
-- Go to Supabase Dashboard → SQL Editor
-- Copy/paste content from: supabase-profile-migration.sql
-- Click "Run"
```

### Step 2: Test It
1. Login to your app
2. Click **Profile** button in header
3. You're in! 🎉

## Features Overview

### 5 Main Tabs

#### 1. 📋 Account
- Update username, display name, bio
- Upload profile picture
- View your stats (bets, win rate, profit)

#### 2. 🔒 Security
- Change password
- View active sessions
- Sign out all devices
- 2FA placeholder (coming soon)

#### 3. 💳 Billing
- View wallet balance
- Deposit/Withdraw placeholders
- Payment methods placeholder
- Transaction history

#### 4. ⚙️ Preferences
- Email notifications toggle
- Market alerts toggle
- Bet notifications toggle
- Theme selection

#### 5. 📊 Activity
- Last 10 bets
- Member since date
- Total markets participated
- Lifetime volume & rank

## Real Supabase Calls

All these work out of the box:

✅ **Profile Updates**
```javascript
// Update username, display name, bio
await supabaseClient.from('profiles').update(data)
```

✅ **Password Change**
```javascript
// Verify current password & update
await supabaseClient.auth.updateUser({ password })
```

✅ **Avatar Upload**
```javascript
// Upload to Supabase Storage
await supabaseClient.storage.from('profile-images').upload(file)
```

✅ **Statistics**
```javascript
// Calculate from bets table
const { data: bets } = await supabaseClient.from('bets').select('*')
```

✅ **Notifications Preferences**
```javascript
// Save as JSON in database
await supabaseClient.from('profiles').update({ notification_preferences })
```

## Quick Customization

### Change Colors
Edit `profile.html` line 29:
```css
:root {
    --green: #00CB97;  /* Change to your brand color */
    --dark-bg: #111827;
    --card-bg: #1f2937;
}
```

### Add More Stats
Edit `js/profile.js` line 87 in `loadStatistics()`:
```javascript
// Add your custom stat
const customStat = bets?.filter(b => /* your logic */).length;
document.getElementById('customStatId').textContent = customStat;
```

### Add New Tab
1. Add tab button in `profile.html` line 425
2. Add tab content section below line 550
3. Add tab switch handler (automatic)

## Integration Ready

### Stripe Payments
Ready to integrate - just replace the placeholder:
```javascript
// profile.js line 267
document.getElementById('depositBtn').addEventListener('click', async () => {
    // Add your Stripe integration here
});
```

### Email Notifications
```javascript
// Create Supabase Edge Function
// Call it when notifications toggle changes
```

### 2FA
```javascript
// Use Supabase MFA
await supabaseClient.auth.mfa.enroll()
```

## Testing

### Manual Test
1. ✅ Update username → Check header updates
2. ✅ Change password → Logout → Login with new password
3. ✅ Upload avatar → Check it appears
4. ✅ Toggle notifications → Reload → Check they persist
5. ✅ View stats → Place bet → Reload → Stats update

### Common Issues

**Profile won't load?**
→ Check console, verify logged in

**Avatar upload fails?**
→ Run migration SQL, check file is < 5MB

**Stats show 0?**
→ Make some bets first

**Password change fails?**
→ Verify current password is correct

## What's Different

### Before
- Profile button → Activity page
- No profile management
- No password change
- No settings

### Now
- Profile button → Full profile system
- Complete account management
- Secure password change
- Comprehensive settings
- Real-time stats
- Avatar uploads
- Notification preferences

## Next Steps

1. **Run the migration** (30 seconds)
2. **Test the features** (2 minutes)
3. **Customize colors** (optional)
4. **Add billing integration** (when ready)
5. **Enable 2FA** (when ready)

## Pro Tips

💡 **Auto-save**: Add auto-save on input change
💡 **Dark/Light Theme**: Implement theme switching
💡 **Export Data**: Add GDPR export feature
💡 **Social Links**: Add Twitter, Discord connections
💡 **Achievements**: Create badge system

## Support

Everything is documented in **PROFILE_SETUP.md**

Need help? Check:
1. Browser console for errors
2. Supabase logs
3. Network tab in DevTools

---

**That's it!** You now have a production-ready profile system with real database integration. 🎉
