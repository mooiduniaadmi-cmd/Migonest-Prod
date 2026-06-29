# Auth Onboarding Redirection Bug

## Issue Description
During the Google OAuth signup flow, new users would be redirected back to the app at `/onboarding` and proceed through the onboarding steps. However, upon completing Step 8 (where profile details are saved to the backend), users were unexpectedly presented with the unauthenticated Landing Page (`<LandingPage />`) while the URL remained stuck at `https://www.migonest.com/onboarding`. Users appeared logged out, but if they refreshed the page, the application correctly identified their active session and redirected them to the Home view.

## Root Cause
The problem stemmed from a race condition between the database profile update and the conditional rendering logic in `AuthShell.tsx`.

1. **Step 8 Save**: When a user completes Step 8, `useAppLogic.ts` saves the data to Supabase and updates the profile with `isOnboarded: true`. The local React state `currentUser` is immediately updated.
2. **AuthShell Re-render**: `AuthShell` detects the state change and re-renders.
3. **The Bypass Logic**: `AuthShell` contained the following logic intended to rescue existing, fully-onboarded users who accidentally navigated to `/onboarding`:
   ```tsx
   if (currentUser && currentUser.isOnboarded) {
      console.log('[AuthShell] User already onboarded. Bypassing OnboardingView render.');
   } else {
      return <OnboardingView ... />
   }
   ```
4. **The Interruption**: Because `currentUser.isOnboarded` became true *before* the user saw Step 9, `AuthShell` immediately bypassed rendering the `OnboardingView`. Because the component unmounted, the user never reached Step 9 to click "Explore Migonest" (which triggers the `window.location.href = '/'` hard reload).
5. **The Fallback**: Since `AuthShell` bypassed `OnboardingView` but the URL was still `/onboarding` (and the view state was still `'ONBOARDING'`), `AuthShell` fell through to its bottom-most fallback, which was returning `<LandingPage />`. Since the view state wasn't `'HOME'`, the landing page showed generic login/signup buttons rather than the logged-in header.

## The Fix
The preemptive render bypass for `OnboardingView` was removed from `AuthShell.tsx`. 

- Now, `AuthShell` reliably returns `<OnboardingView />` as long as the internal view state is `'ONBOARDING'`, regardless of the instantaneous transition of `isOnboarded` to `true`.
- This ensures the user successfully proceeds to Step 9.
- On Step 9, clicking "Explore Migonest" triggers the native `handleOnboardingComplete` flow, which forces a full page reload (`window.location.href = '/'`).
- On the subsequent boot at `/`, `useAppLogic` natively recognizes the authenticated session and the newly `isOnboarded: true` profile, correctly routing the user into the main application.
