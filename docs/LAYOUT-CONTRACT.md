# GoatMouth Layout Contract

**Version:** 1.0
**Last Updated:** 2026-01-11
**Status:** Active

## Purpose

This document defines the layout architecture rules and design tokens for the GoatMouth application. All developers must follow these guidelines to maintain consistent, predictable, and maintainable layouts.

---

## Core Principles

### 1. Flow-Based Layout Architecture
- **Prefer normal document flow** over absolute positioning
- Use CSS Grid for page-level macro layout
- Use Flexbox for component-level micro layout
- Avoid removing elements from flow unless absolutely necessary

### 2. Flexible Over Fixed
- Use `min-height` instead of `height`
- Use `max-width` instead of `width`
- Components must adapt to content size
- Avoid clipping content with fixed dimensions

### 3. Single Source of Truth
- All design tokens defined in `:root`
- CSS variables for spacing, z-index, and layout dimensions
- Utility classes for common patterns
- No magic numbers in HTML or CSS

---

## Design Tokens

### Z-Index Scale

All z-index values must use CSS variables. Never use hardcoded numbers.

```css
:root {
    --z-toast: 10000;           /* Toast notifications */
    --z-modal: 9999;            /* Modals & overlays */
    --z-mobile-sidebar: 2000;   /* Mobile sidebar */
    --z-mobile-overlay: 1999;   /* Mobile overlay (behind sidebar) */
    --z-dropdown: 1000;         /* Dropdowns */
    --z-header-logo: 1000;      /* Header logo bar */
    --z-header-menu: 900;       /* Header menubar */
    --z-mobile-header: 100;     /* Mobile header */
    --z-mobile-category-nav: 90;/* Mobile category nav */
    --z-banner: 10;             /* Banner */
    --z-content: 1;             /* Normal content */
}
```

**Stacking Hierarchy (Top to Bottom):**
1. Toast (10000) - Always on top
2. Modal (9999) - Blocks all interaction
3. Mobile Sidebar (2000) - Slides over content
4. Dropdown (1000) - Above content, below modals
5. Header (900-1000) - Fixed at top
6. Mobile Elements (90-100) - Mobile-specific UI
7. Banner (10) - Below header, above content
8. Content (1) - Base layer

**Usage Example:**
```css
/* ✅ CORRECT */
.my-modal {
    z-index: var(--z-modal);
}

/* ❌ WRONG */
.my-modal {
    z-index: 9999;
}
```

---

### Spacing Scale

Use consistent spacing tokens for all margins, padding, and gaps.

```css
:root {
    --space-1: 0.25rem;   /* 4px */
    --space-2: 0.5rem;    /* 8px */
    --space-3: 0.75rem;   /* 12px */
    --space-4: 1rem;      /* 16px */
    --space-5: 1.25rem;   /* 20px */
    --space-6: 1.5rem;    /* 24px */
    --space-8: 2rem;      /* 32px */
    --space-10: 2.5rem;   /* 40px */
}
```

**Usage Example:**
```css
/* ✅ CORRECT */
.card {
    padding: var(--space-6);
    gap: var(--space-4);
}

/* ❌ WRONG */
.card {
    padding: 24px;
    gap: 16px;
}
```

---

### Layout Dimensions

Critical layout dimensions for headers and spacing.

```css
:root {
    --header-height: 108px;         /* Desktop header total height */
    --header-clearance: 140px;      /* Desktop main content padding-top */
    --mobile-header-height: 56px;   /* Mobile header height */
    --mobile-clearance: 16px;       /* Mobile main content padding-top */
}
```

---

## Utility Classes

### Main Content Padding

Use `.main-content-padding` for all main content areas.

```css
.main-content-padding {
    padding-top: var(--header-clearance);
}

@media (max-width: 768px) {
    .main-content-padding {
        padding-top: var(--mobile-clearance) !important;
    }
}
```

**Usage:**
```html
<main class="w-full max-w-[1920px] mx-auto px-2 pb-20 main-content-padding">
    <!-- Content here -->
</main>
```

---

## Layout Rules

### Rule 1: Respect Document Flow
**Do NOT** remove elements from flow unless they are:
- Modals (full-screen overlays)
- Dropdowns (positioned menus)
- Fixed headers/footers

**Use Grid/Flex instead of absolute positioning for layout.**

```css
/* ✅ CORRECT - Using Grid */
.page-layout {
    display: grid;
    grid-template-rows: auto 1fr auto;
}

/* ❌ WRONG - Using absolute */
.sidebar {
    position: absolute;
    right: 0;
    top: 0;
}
```

---

### Rule 2: Flexible Dimensions

**Always use flexible dimensions unless there's a specific design constraint.**

```css
/* ✅ CORRECT */
.modal {
    min-height: 400px;
    max-width: 600px;
    width: 100%;
}

/* ❌ WRONG */
.modal {
    height: 400px;
    width: 600px;
}
```

---

### Rule 3: Controlled Overflow

**Do NOT use `overflow: hidden` unless:**
- Intentionally hiding overflow for design (e.g., rounded corners)
- Clipping animations

**For scrollable content, use `overflow-y: auto`:**

