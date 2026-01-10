# Remaining Consolidation Steps

## Summary
- ✅ **contact.html** - COMPLETE (~130 lines eliminated)
- ⏳ **privacy.html** - Ready to update
- ⏳ **how-it-works.html** - Ready to update
- ⏳ **voting.html** - Ready to update
- ⏳ **earn.html** - Ready to update
- ⏳ **index.html** - Ready to update

## For Each Remaining Page:

### 1. Replace Header Section
**Find:** From `<!-- Logo Header -->` to `<div class="sidebar-overlay" id="sidebarOverlay" onclick="closeMobileSidebar()"></div>`

**Replace with:**
```html
<!-- Header Component -->
<div id="header-container" data-page="PAGE_NAME"></div>
```

**Page names:**
- privacy.html: `data-page="privacy"`
- how-it-works.html: `data-page="how-it-works"`
- voting.html: `data-page="voting"`
- earn.html: `data-page="earn"`
- index.html: `data-page="markets"` + `data-show-view-mode="true"` + `data-logo-link="false"`

### 2. Replace Footer Section
**Find:** Entire `<footer class="desktop-only...">...</footer>` block

**Replace with:**
```html
<!-- Footer Component -->
<div id="footer-container"></div>
```

### 3. Replace Sidebar (voting.html, earn.html, index.html only)
**Find:** `<aside class="sidebar-column">...</aside>` section

**Replace with:**
```html
<!-- Sidebar Component -->
<div id="sidebar-container"></div>
```

**Find:** Updates modal section `<div class="updates-modal-overlay"...` through `</div>` (modal end)

**Replace with:**
```html
<!-- Updates Modal Component -->
<div id="updates-modal-container"></div>
```

### 4. Add Component Scripts
**Add after** `<script src="js/shared-components.js"></script>`:
```html
<script src="js/header-component.js"></script>
<script src="js/footer-component.js"></script>
<script src="js/sidebar-component.js"></script> <!-- only for pages with sidebar -->
```

## Expected Line Reductions:
- privacy.html: ~130 lines
- how-it-works.html: ~130 lines
- voting.html: ~280 lines (header + footer + sidebar + modal)
- earn.html: ~240 lines (header + sidebar + modal)
- index.html: ~280 lines (header + footer + sidebar + modal)

**Total:** ~1,060 lines to be eliminated across 5 pages
