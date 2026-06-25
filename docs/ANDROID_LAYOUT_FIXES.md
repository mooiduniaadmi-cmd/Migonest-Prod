# Android Layout & Keyboard Fixes - April 2026

This document summarizes the critical layout and keyboard fixes implemented to resolve the "White Gap" and "Stuck Screen" issues on Android (specifically Samsung devices).

## Issues Resolved
1. **The Middle White Gap**: A large empty space appearing between the keyboard and input fields.
2. **The Bottom White Gap**: A gap between the app's bottom navigation bar and the phone's hardware notch/system nav area.
3. **Stuck Panning**: The screen remaining shifted up after the keyboard was dismissed.
4. **Scroll Lock**: Forms (like Signup) being cut off and non-scrollable when the keyboard was open.

## Key Technical Solutions

### 1. Native Window Panning (`adjustPan`)
- **File**: `android/app/src/main/AndroidManifest.xml`
- **Change**: Set `android:windowSoftInputMode="adjustPan"`.
- **Rationale**: Switched from `adjustResize` to `adjustPan`. This prevents the Android OS from shrinking the WebView (which caused the white background bleed) and instead shifts the entire window up.

### 2. Edge-to-Edge Native Layout
- **File**: `MainActivity.java` & `styles.xml`
- **Change**: 
    - Forced `SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION` in native code.
    - Set `android:windowLayoutInDisplayCutoutMode="shortEdges"` in styles.
- **Rationale**: Forces the app to draw behind system bars, filling the notch and navigation area. This eliminated the white gap below the bottom nav bar.

### 3. Triple-Layer Dark Background
- **Files**: `index.css`, `capacitor.config.ts`, `MainActivity.java`, `styles.xml`
- **Change**: Set background color `#0f172a` in all four layers.
- **Rationale**: Even during layout shifts or pans, the system background is now identical to the app theme, preventing any white flashes.

### 4. Delayed Keyboard Reset
- **File**: `App.tsx`
- **Change**: Added `setTimeout` with `window.scrollTo(0, 0)` on `keyboardWillHide` and `keyboardDidHide`.
- **Rationale**: Android/Samsung panning can be "sticky." A delayed manual scroll forces the OS to snap the view back to the top when the keyboard disappears.

### 5. Dynamic Viewport Scaling
- **File**: `index.css`
- **Change**: Switched `html` height to `100dvh`.
- **Rationale**: `dvh` (Dynamic Viewport Height) accurately tracks the movement of mobile system bars, ensuring the bottom nav bar stays pinned to the edge.

### 6. Modal Scroll Constraints
- **Files**: `SignupModal.tsx`, `LoginModal.tsx`, `HiringWizardModal.tsx`, `ExpertApplicationModal.tsx`
- **Change**: Added `max-h-[92vh]`, `overflow-y-auto`, and `p-2 sm:p-4`.
- **Rationale**: Ensures that even when the window is panned, the modal remains smaller than the screen and becomes internally scrollable. The reduced padding (`p-2`) maximizes the interactive area on small devices.

### 7. Keyboard Visibility Spacers
- **Files**: `LoginModal.tsx`, `SignupModal.tsx`
- **Change**: Added a responsive bottom spacer `<div className="h-32 md:h-0" />` at the end of forms.
- **Rationale**: On Android, `adjustPan` shifts the window just enough to show the focused input. Adding a bottom spacer provides "padding" for the OS to shift the view even further up, ensuring the input is comfortably centered above the keyboard rather than being partially covered.

### 8. Compact Mobile Headers
- **Files**: `LoginModal.tsx`
- **Change**: Reduced logo size and margins (`mb-6` instead of `mb-10`) specifically for mobile.
- **Rationale**: Reclaims critical vertical space to keep form fields visible above the keyboard fold.

---

## Desktop Sticky Navigation Strategies

### 1. App Shell Architecture
- **Files**: `index.css`, `App.tsx`
- **Change**: Set `overflow: hidden` and `height: 100dvh` on `html` and `body`. Set `h-full` and `overflow-hidden` on the top-level `App` wrapper.
- **Rationale**: Converts the website from a document-style scroll to an "App-style" layout where the viewport is locked and navigation stays fixed.

### 2. Flexbox Scroll Restoration (The `min-h-0` Fix)
- **Files**: `App.tsx`
- **Change**: Added `min-h-0` to the main content area and its parents.
- **Rationale**: In Flexbox, a `flex-1` container with `overflow: auto` will often fail to scroll because it calculates its height based on its children rather than its parent. `min-h-0` (or `min-w-0`) tells the browser it's allowed to shrink the container, which enables the internal scrollbar.

### 3. Sticky Sidebar Profile
- **Files**: `Sidebar.tsx`
- **Change**: Used `flex flex-col h-full` on the Sidebar and `mt-auto` on the profile section.
- **Rationale**: Ensures the user profile is always anchored to the bottom-left corner, independent of the number of menu items above it.
