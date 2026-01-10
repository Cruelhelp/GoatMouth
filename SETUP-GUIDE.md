# GoatMouth Market - Banner & Image Upload Setup Guide

## 🎉 Features Completed

✅ **Banner Carousel System**
- Landscape banner carousel with auto-slideshow
- Admin panel for managing banners
- Support for multiple images with transitions
- Link banners to markets or external URLs

✅ **Image Upload System**
- Upload images for banners from admin panel
- Upload images for markets when creating them
- Images stored in Supabase Storage
- Automatic image optimization and public URL generation

✅ **Loading Spinners**
- All Supabase operations show loading states
- Prevents duplicate submissions
- Better user experience

---

## 📋 Setup Instructions

### Step 1: Run Database Migrations

Execute these SQL files in your Supabase SQL Editor:

1. **Banners Table**
   ```bash
   Open: sql/banners-schema.sql
   Copy and paste the entire file into Supabase SQL Editor
   Click "Run"
   ```

2. **Banner Image Positioning** (if not already done)
   ```bash
   Open: sql/add-banner-positioning.sql
   Copy and paste into Supabase SQL Editor
   Click "Run"
   ```

3. **Add image_url to markets** (if not already done)
   ```bash
   Open: sql/add-image-url-to-markets.sql
   Copy and paste into Supabase SQL Editor
   Click "Run"
   ```

### Step 2: Set Up Supabase Storage

Follow the detailed instructions in `sql/storage-setup.md`:

1. **Create Storage Buckets**
   - Go to Supabase Dashboard > Storage
   - Create bucket: `banners` (public)
   - Create bucket: `market-images` (public)

2. **Configure Storage Policies**
   - Copy SQL policies from `sql/storage-setup.md`
   - Execute each policy in the Supabase SQL Editor
   - This ensures:
     - Anyone can view images (public read)
     - Only admins can upload/edit/delete (admin write)

### Step 3: Test the Features

1. **Test Banner Management**
   - Log in as admin
   - Go to Admin Panel > Banners
   - Click "Add New Banner"
   - Upload an image (recommended: 1920x400px)
   - Add title, description
   - Set active = true
   - Save

2. **Test Market Image Upload**
   - Go to markets page
   - Click "Create Market" (admin only)
   - Fill in market details
   - Upload an image using the file picker
   - Submit

3. **Verify on Homepage**
   - Go to homepage
   - Banner carousel should appear at the top
   - Auto-rotates every 5 seconds
   - Market cards show uploaded images

---

## 🎨 Usage Guide

### Creating Banners (Admin)

#### Single Banner Upload
1. Navigate to **Admin Panel > Banners**
2. Click **"Add New Banner"**
3. **Upload Image**: Click "Choose File" and select a landscape image
   - Recommended size: 1920x400px
   - Max file size: 5MB
   - Formats: JPG, PNG, GIF, WebP
4. **Add Content**:
   - Title: Eye-catching headline
   - Description: Brief text about the banner
   - Link Type: Choose one:
     - **None**: Banner doesn't link anywhere
     - **Market**: Links to a specific market (enter market ID)
     - **External**: Links to external URL
5. **Image Positioning**:
   - **Image Fit**: Choose how image fills the space (cover, contain, fill, none)
   - **Image Position**: Choose focal point (center, top, bottom, left, right, corners)
6. **Set Order**: Lower numbers display first
7. **Active Status**: Check to show in carousel
8. Click **"Create Banner"**

#### Bulk Banner Upload
1. Navigate to **Admin Panel > Banners**
2. Click **"Bulk Upload"**
3. **Upload Multiple Images**:
   - Drag & drop multiple images onto the drop zone
   - Or click "Choose Files" to browse
   - Preview grid shows all selected images
   - Click X on any image to remove from upload
4. **Set Common Properties**:
   - Starting Order Index: First banner order (increments by 10)
   - Image Fit: Applied to all banners
   - Image Position: Applied to all banners
   - Make all active: Toggle to activate all at once
5. Click **"Upload All Banners"**
   - Shows progress (Uploading 1/5...)
   - Creates separate banner for each image
   - Titles auto-generated from filenames

### Managing Banners

- **Edit**: Click "Edit" to modify banner details
- **Activate/Deactivate**: Toggle visibility without deleting
- **Delete**: Permanently remove banner
- **Reorder**: Change order_index to control display sequence

### Creating Markets with Images

1. Click **"Create Market"** (admin)
2. Fill in market details
3. **Upload Image**:
   - Click file input under "Market Image"
   - Select image (recommended: 400x200px)
   - Preview appears instantly
