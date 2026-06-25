# Migonest Technical Reference: Native Bridge & Onboarding Hardening

This document records the critical issues and architectural solutions implemented between March 30–31, 2026, to stabilize the Native iOS/Android onboarding flow following email verification.

## 1. The "Clean URL" Token Loss Problem (v1.1.4)
### Issue
On mobile devices, when a user verifies their email, Supabase/GoTrue appends authentication tokens (`access_token`, `refresh_token`, `code`) to the URL. However, our application logic was immediately "sanitizing" the URL to provide a clean browser experience. On mobile, this sanitization often happened **before** the app could capture the tokens to build the deep link for the native app (`com.migonest.app://...`), resulting in a "Link Expired" or "Landing Page" redirect.

### Solution: Bridge Parameter Memory
We implemented a `bridgeParams` state in `useAppLogic.ts`.
- **Logic**: Immediately upon detection of auth tokens in the URL (Search/Hash), we capture them into persistent React state **before** the URL is wiped.
- **Result**: The "Open Migonest App" button now derives its deep link from memory, not the volatile URL, ensuring the native app always receives the credentials.

## 2. The "White Screen" Regression (v1.1.5)
### Issue
A refactor introduced scope errors where variables like `appUrl` or `showSuccess` were defined inside conditional blocks but accessed globally, causing a React rendering crash (white screen).

### Solution: AuthShell Stabilization
- **Logic**: Consolidated all state and derived variables (`isNative`, `isMobileDevice`, `isMobileOnboarding`) at the absolute top-level of the `AuthShell` component.
- **Result**: Restored a unified rendering path that handles both the Bridge UI and the main App router without crashes.

## 3. The "Landing Page" Redirect (v1.1.6)
### Issue
Even with the correct deep link, users were landing on the app's Landing Page instead of the Onboarding flow.
1. **Race Condition**: The deep link would exchange the token, but the app would briefly report `isAuthenticated: false` while the profile was loading.
2. **Fallback Leak**: `AuthShell` would see the unauthenticated state and fall back to the guest `LandingPage`.

### Solution: View-Lock & Explicit Promotion
- **Explicit Promotion**: `handleDeepLink` now explicitly calls `setIsAuthenticated(true)` immediately upon a successful token exchange.
- **View-Lock Guard**: Refactored `AuthShell` to include a "needsProfile" guard. If the view is `ONBOARDING` or `RESET_PASSWORD`, the component is **physically prohibited** from rendering the `LandingPage`. Instead, it stays on the "Waking up..." loader until the profile data arrives.

## 4. Summary of Key Files
- `hooks/useAppLogic.ts`: Manages `bridgeParams` and explicit auth promotion.
- `components/AuthShell.tsx`: Implements the View-Lock guard and unified UI logic.
- `App.tsx`: Hardened to ensure the `AuthShell` is rendered for all sensitive transitory states.

---
*Created by Antigravity AI for Migonest-Prod*
