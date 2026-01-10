# 🎯 GoatMouth Profile System Setup

## Overview
Comprehensive user profile management system with real Supabase integration.

## Features

### ✅ Account Management
- **Personal Information**: Update username, display name, email, bio
- **Profile Avatar**: Upload and manage profile pictures
- **Real-time Validation**: Username uniqueness checks
- **Stats Display**: Total bets, win rate, profit/loss tracking

### 🔒 Security
- **Password Change**: Update password with current password verification
- **Two-Factor Authentication**: Placeholder for 2FA setup (coming soon)
- **Active Sessions**: View current device and sign out all devices
- **Session Management**: Global logout capability

### 💳 Billing
- **Wallet Balance**: View current balance
- **Deposit/Withdraw**: Placeholders ready for payment integration
- **Payment Methods**: Ready for Stripe/payment provider integration
- **Transaction History**: View all transactions

### ⚙️ Preferences
- **Notifications**: Toggle email, market alerts, bet notifications
- **Appearance**: Theme selection (dark mode active)
- **Language & Region**: Currency and timezone display

### 📊 Activity
- **Recent Activity**: Last 10 bets with status
- **Account Statistics**: Member since, total markets, lifetime volume, rank
- **Detailed Analytics**: Win/loss tracking

## Database Setup

### 1. Run Migration
Execute the SQL migration in Supabase SQL Editor:
```bash
# File: supabase-profile-migration.sql
```

This adds:
- `display_name` - User-friendly display name
- `bio` - User biography
- `avatar_url` - Profile picture URL
- `notification_preferences` - JSON notification settings
- `updated_at` - Last update timestamp

### 2. Storage Bucket
The migration automatically creates:
- Bucket: `profile-images`
- Folder structure: `avatars/`
- Public read access
- User upload permissions

### 3. Verify Tables
Ensure these tables exist:
- ✅ `profiles` - User profile data
- ✅ `bets` - User betting history
- ✅ `markets` - Market information

## File Structure

```
GoatMouth-main/
├── profile.html              # Profile page UI
├── js/
│   └── profile.js            # Profile management logic
├── supabase-profile-migration.sql
└── PROFILE_SETUP.md
```

## Usage

### Accessing Profile
Users can access their profile by:
1. Clicking **Profile** button in header
2. Direct URL: `profile.html`
3. Auto-redirects to home if not authenticated

### Features Implemented

#### ✅ Working Features
- Profile info update (username, display name, bio)
- Password change with verification
- Avatar upload to Supabase storage
- Notification preferences toggle
- Stats calculation from database
- Recent activity display
- Logout all devices
- Responsive design

#### 🚧 Placeholder Features (Ready for Integration)
- Two-factor authentication
- Deposit funds
- Withdraw funds
- Payment methods
- Transaction history details

## API Calls Used

### Profile Operations
```javascript
// Get current user
const user = await supabaseClient.auth.getUser()

// Update profile
await supabaseClient
    .from('profiles')
    .update({ username, display_name, bio })
    .eq('id', user.id)

// Check username availability
await supabaseClient
    .from('profiles')
    .select('id')
    .eq('username', newUsername)

// Update password
await supabaseClient.auth.updateUser({
    password: newPassword
})
```

### Avatar Upload
```javascript
// Upload avatar
await supabaseClient.storage
    .from('profile-images')
    .upload(`avatars/${filename}`, file)

// Get public URL
const { data: { publicUrl } } = supabaseClient.storage
    .from('profile-images')
    .getPublicUrl(filePath)
```

### Statistics
```javascript
// Get user bets
const { data: bets } = await supabaseClient
    .from('bets')
    .select('*')
    .eq('user_id', userId)

// Get user rank
const { data: profiles } = await supabaseClient
    .from('profiles')
    .select('id, balance')
    .order('balance', { ascending: false })
```

## Customization

### Adding New Fields
1. Add column to Supabase `profiles` table
2. Add form field in `profile.html`
3. Update `updateProfile()` in `profile.js`

### Adding Billing Integration

#### Stripe Example
```javascript
// In profile.js, replace depositBtn click handler:
document.getElementById('depositBtn').addEventListener('click', async () => {
    const amount = prompt('Enter deposit amount:');

    // Create Stripe checkout session
    const { data, error } = await supabaseClient.functions.invoke('create-checkout', {
        body: { amount: parseFloat(amount) }
    });

    if (data?.url) {
        window.location.href = data.url;
    }
});
```

### Adding 2FA
```javascript
// Replace enable2FABtn handler:
document.getElementById('enable2FABtn').addEventListener('click', async () => {
    const { data, error } = await supabaseClient.auth.mfa.enroll({
        factorType: 'totp'
    });

    // Show QR code for user to scan
    showQRCodeModal(data.totp.qr_code);
});
```

## Security Best Practices

### ✅ Implemented
- Password verification before change
- Username uniqueness validation
- File type and size validation for avatars
- Authenticated-only access
- Input sanitization

### 🔒 Recommendations
- Add rate limiting on profile updates
- Implement email verification for email changes
- Add CAPTCHA for sensitive operations
- Log security-related events

## Styling

### Design System
- **Primary Color**: `#00CB97` (Green)
- **Background**: `#111827` (Dark)
- **Cards**: `#1f2937` (Card background)
- **Border**: `#374151` (Border color)
- **Font**: Inter, system fonts

### Responsive Breakpoints
- Mobile: `< 768px`
- Tablet: `768px - 1024px`
- Desktop: `> 1024px`

## Testing Checklist

- [ ] Profile loads with user data
- [ ] Username update works
- [ ] Username uniqueness validation
- [ ] Password change with correct password
- [ ] Password change fails with wrong password
- [ ] Avatar upload (max 5MB, images only)
- [ ] Notification toggles save
- [ ] Stats display correctly
- [ ] Recent activity shows bets
- [ ] Logout all devices works
- [ ] Mobile responsive
- [ ] Toast notifications appear

## Troubleshooting

### Profile won't load
1. Check browser console for errors
2. Verify user is authenticated
3. Check Supabase connection

### Avatar upload fails
1. Verify storage bucket exists
2. Check file size (< 5MB)
3. Verify storage policies
4. Check file type (must be image)

### Stats not showing
1. Verify `bets` table exists
2. Check user has bets
3. Verify market IDs are valid

### Password change fails
1. Verify current password is correct
2. Check new password meets requirements (8+ chars)
3. Verify passwords match

## Future Enhancements

### Planned Features
- [ ] Social connections (link Twitter, Discord)
- [ ] Achievement badges
- [ ] Referral system
- [ ] Email notifications
- [ ] Export data (GDPR compliance)
- [ ] Account deletion
- [ ] Privacy settings
- [ ] Block list management

### Integration Opportunities
- **Payment Gateways**: Stripe, PayPal, local Jamaica payment methods
- **Analytics**: Track user engagement
- **Email Service**: SendGrid, Mailgun for notifications
- **SMS**: Twilio for 2FA and alerts

## Support

For issues or questions:
1. Check console logs
2. Verify Supabase setup
3. Review migration SQL
4. Check network requests in DevTools

## Credits

Built with:
- Supabase (Auth, Database, Storage)
- Remix Icons
- Font Awesome
- Tailwind CSS concepts
