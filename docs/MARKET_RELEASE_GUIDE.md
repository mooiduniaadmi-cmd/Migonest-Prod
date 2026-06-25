# Market Release Guide: Migonest App

This guide provides a step-by-step roadmap to release **Migonest** (`com.migonest.app`) on both the Google Play Store and Apple App Store using your `migonest.dev@gmail.com` account.

---

## 1. Pre-Release Checklist (Both Stores)

Before you begin the technical submission, ensure you have the following assets ready:
- **Privacy Policy URL**: (Already implemented in your app, use `https://migonest.com` if asked for a link).
- **App Icons**: 1024x1024px (High-res).
- **Screenshots**: At least 3-4 professional screenshots for various device sizes (iPhone 6.7", iPhone 5.5", Android Phone, Tablet).
- **App Description**: A compelling summary of Migonest's features (Hiring experts, admission journey, secure wallet).
- **Support Email**: `migonest.dev@gmail.com`.

---

## 2. Google Play Store (Android)

### Step A: Create Developer Account
1. Go to [Google Play Console](https://play.google.com/console/signup).
2. Sign in with `migonest.dev@gmail.com`.
3. Pay the **one-time $25 fee**.
4. Complete your developer profile (Identity verification required).

### Step B: Create the App
1. Click **Create app**.
2. App Name: **Migonest**.
3. Default language: **English (US)**.
4. App or Game: **App**.
5. Free or Paid: **Free** (You handle payments via Stripe, not Play Store billing).

### Step C: Build the App (AAB)
Run these commands in your project root:
```bash
# 1. Build the web files
npm run build

# 2. Sync with Android
npx cap sync android

# 3. Open in Android Studio
npx cap open android
```
In Android Studio:
1. Go to **Build > Generate Signed Bundle / APK**.
2. Select **Android App Bundle (AAB)**.
3. Create a new **Keystore** (Store this securely! If you lose it, you can't update the app).
4. Build the **Release** variant.

### Step D: Upload & Publish
1. In Play Console, go to **Production > Create new release**.
2. Upload the `.aab` file from `android/app/release/`.
3. Fill out **App Content** (Rating, Target Audience, etc.).
4. Submit for review (Usually takes 3-7 days for first release).

---

## 3. Apple App Store (iOS)

### Step A: Apple Developer Program
1. Go to [Apple Developer Program](https://developer.apple.com/programs/).
2. Enroll using your Apple ID.
3. Pay the **$99/year fee**.

### Step B: Certificates & Identifiers
1. Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list).
2. Register a new **App ID**: `com.migonest.app`.
3. Create a **Distribution Certificate**.

### Step C: Create App in App Store Connect
1. Go to [App Store Connect](https://appstoreconnect.apple.com/).
2. **My Apps > (+)**.
3. Name: **Migonest**.
4. Bundle ID: Select `com.migonest.app`.
5. SKU: `migonest-prod-001`.

### Step D: Build & Upload (Xcode)
Run these locally:
```bash
# 1. Sync with iOS
npx cap sync ios

# 2. Open in Xcode
npx cap open ios
```
In Xcode:
1. Select **Any iOS Device (arm64)** as target.
2. Go to **Product > Archive**.
3. Once finished, click **Distribute App** in the Organizer.
4. Choose **App Store Connect** and follow prompts to upload.

---

## 4. Critical Checks for Migonest

> [!IMPORTANT]
> **Stripe & Supabase Environments**
> Ensure your `.env.production` is used during the build.
> - Verify `VITE_SUPABASE_URL` is pointing to production.
> - Verify `VITE_API_URL` is `https://api.migonest.com`.
> - Check that Stripe is in **Live Mode** (Secret keys in Vercel, Publishable keys in App).

> [!WARNING]
> **App Review - Demo Account**
> Both Google and Apple will need to log in to test the app. 
> - Create a **Test Student** and **Test Expert** account with dummy data.
> - Provide these credentials in the "App Access" section of the store consoles.
