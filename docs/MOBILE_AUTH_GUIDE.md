# Mobile Authentication & Deep Link Session Hardening

This guide documents the 'Double-Lock' session recovery mechanism implemented to resolve persistent 'Authentication session expired' errors during mobile password resets.

## The Problem: Session Drift

When a user clicks 'Reset Password' from an email on a mobile device:
1.  **Web Bridge**: The browser opens a special 'Bridge' page on the web app.
2.  **Native Handoff**: Clicking 'Reset in App' fires a custom URL scheme (e.g., `com.migonest.app://reset-password?access_token=...`).
3.  **App Launch**: The native app launches, creates a new Supabase client instance, and attempts to set the session from the URL parameters.
4.  **The Expiry**: Occasionally, the Supabase client's internal background refresh or state synchronization would 'drift' or lose that temporary session before the user finished typing their new password. This resulted in the user seeing 'Authentication session expired' exactly when they clicked 'Update Password'.

## The Solution: Double-Lock Implementation

We implemented a two-layered defense to ensure the session remains locked even if the background state shifts.

### 1. State Persistence (`useAppLogic.ts`)
We no longer rely solely on the Supabase client's internal session listener. Instead, we explicitly capture and store the recovery tokens:

```typescript
// useAppLogic.ts
const [recoveryTokens, setRecoveryTokens] = useState<{ access_token: string, refresh_token: string } | null>(null);

const handleDeepLink = (data: URLOpenListenerEvent) => {
    // ... extract tokens ...
    setRecoveryTokens({ access_token, refresh_token }); // Store for UI propagation
};
```

### 2. Double-Lock Pre-flight (`ResetPasswordView.tsx`)
The `ResetPasswordView` accepts these `recoveryTokens` as props. Immediately before the password update API call, it performs a 'Double-Lock' check:

```typescript
// ResetPasswordView.tsx
const handleSubmit = async (e: React.FormEvent) => {
    // ...
    let { data: { session } } = await supabase.auth.getSession();
    
    // If session is missing, FORCE re-auth using the propagated props
    if (!session && recoveryTokens) {
        console.log('[Reset] Native Flow: Session missing, forcing re-auth via props...');
        const { data: restored } = await supabase.auth.setSession({ 
            access_token: recoveryTokens.access_token,
            refresh_token: recoveryTokens.refresh_token
        });
        if (restored.session) session = restored.session;
    }
    
    // Proceed with update
    await api.updatePassword(newPassword);
};
```

## Key Components

- **[useAppLogic.ts](file:///Users/mohammadwahedulhaque/Migonest-Prod/hooks/useAppLogic.ts)**: Centralizes the token extraction and state management.
- **[ViewRouter.tsx](file:///Users/mohammadwahedulhaque/Migonest-Prod/components/ViewRouter.tsx)**: Propagates the tokens down the view tree.
- **[ResetPasswordView.tsx](file:///Users/mohammadwahedulhaque/Migonest-Prod/pages/ResetPasswordView.tsx)**: The final enforcer of the Double-Lock mechanism and UI provider for the reset flow.

## Developer Notes

- **Never rely on `supabase.auth.onAuthStateChange` alone**: In Capacitor environments, listeners can behave inconsistently during app launch. Always prioritize passed props for critical recovery flows.
- **URL Parameters**: The app expects `access_token` and `refresh_token` in the deep link. Ensure the Supabase Email Templates match this format.
- **Scrollability**: The `ResetPasswordView` uses `min-h-[100dvh]` to ensure the form is scrollable on all mobile browsers, regardless of dynamic toolbars.
