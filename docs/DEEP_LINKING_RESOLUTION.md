# Mobile Deep Linking & Domain Verification Resolution

This document records the resolution of the mobile deep link verification failure (Android App Links) and provides a permanent configuration guide to prevent future regressions.

## 1. The Issue
Users were unable to verify the `migonest.com` domain in the Google Play Console. Symptomatically, visiting `https://migonest.com` in a browser often led to a Google Search result instead of the website.

### Root Causes
1.  **Domain Redirection**: A global "Naked to WWW" redirect (307/308) was active in the Vercel Dashboard/Cloudflare. Google's verification bot **refuses to follow redirects** when fetching `assetlinks.json`.
2.  **SPA Routing "Swallowing"**: The Single Page Application (SPA) catch-all rule in `vercel.json` was incorrectly matching the `/.well-known/` path and serving `index.html` (the landing page) instead of the static JSON file.
3.  **Missing DNS Record**: The `A` record for the naked domain (`@`) was missing or incorrectly configured in Cloudflare, leading to resolution failures.
4.  **Flavor Support**: The `assetlinks.json` was missing support for the `staging` app flavor (`com.migonest.app.staging`).

## 2. The Resolution

### A. Vercel Configuration (`vercel.json`)
The routing was hardened to ensure `.well-known` files are always served as static assets with the correct headers.

```json
{
  "headers": [
    {
      "source": "/.well-known/assetlinks.json",
      "headers": [{ "key": "Content-Type", "value": "application/json" }]
    }
  ],
  "rewrites": [
    {
      "source": "/.well-known/:path*",
      "destination": "/.well-known/:path*"
    },
    {
      "source": "/((?!api|auth|\\.well-known).*)",
      "destination": "/index.html"
    }
  ]
}
```

### B. DNS Configuration (Cloudflare)
- **A Record**: Added `@` pointing to `76.76.21.21` (Vercel Anycast).
- **Proxy Status**: Set to **DNS Only (Grey Cloud)** for the root domain. This ensures Vercel can handle SSL and verification directly without Cloudflare's proxy interfering with the handshake.

### C. Android Manifest
Updated `AndroidManifest.xml` to explicitly support both the naked domain and the `www` subdomain:
```xml
<intent-filter android:autoVerify="true">
    <data android:scheme="https" android:host="migonest.com" />
    <data android:scheme="https" android:host="www.migonest.com" />
</intent-filter>
```

## 3. Future Implementation Checklist
When setting up a new environment or domain:
- [ ] Ensure `assetlinks.json` is in `public/.well-known/`.
- [ ] Verify `assetlinks.json` returns `200 OK` (no redirect) via `curl -I`.
- [ ] Ensure the A-record for the naked domain is "DNS Only" in your DNS provider.
- [ ] Include all app package names (Production & Staging) in the `assetlinks.json` list.
