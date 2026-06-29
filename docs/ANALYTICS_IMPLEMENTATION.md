# Analytics Tracking & Admin Dashboard

The goal is to track specific user events (clicks, signups, profile views, hires) along with rich metadata (Country, City, Device, Browser) and display these metrics on a secure Admin-only dashboard to drive sales and marketing decisions.

## Proposed Architecture

Instead of relying on heavy third-party analytics tools (like Google Analytics or PostHog) which can be blocked by ad-blockers and require external subscriptions, we will build a lightweight, privacy-focused in-house analytics module. 

### 1. Database Layer (Supabase)
We will create a new table called `analytics_events`:
- `id` (UUID, Primary Key)
- `event_name` (Text) - e.g., 'SIGNUP_CLICK', 'SIGNUP_COMPLETE', 'PROFILE_CLICK'
- `user_id` (UUID, nullable) - To track actions back to specific users if they are logged in.
- `country` (Text, nullable)
- `city` (Text, nullable)
- `device_type` (Text, nullable) - Mobile, Tablet, Desktop
- `browser` (Text, nullable) - Chrome, Safari, etc.
- `metadata` (JSONB, nullable) - Additional event context (e.g., the ID of the profile clicked).
- `created_at` (Timestamp)

### 2. Event Collection API (`/api/analytics/track`)
We will create a lightweight API endpoint in `api/index.ts` to capture events.
- **Location Data:** We will use Vercel's built-in headers (`x-vercel-ip-country`, `x-vercel-ip-city`) which provide high-accuracy geo-location out of the box *for free*, without needing any external IP-to-Location APIs.
- **Device Data:** We will install the lightweight `ua-parser-js` module to accurately extract the device type, OS, and browser from the user's `User-Agent` header.

### 3. Frontend Tracking Utility
We will create a `trackEvent(eventName, metadata)` utility function. We will insert this function into the following key flows:
1. **Signup Funnel:** `SIGNUP_CLICK` vs `SIGNUP_COMPLETE`
2. **Expert Funnel:** `EXPERT_SIGNUP_CLICK` vs `EXPERT_SIGNUP_COMPLETE`
3. **Hire Funnel:** `HIRE_EXPERT_CLICK` vs `HIRE_EXPERT_COMPLETE`
4. **Subscription Funnel:** `MESSAGE_SUBSCRIPTION_CLICK`
5. **Engagement:** `PROFILE_CLICK` (with the `expert_id` as metadata).

### 4. Admin Analytics Dashboard
We will create a new restricted view: `AdminAnalyticsView.tsx`.
- Accessible **only** if `currentUser.role === 'ADMIN'`.
- It will feature an overview dashboard showing:
  - **Funnel Drop-offs:** Visual comparisons (e.g., 100 clicks on "Become Expert", but only 20 completions).
  - **Geographic Heatmap/Table:** Top countries and cities driving traffic and conversions.
  - **Device/Browser Breakdown:** To optimize UI/UX for the most popular platforms.

> [!NOTE] 
> To build clean and interactive charts, I recommend installing the `recharts` module (a standard, lightweight React charting library). If you prefer not to add any UI dependencies, we can build simple progress-bar style charts using pure Tailwind CSS.

## Required Modules to Install
- `ua-parser-js` & `@types/ua-parser-js` (For decoding browsers/devices on the backend API).
- *(Optional but Recommended)* `recharts` (For building the Admin Analytics Dashboard charts).

## Open Questions

> [!WARNING]
> Please review the plan above and provide feedback on the following before I start development:
> 1. Are you okay with installing the `ua-parser-js` module to extract device data securely?
> 2. Are you okay with installing `recharts` for the dashboard, or would you prefer basic CSS charts to keep dependencies strictly minimal?
> 3. Are there any other specific events you want tracked besides the ones listed above?
