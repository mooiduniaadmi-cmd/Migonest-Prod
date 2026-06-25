# Stripe Billing Synchronization: Implementation Guide & Fix

## Overview
This document outlines the technical fix for the "Incorrect Billing Date" issue, where premium subscribers were seeing estimated anniversary dates instead of their actual Stripe billing cycles.

## The Issue
### Core Problem
The subscription retrieval logic initially relied on a single Stripe Search API call. However, the Stripe Search Index can suffer from **latency** (slow to update) or **failures** for certain email formats (e.g. `+test` aliases). This caused the system to believe no subscription existed, triggering a fallback anniversary calculation.

### Status Filtering
The original code only searched for `status: 'active'`. This missed users in a **`trialing`** state, which is a common state for new annual or promotional subscriptions.

## The "Super-Nuclear" Multi-Vector Solution
To ensure 100% reliability, we implemented a 14+ vector search heuristic in `api/index.ts`. The system now attempts to find a user's subscription in this order of priority:

| Vector | Method | Target | Confidence |
|--------|--------|--------|------------|
| Vector A | `subscriptions.search` | `metadata["userId"]` | Absolute (Match) |
| Vector B | `customers.search` | Exact Email | High |
| Vector O | **`customers.list`** | **Direct Email Match** | **Authoritative (Bypasses Index)** |
| Vector L/M | `invoices.search` / `pi.search` | Historical Transactions | High |
| Vector D/H | `customers.search` | Name / Fuzzy Name | Medium |
| Vector E | `subscriptions.list` | Latest 100 System-wide | Fallback |
| Vector P | `customers.list` | Manual scan of top 50 | Super-Nuclear |

## Self-Healing Mechanism (Metadata Auto-Repair)
Once a match is found using *any* vector, the system automatically performs a "Repair":
1. It confirms the `userId` matches the Supabase profile.
2. It calls `stripe.subscriptions.update` to attach the `userId` to the subscription metadata.
3. It calls `stripe.customers.update` to attach the `userId` to the customer metadata.

**Result**: Future lookups for that user will now be instant and 100% reliable via Vector A (Metadata).

## Subscription Contamination & "Sync Lock" (Fixed)

### The Issue
A critical cross-user contamination bug was identified where production users with similar email prefixes (e.g., `user@gmail.com` and `user+1@gmail.com`) were being incorrectly matched due to Stripe's fuzzy email tokenization. This caused:
1.  **False "Already Premium" Blocks**: High-confidence email matches on the wrong customer ID blocked new purchases.
2.  **Sync Lock**: Stripe had a valid subscription record, but the database profile was `is_subscribed: false`. The system blocked new payments thinking the user was already covered, but the user couldn't access features because the DB was out of sync.

### The "Mock Path" Bug (Fixed)
We discovered a legacy fallback in `/api/subscribe` that triggered when Stripe keys were missing. This path was hardcoded to **immediately** set `is_subscribed: true` in the database upon a purchase attempt. 
- **Fix**: This auto-flip logic has been deleted. Premium status is now **strictly** updated only via verified Stripe webhooks.

### The Self-Healing Fixes
1.  **Metadata Requirement**: The system now requires an exact `metadata.userId` match for any subscription to be considered a "blocking" duplicate. Orphaned records without matching IDs are ignored, allowing the user to proceed.
2.  **Database-Aware Bypass**: If a user's database status is `is_subscribed: false`, the system will **always** allow a new purchase attempt, even if a suspicious Stripe record exists. This allows users to "repair" their state via a fresh payment.
3.  **Debug Traceability**: Error responses for `alreadySubscribed` now include a `debugTrace` containing the offending **Stripe Subscription ID**, allowing for easy identification of ghost records in the dashboard.

## Future Maintenance
When modifying billing logic:
1.  **Never** re-introduce immediate database updates on purchase *attempts*. Always wait for the webhook.
2.  **Always** prioritize `metadata.userId` over email address for definitive identity matching.
3.  If users report being stuck, provide them with their `debugTrace` from the browser console to identify any orphaned records in the Stripe dashboard.


---
*Created: April 2026*
