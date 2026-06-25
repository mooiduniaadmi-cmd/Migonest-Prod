# Stripe Subscription Status Synchronization Guide

## Problem Overview
A discrepancy was identified where Stripe correctly reported a membership as "Service ends on [Date]", but the Migonest App incorrectly displayed "Renews on [Date]". This caused user confusion regarding whether their subscription would auto-renew.

## Root Causes
1. **Narrow Cancellation Detection**: The app previously only checked the `cancel_at_period_end` boolean. Stripe can also indicate a scheduled cancellation using the `cancel_at` timestamp.
2. **Search Vector Limitations**: The backend Stripe search was restricted to `status: 'active'`. While most pending cancellations are active, some edge cases or specific Stripe configurations can lead to status mismatches during the search.
3. **UI Fallback Logic**: The frontend used nullish coalescing (`??`) for the cancellation flag. If the real-time API returned a default `false` (due to a failed lookup or missing property), it would override a valid `true` value stored in the database.

## Implementation Details

### 1. Broadened Search Logic (`api/index.ts`)
The `subscription-status` API now searches for all subscription statuses and specifically handles the "canceled but active" state:
- Status search broadened to `status: 'all'`.
- `updateBestSub` now accepts subscriptions that are `active`, `trialing`, or `canceled` (if the current period end is in the future).

### 2. Dual-Flag Cancellation Check
We now check both the boolean and the timestamp provided by Stripe:
```typescript
const isCancelled = !!subscription.cancel_at_period_end || !!subscription.cancel_at;
```
This ensures that any scheduled termination is correctly reflected in the app.

### 3. Professional UI Labels (`ProfileView.tsx`)
Labels were updated to match premium industry standards and Stripe's own terminology:
- **Renews on**: Replaces "Next billing on".
- **Service ends on**: Replaces "Premium cancels on".
- **Membership Ending**: Replaces "Premium Cancels Soon".
- **Premium Membership**: Replaces "Premium Subscription active".

### 4. Hardened UI State Transition
The frontend now uses a logical OR (`||`) to combine real-time API data with the cached database profile. If **either** source indicates a cancellation, the app displays the "Service ends on" status.

## Relevant Files
- `api/index.ts`: Backend search and status calculation.
- `pages/ProfileView.tsx`: Frontend status rendering and label definitions.
- `supabase/migrations/add_cancel_at_period_end.sql`: Database schema for cancellation tracking.
