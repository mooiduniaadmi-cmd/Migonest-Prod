# Android Keyboard Layout Resolution

This document serves as a permanent reference for the "Empty Layer" keyboard issue on Android and how it was resolved in Migonest.

## The Issue
Users reported a large empty gap (slate-grey background) appearing between the input field and the keyboard when focusing on entry fields (Login, Signup, Onboarding). This was caused by the Android OS **panning** the entire application window instead of **resizing** the viewport.

## Root Causes
1.  **Immersive Theme Lock**: The activity was staying in a Full-Screen Splash theme (`Theme.SplashScreen`) which blocks Android's `adjustResize` behavior.
2.  **Viewport Height Units**: Use of `vh` or `min-h-screen` CSS units. These units do not update when the keyboard opens, causing the OS to pan the content to keep the input visible.
3.  **Inset Conflicts**: Setting `fitsSystemWindows="true"` on the theme often conflicts with Capacitor's internal layout engine.

## The Fix (Permanent Reference)

### 1. Native Activity Level
- **AndroidManifest.xml**: Added `android:windowSoftInputMode="adjustResize"` to the `.MainActivity`.
- **styles.xml**: Added `postSplashScreenTheme` to `AppTheme.NoActionBarLaunch` to ensure the app transitions to a non-full-screen theme after launch.
- **styles.xml**: Set `fitsSystemWindows="false"` to allow Capacitor to handle insets correctly.

### 2. Capacitor Configuration
- **capacitor.config.ts**: Set `Keyboard.resize` to `KeyboardResize.Ionic` for proper WebView height updates.
- **capacitor.config.ts**: Removed `SystemBars` plugin overrides that were blocking inset communication.

### 3. Application CSS
- **Viewport Overhaul**: Replaced `min-h-screen` and `vh` with `h-full` and `min-h-full` in root layout shells (`AuthShell.tsx`, `App.tsx`, `OnboardingView.tsx`).
- **Padding Optimization**: Reduced root container padding (`p-6` -> `p-2`) on mobile entry forms to allow the UI to sit closer to the keyboard edges.

## Troubleshooting Future Regressions
If the gap returns:
1. Verify `postSplashScreenTheme` is still in `styles.xml`.
2. Check that no new `fixed inset-0` or `100vh` containers have been added to the root layout.
3. Ensure the `AndroidManifest.xml` still has `adjustResize` set.
