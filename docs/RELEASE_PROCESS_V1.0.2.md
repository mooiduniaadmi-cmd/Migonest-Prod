# Migonest Official Release Guide (v1.0.2)

This document outlines the official build and release process for Migonest on the Google Play Store and Apple App Store.

---

## 🚀 Release Information
*   **Release Name:** Migonest 1.0.2 - The Gateway to Global Education
*   **Version:** `1.0.2`
*   **Build Number:** `3`
*   **Status:** Production Ready

### 📝 Release Notes
**What’s New in Migonest v1.0.2**
Welcome to the debut of **Migonest**, the professional ecosystem connecting international students with vetted "Uni Experts." 

*   **🎓 Hire Vetted Uni Experts:** Connect with professionals who specialize in admissions for your target countries.
*   **🛡 Secure Escrow Protection:** Your payments are held securely and released only when milestones are verified by you.
*   **📑 Visa Denial Protection:** Advanced protection that ensures fair outcomes for students and experts.
*   **📁 Document Locker:** Securely store and manage your admission documents in one encrypted location.
*   **Mobile Stability:** Optimized high-resolution photo uploads and hardened authentication for a seamless mobile experience.

---

## 🤖 Android Release Process (Google Play)

### 1. Technical Preparation
Run these commands in the terminal from the project root:
```bash
# Clean and build production web assets
npm run build:prod

# Sync the web build with the Android project
npx cap sync android
```

### 2. Android Studio Build
1.  **Open Project:** `npx cap open android`
2.  **Generate Bundle:** Go to **Build > Generate Signed Bundle / APK**.
3.  **Select AAB:** Choose **Android App Bundle (AAB)**.
4.  **Keystore:** Use your production `.jks` keystore.
5.  **Variant:** Select `productionRelease`.

### 3. Google Play Console
1.  Navigate to **Production > Create new release**.
2.  Upload the `.aab` file found in `android/app/release/`.
3.  Paste the Release Notes above into the **Release Notes** section.
4.  Submit for review.

---

## 🍎 iOS Release Process (App Store)

### 1. Technical Preparation
Run these commands in the terminal from the project root:
```bash
# Clean and build production web assets
npm run build:prod

# Sync the web build with the iOS project
npx cap sync ios
```

### 2. Xcode Build
1.  **Open Project:** `npx cap open ios`
2.  **Select Device:** In the top toolbar, select **Any iOS Device (arm64)**.
3.  **Verify Bundle ID:** Ensure it is set to `com.migonest.app`.
4.  **Archive:** Select **Product > Archive** from the top menu.

### 3. App Store Connect Upload
1.  Once the Archive is created, click **Distribute App** in the Organizer window.
2.  Select **App Store Connect > Upload**.
3.  Follow the prompts to sign and upload.
4.  After ~15 minutes, go to [App Store Connect](https://appstoreconnect.apple.com/), select the build, and submit for review.

---

## ⚠️ Critical Production environment Check
Ensure your `.env.production` is correctly set before running any build:
- `VITE_SUPABASE_URL` must point to your live production Supabase instance.
- `VITE_API_URL` must be `https://api.migonest.com`.
- Stripe keys must be in **Live Mode** (beginning with `pk_live_`).

---
*Documentation generated for Migonest Team - April 2026*