```css
/* ✅ CORRECT - Scrollable content */
.content-area {
    overflow-y: auto;
    overflow-x: hidden;
}

/* ❌ WRONG - Hides content */
.content-area {
    overflow: hidden;
}
```

---

### Rule 4: Semantic Class Names

Use descriptive, semantic class names instead of generic ones.

```css
/* ✅ CORRECT */
.main-content-padding { }
.user-profile-dropdown { }
.market-card { }

/* ❌ WRONG */
.padding-140 { }
.dropdown-1 { }
.card-2 { }
```

---

### Rule 5: Mobile-First Responsive

Write mobile styles first, then add desktop overrides.

```css
/* ✅ CORRECT */
.header {
    padding: var(--space-2);
}

@media (min-width: 769px) {
    .header {
        padding: var(--space-6);
    }
}

/* ❌ WRONG */
.header {
    padding: var(--space-6);
}

@media (max-width: 768px) {
    .header {
        padding: var(--space-2);
    }
}
```

---

### Rule 6: No !important (Except Media Queries)

Avoid `!important` unless absolutely necessary (e.g., mobile overrides).

```css
/* ✅ ACCEPTABLE */
@media (max-width: 768px) {
    .main-content-padding {
        padding-top: var(--mobile-clearance) !important;
    }
}

/* ❌ WRONG */
.header {
    z-index: 1000 !important;
}
```

---

## Page Structure

### Desktop Layout

```
┌────────────────────────────────────────┐
│ Logo Header (60px)                      │ z-index: var(--z-header-logo)
├────────────────────────────────────────┤
│ Menubar / Nav Links (48px)              │ z-index: var(--z-header-menu)
├────────────────────────────────────────┤
│ ↓ 32px clearance ↓                     │
├────────────────────────────────────────┤
│ Banner (120px)                          │ z-index: var(--z-banner)
├────────────────────────────────────────┤
│ Main Content                            │ z-index: var(--z-content)
│ padding-top: 140px                      │
└────────────────────────────────────────┘
```

### Mobile Layout

```
┌──────────────────────┐
│ Mobile Header (56px) │ z-index: var(--z-mobile-header)
├──────────────────────┤
│ Banner (100px)       │ z-index: var(--z-banner)
├──────────────────────┤
│ Main Content         │ z-index: var(--z-content)
│ padding-top: 16px    │
├──────────────────────┤
│ Bottom Nav (56px)    │ fixed bottom
└──────────────────────┘
```

---

## Common Patterns

### Modal Pattern

```css
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    z-index: var(--z-modal);
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-content {
    background: #1f2937;
    border-radius: 12px;
    padding: var(--space-6);
    max-width: 600px;
    width: 100%;
}
```

### Dropdown Pattern

```css
.dropdown-container {
    position: relative;
    z-index: var(--z-dropdown);
}

.dropdown-menu {
    position: absolute;
    top: calc(100% + var(--space-2));
    right: 0;
    background: #1f2937;
    border: 2px solid #374151;
    border-radius: 12px;
    z-index: var(--z-dropdown);
}
```

### Card Pattern

```css
.card {
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 12px;
    padding: var(--space-6);
    transition: all 0.2s;
}

.card:hover {
    border-color: rgba(0, 203, 151, 0.3);
}
```

---

## Anti-Patterns (DO NOT USE)

### ❌ Hardcoded Z-Index
```css
/* WRONG */
.modal {
    z-index: 9999;
}
```

### ❌ Magic Numbers
```css
/* WRONG */
.header {
    padding-top: 140px;
    margin: 24px;
}
```

### ❌ Absolute Positioning for Layout
```css
/* WRONG */
.sidebar {
    position: absolute;
    right: 0;
    width: 300px;
}
```

### ❌ Fixed Dimensions
```css
/* WRONG */
.container {
    height: 500px;
    width: 800px;
}
```

### ❌ Overflow Hidden on Content
```css
/* WRONG */
.content {
    overflow: hidden;
}
```

---

## Enforcement

### Before Committing Code:
1. **Check for hardcoded z-index values** - Must use CSS variables
2. **Check for magic numbers** - Must use spacing tokens
3. **Check for overflow: hidden** - Justify usage
4. **Check for fixed dimensions** - Use min/max instead
5. **Test responsive behavior** - Desktop and mobile

### Code Review Checklist:
- [ ] Z-index uses CSS variables
- [ ] Spacing uses design tokens
- [ ] No magic numbers in CSS or HTML
- [ ] Dimensions are flexible (min/max)
- [ ] Overflow intentionally controlled
- [ ] Mobile responsive
- [ ] Follows document flow

---

## Resources

- **Design Tokens:** `/public/css/styles.css` (lines 7-36)
- **Utility Classes:** `/public/css/styles.css` (lines 38-51)
- **Audit Report:** `/tmp/layout-audit-report.txt`
- **Implementation Guide:** `/tmp/layout-refactoring-complete.txt`

---

## Changelog

### 2026-01-11 - v1.0
- Initial layout contract
- Added z-index scale (11 tokens)
- Added spacing scale (8 tokens)
- Added layout dimension tokens (4 tokens)
- Created `.main-content-padding` utility class
- Refactored 7 files to use design tokens

---

**For questions or updates to this contract, contact the development team.**
