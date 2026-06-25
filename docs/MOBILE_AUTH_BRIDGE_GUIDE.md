# Mobile Onboarding Bridge & Safari Session Fix

## Problem Overview
Mobile browsers, specifically Safari on iOS, present unique challenges for authentication flows:
1. **ITP (Intelligent Tracking Prevention)**: Often clears or blocks cookies/local storage when transitioning from an external link (email) to the app and back to the browser.
2. **Deep Link Blocking**: Safari blocks programmatic redirects to custom schemes (e.g., `migonest://`) and displays an "Address is invalid" alert if the app is not installed.
3. **Session Loss**: Users clicking "Confirm Email" often landed on the landing page as guests because the authentication context was lost or delayed during the transition.

## The Solution: Mobile Onboarding Bridge
We implemented a robust "Bridge" mechanism to handle the transition safely.

### 1. Token Interception & Hijacking
In `useAppLogic.ts`, the `initializeAuth` hook detects authentication tokens (`access_token`, `refresh_token`, or `code`) in the URL. If on mobile web, it "hijacks" the flow before Supabase or any redirect can clear the URL:
- It captures tokens into a memory-persisted `bridgeParams` state.
- It sets the view to `ONBOARDING_BRIDGE`.
- It clears the URL only *after* tokens are safely in memory.

### 2. The Bridge UI (`AuthShell.tsx`)
The user is presented with two clear choices:
- **Open Migonest App**: A direct deep link using the captured tokens, encoded via `encodeURIComponent` to ensure scheme validity.
- **Continue in Browser**: An explicit session-setup trigger that uses the memory tokens to log the user in without needing the URL parameters.

### 3. Global Bypass State
The `bypassBridge` state is stored in `useAppLogic` rather than locally in `AuthShell`. This is critical because:
- Transitioning to the `ONBOARDING` view causes the application to re-render.
- If `bypassBridge` was local, it would reset to `false`, causing the bridge to reappear and creating a "nothing happens" loop.

### 4. Immediate Auth Promotion
To avoid the "Waking up Migonest" (pulse loader) hang:
- `handleContinueInBrowser` calls `setIsAuthenticated(true)` immediately after `setSession` succeeds.
- `AuthShell` allows the `OnboardingView` to mount if the user is authenticated, even if the profile fetch is still pending, by providing a temporary guest profile.

## Key Technical Details

### Deep Link Format
Always use `encodeURIComponent` for tokens in custom schemes:
```typescript
let url = `migonest://onboarding?access_token=${encodeURIComponent(token)}`;
```

### Emergency Recovery
A "Sign out and retry" link was added to the `AuthShell` loader as a fail-safe for rare session corruption edge cases.

## Relevant Files
- `hooks/useAppLogic.ts`: Core hijack logic and session hand-off.
- `components/AuthShell.tsx`: Bridge UI and authentication guards.
- `pages/OnboardingView.tsx`: Final data persistence logic.