4. Complete other fields
5. Click **"Create Market"**
   - Spinner shows during upload
   - Image uploads to Supabase Storage
   - Market created with image URL

---

## 🏗️ Technical Architecture

### Files Created/Modified

**New Files:**
- `js/banner-carousel.js` - Banner carousel component
- `js/admin-banners.js` - Admin banner management
- `sql/banners-schema.sql` - Database schema
- `sql/storage-setup.md` - Storage configuration guide

**Modified Files:**
- `js/app.js` - Added banner integration + image upload for markets
- `js/admin.js` - Added banners view
- `admin.html` - Added banners navigation
- `index.html` - Added banner-carousel.js script

### Database Schema

**banners table:**
```sql
- id (UUID)
- image_url (TEXT) - Supabase Storage URL
- title (TEXT)
- description (TEXT)
- link_type (TEXT) - 'market', 'external', 'none'
- link_id (UUID) - market_id if link_type='market'
- link_url (TEXT) - URL if link_type='external'
- order_index (INTEGER) - Display order
- active (BOOLEAN) - Show/hide
- created_at, updated_at
```

**markets table:**
```sql
- image_url (TEXT) - Added column for market images
```

### Storage Buckets

**banners:**
- Path: `banners/{timestamp}-{random}.{ext}`
- Public read access
- Admin write access

**market-images:**
- Path: `market-images/{timestamp}-{random}.{ext}`
- Public read access
- Admin write access

---

## 🔒 Security

- ✅ RLS (Row Level Security) enabled on all tables
- ✅ Only admins can create/edit/delete banners
- ✅ Storage policies enforce admin-only uploads
- ✅ File size validation (5MB max)
- ✅ File type validation (images only)
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (HTML escaping)

---

## 🎯 Features

### Banner Carousel
- ✅ Auto-slideshow (5 second intervals)
- ✅ Navigation arrows (desktop)
- ✅ Dot indicators
- ✅ Smooth transitions
- ✅ Mobile responsive
- ✅ Click to navigate to markets/URLs
- ✅ Only shows on "All Markets" view

### Image Upload
- ✅ Drag & drop interface
- ✅ Real-time preview
- ✅ File validation
- ✅ Loading spinners
- ✅ Error handling
- ✅ Automatic URL generation
- ✅ CDN-cached delivery

### Admin Panel
- ✅ Full CRUD operations
- ✅ Image preview in list
- ✅ Bulk activate/deactivate
- ✅ Reordering
- ✅ Link management

---

## 🐛 Troubleshooting

### Banner not showing
1. Check banner is set to **active = true**
2. Verify you're on the "All Markets" page (not filtered by category)
3. Check browser console for errors
4. Verify image URL is accessible

### Image upload failing
1. **Check Supabase Storage buckets exist**:
   - Go to Supabase Dashboard > Storage
   - Verify `banners` and `market-images` buckets exist
2. **Check storage policies are set**:
   - Run all SQL policies from `sql/storage-setup.md`
3. **Check file size** (must be < 5MB)
4. **Check user is admin**:
   - Go to Supabase Dashboard > Authentication
   - Verify user has `role = 'admin'` in profiles table

### Loading spinner stuck
1. Check browser console for errors
2. Verify Supabase connection
3. Check network tab for failed requests
4. Refresh the page

---

## 📊 Performance

- Images are CDN-cached by Supabase
- Lazy loading for market card images
- Optimized transitions (CSS only)
- Minimal JavaScript overhead
- Responsive images (will resize on mobile)

---

## 🚀 Next Steps

Potential enhancements:
- [ ] Image cropping tool
- [ ] Multiple images per banner (gallery)
- [ ] Video support
- [ ] Animated GIF support
- [ ] Scheduled banners (start/end dates)
- [ ] A/B testing for banners
- [ ] Analytics (click tracking)

---

## 💡 Tips

1. **Banner Images**: Use high-quality landscape images (1920x400px)
2. **Market Images**: Use 2:1 aspect ratio (e.g., 400x200px)
3. **File Size**: Compress images before upload for faster loading
4. **Order**: Use multiples of 10 for order_index (10, 20, 30) to leave room for reordering
5. **Testing**: Create test banners with active=false to preview before publishing

---

## ✅ Checklist

Before going live:
- [ ] Run all SQL migrations
- [ ] Set up Supabase Storage buckets
- [ ] Configure storage policies
- [ ] Test banner upload as admin
- [ ] Test market image upload
- [ ] Verify images display on homepage
- [ ] Test on mobile devices
- [ ] Check loading spinners work
- [ ] Verify only admins can upload

---

Need help? Check the browser console for errors or contact support.
