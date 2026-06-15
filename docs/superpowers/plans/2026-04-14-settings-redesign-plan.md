# Settings Page Color Palette Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the settings page into a vibrant gradient background with strict solid-white minimalist panels and monochrome internal UI elements.

**Architecture:** Modify the scoped `<style>` block in `frontend/app/pages/settings.vue` to override existing dark theme variables locally. Apply the multi-color gradient background to `.settings-page`. Update Vue template class interpretations via scoped CSS to remove colorful tags/buttons and replace them with strict black and white variants.

**Tech Stack:** Vue 3, CSS

---

### Task 1: Update Settings Background and Main Container

**Files:**
- Modify: `d:\Users\Desktop\huobao-drama-master\frontend\app\pages\settings.vue`

- [ ] **Step 1: Apply gradient background to `.settings-page`**
  Modify `.settings-page`:
  ```css
  .settings-page {
    /* Keep layout properties, change background */
    background: linear-gradient(135deg, #1abc9c, #9b59b6, #e74c3c); /* Vibrant multi-stop gradient */
  }
  ```
- [ ] **Step 2: Apply Solid White to containers**
  Modify `.settings-container` to use pure white with a noticeable drop shadow.
  ```css
  .settings-container {
    background: #ffffff;
    box-shadow: 0 12px 40px rgba(0,0,0,0.15);
  }
  ```

### Task 2: Standardize Form Elements, Buttons and Tags to Monochrome

**Files:**
- Modify: `d:\Users\Desktop\huobao-drama-master\frontend\app\pages\settings.vue`

- [ ] **Step 1: Add Scoped CSS overrides for Buttons**
  Add scoped definitions in `<style scoped>` (if not already strictly constrained):
  ```css
  /* Ensure all buttons use pill geometry and monochrome styling */
  .btn { border-radius: 50px !important; }
  .btn:focus-visible { outline: dashed 2px #000000 !important; outline-offset: 2px; }
  .btn-primary { background: #000000 !important; color: #ffffff !important; border: none !important; }
  .btn-ghost, .btn-white { border: 1px solid #e5e5e5; color: #000000 !important; background: transparent !important; }
  ```
- [ ] **Step 2: Add Scoped CSS overrides for Tags and Alerts**
  Force all tags to be monochrome, stripping colors from `tag-success`, `tag-error`, `tag-accent`.
  ```css
  .tag { background: rgba(0,0,0,0.06) !important; color: #000000 !important; font-family: var(--font-mono); }
  .tag-success, .tag-error, .tag-accent {
    /* overrides any inherited colors */
    background: rgba(0,0,0,0.06) !important; 
    color: #000000 !important; 
    border: none;
  }
  ```

### Task 3: Strip Background Variances in Lists and Panels

**Files:**
- Modify: `d:\Users\Desktop\huobao-drama-master\frontend\app\pages\settings.vue`

- [ ] **Step 1: Clean up nested background components**
  Modify local background variables to pure white, avoiding dark patches:
  ```css
  .settings-tabs { background: #ffffff; }
  .accordion-head { background: #ffffff; }
  .accordion-body { background: #ffffff; border-top: 1px solid #e5e5e5; }
  .skill-nav { background: #ffffff; }
  .config-row { background: #ffffff; border-bottom: 1px solid #e5e5e5; }
  .config-row:hover { background: rgba(0,0,0,0.03); }
  .config-row.is-active { background: rgba(0,0,0,0.02); } /* removed colored gradient */
  ```
- [ ] **Step 2: Modal Styling**
  Ensure the modal styling sits correctly:
  ```css
  .modal-body, .modal-footer { background: #ffffff; }
  .modal-header { background: #000000; color: #ffffff; } 
  ```

### Task 4: Verify and Commit

- [ ] **Step 1: Visual Verification**
  Check the app in standard mode, verify the gradient exists globally and the internal cards are sharply monochrome white/black.
- [ ] **Step 2: Commit**
  ```bash
  git add frontend/app/pages/settings.vue
  git commit -m "style: redesign settings page to figma gradient and minimalist solid-white spec"
  ```
