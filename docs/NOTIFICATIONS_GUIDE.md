# GoatMouth Notifications System

Global, role-based notification system for GoatMouth.

## Features

- **Global Notifications**: Send notifications to all users
- **Role-Based Notifications**: Target specific roles (admin, member, etc.)
- **User-Specific Notifications**: Send to individual users
- **Real-time Updates**: Polls for new notifications every 30 seconds
- **Read/Unread Tracking**: Mark notifications as read
- **Action URLs**: Navigate users to relevant pages
- **Type Indicators**: Info, Success, Warning, Error
- **Mobile Optimized**: Responsive design for all screen sizes
- **Animated Bell**: Rings when there are unread notifications

## Database Setup

1. Run the SQL migration in Supabase:
   ```bash
   # In Supabase SQL Editor, run:
   sql/notifications_table.sql
   ```

2. This creates:
   - `notifications` table
   - RLS policies for security
   - Helper functions for creating notifications
   - Indexes for performance

## Table Schema

```sql
notifications (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,

  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT, -- 'info', 'success', 'warning', 'error'

  -- Targeting
  user_id UUID, -- Specific user (nullable)
  target_role TEXT, -- 'admin', 'member', etc.
  is_global BOOLEAN, -- Send to all users

  -- Action
  action_url TEXT, -- Optional URL
  action_label TEXT, -- Optional button label

  -- Status
  is_read BOOLEAN,
  read_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB,
  expires_at TIMESTAMPTZ
)
```

## Creating Notifications

### 1. Global Notification (All Users)

```sql
SELECT create_global_notification(
    'System Maintenance',
    'We will be performing maintenance tonight from 12 AM to 2 AM.',
    'warning',
    'index.html',
    'Learn More'
);
```

### 2. Role-Based Notification

```sql
SELECT create_role_notification(
    'admin',
    'New Users to Approve',
    'There are 5 new users waiting for approval.',
    'info',
    'admin.html#users',
    'Review'
);
```

### 3. User-Specific Notification

```sql
SELECT create_user_notification(
    'user-uuid-here',
    'Welcome to GoatMouth!',
    'Your account has been created successfully.',
    'success',
    'profile.html',
    'View Profile'
);
```

### 4. Using JavaScript API

```javascript
// From admin panel or server-side
const { data, error } = await supabaseClient
    .from('notifications')
    .insert({
        title: 'New Market Created',
        message: 'Check out the latest prediction market!',
        type: 'success',
        is_global: true,
        action_url: 'market.html?id=123'
    });
```

## Notification Types

| Type | Color | Use Case |
|------|-------|----------|
| `info` | Blue | General information |
| `success` | Green | Successful actions |
| `warning` | Yellow | Warnings, upcoming events |
| `error` | Red | Errors, critical issues |

## Role-Based Targeting

Target specific user roles:

- `admin` - Administrators only
- `member` - Regular members
- Custom roles as defined in your `profiles` table

## UI Components

### Notification Bell
- Located in header before profile dropdown
- Shows badge with unread count
- Rings animation when unread notifications exist
- Click to open dropdown

### Notification Dropdown
- Shows last 20 notifications
- Scrollable list
- "Mark all read" button
- Click notification to mark as read and navigate
- "View all notifications" link (future feature)

## JavaScript Functions

### Available Functions

```javascript
// Toggle notification dropdown
toggleNotifications();

// Close notification dropdown
closeNotifications();

// Load notifications from database
await loadNotifications();

// Mark single notification as read
await markNotificationRead(notificationId);

// Mark all notifications as read
await markAllNotificationsRead();

// Start polling (automatic on login)
startNotificationsPolling();

// Stop polling (automatic on logout)
stopNotificationsPolling();
```

### Automatic Behavior

- Notifications load automatically when user logs in
- Polls every 30 seconds for new notifications
- Badge updates in real-time
- Stops polling on logout

## Example Use Cases

### 1. Welcome New Users

```sql
-- Create trigger on profiles table
CREATE OR REPLACE FUNCTION notify_new_user()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_user_notification(
        NEW.id,
        'Welcome to GoatMouth!',
        'Start predicting on markets and earn rewards.',
        'success',
        'index.html'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER new_user_welcome
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_user();
```

### 2. Market Resolution Notifications

```sql
-- When market is resolved
INSERT INTO notifications (user_id, title, message, type, action_url)
SELECT
    user_id,
    'Market Resolved',
    'The market "' || market_title || '" has been resolved!',
    'success',
    'market.html?id=' || market_id
FROM bets
WHERE market_id = $1;
```

### 3. Admin Alerts

```sql
-- Alert admins of suspicious activity
SELECT create_role_notification(
    'admin',
    'Suspicious Activity Detected',
    'Multiple failed login attempts from IP: ' || ip_address,
    'error',
    'admin.html#security'
);
```

### 4. Scheduled Announcements

```sql
-- Announcement with expiry
INSERT INTO notifications (
    is_global,
    title,
    message,
    type,
    expires_at
) VALUES (
    true,
    'New Feature Launch',
    'We just launched our new voting system!',
    'info',
    NOW() + INTERVAL '7 days'
);
```

## Security

- Row Level Security (RLS) enabled
- Users can only read their own notifications
- Users can only update (mark as read) their own notifications
- Only admins can create/delete notifications
- Policies enforce role-based access

## Performance

- Indexed columns for fast queries
- Limits to 20 notifications per fetch
- 30-second polling interval (configurable)
- Lazy loading when dropdown opens

## Customization

### Change Polling Interval

In `shared-components.js`:

```javascript
// Change from 30 seconds to 60 seconds
notificationsPollInterval = setInterval(() => {
    loadNotifications();
}, 60000); // 60 seconds
```

### Add Real-time Updates (WebSocket)

For instant notifications without polling:

```javascript
// Subscribe to notifications table
const subscription = supabaseClient
    .channel('notifications')
    .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
    }, (payload) => {
        // Add notification to cache and update UI
        notificationsCache.unshift(payload.new);
        renderNotifications(notificationsCache);
        updateNotificationBadge();
    })
    .subscribe();
```

## Future Enhancements

- [ ] Push notifications (browser API)
- [ ] Email notifications
- [ ] In-app sound alerts
- [ ] Notification preferences page
- [ ] Bulk actions (delete, archive)
- [ ] Notification categories/filters
- [ ] Rich content (images, buttons)
- [ ] Notification history page

## Troubleshooting

### Notifications not showing?

1. Check if user is logged in
2. Verify `notifications` table exists in Supabase
3. Check browser console for errors
4. Ensure RLS policies are correct
5. Verify user has the correct role in `profiles` table

### Badge not updating?

1. Check polling is running: `notificationsPollInterval` should not be null
2. Verify notifications are being fetched (check Network tab)
3. Ensure `is_read` column is updating correctly

### Can't create notifications?

1. Verify user has `admin` role in `profiles` table
2. Check RLS policy for INSERT permission
3. Use helper functions instead of direct INSERT
