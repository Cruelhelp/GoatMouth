# Database Migrations

## Running the Banner Custom Position Migration

To add custom positioning support to your banners, you need to run the SQL migration.

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard at https://hvdivdqxsdhabeurwkfb.supabase.co
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `add_custom_position_columns.sql`
5. Click **Run** to execute the migration

### Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db execute --file migrations/add_custom_position_columns.sql
```

### What This Migration Does

- Adds `custom_position_x` column (INTEGER, default 50)
- Adds `custom_position_y` column (INTEGER, default 50)
- Updates existing banners to use center position (50%, 50%)

### Verification

After running the migration, verify it worked by:

1. Going to the Supabase **Table Editor**
2. Select the `banners` table
3. Confirm you see the new columns: `custom_position_x` and `custom_position_y`

## Banner Positioning System

The new custom positioning system allows precise control over banner image placement:

- **0% = Top/Left edge**
- **50% = Center (default)**
- **100% = Bottom/Right edge**

Admins can:
- Drag the preview image to position it
- Use quick presets (Top, Center, Bottom, Left, Right)
- Fine-tune with directional buttons (±5% per click)
