# SQL Scripts

This folder contains database migration and setup scripts for GoatMouth Market.

## Setup Scripts

- **database-schema.sql** - Main database schema with all tables, indexes, and RLS policies
- **database-contact-messages.sql** - Contact messaging system schema

## Utility Scripts

- **add-email-to-profiles.sql** - Adds email column to profiles table
- **make-admin.sql** - Promotes a user to admin role
- **check-user-status.sql** - Checks user authentication and profile status

## Fix Scripts (Historical)

These scripts were used to fix specific issues during development:

- **cleanup-and-reset.sql** - Resets database for fresh start
- **diagnose-and-fix.sql** - Diagnostic queries
- **fix-all-tables.sql** - Comprehensive table fixes
- **fix-profile-500-error.sql** - Fixes profile loading errors
- **fix-rls-policies.sql** - Row Level Security policy fixes
- **fix-transactions-fk.sql** - Foreign key constraint fixes for transactions
- **fix-transactions-table.sql** - Transaction table structure fixes
- **fix-with-trigger.sql** - Trigger-related fixes
- **quick-fix.sql** - Quick database fixes
- **set-password.sql** - Password reset script

## Usage

1. Start with `database-schema.sql` for initial setup
2. Run `database-contact-messages.sql` to add contact system
3. Use utility scripts as needed for user management
4. Fix scripts are kept for reference but may not be needed for fresh installations

**Note:** Update Supabase connection details before running any scripts.
