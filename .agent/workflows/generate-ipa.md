---
description: How to generate an .ipa file for iOS testing (iPhone & Simulator)
---

# Generating iOS Build (.ipa) for Testing

Follow these steps to build and package Migonest for iOS testing.

## 1. Prerequisites
- macOS with the latest version of **Xcode** installed.
- **CocoaPods** installed (`sudo gem install cocoapods`).
- A valid **Apple Developer Account** (for physical device testing).

## 2. Prepare the Web Build
Run the production build of the React application:
```bash
npm run build
```

## 3. Sync with Capacitor
Sync the web assets and dependencies with the native iOS project:
```bash
npx cap sync ios
```

## 4. Open in Xcode
Launch Xcode with the Migonest iOS project:
```bash
npx cap open ios
```

## 5. Configure Signing (Physical Device Only)
1. In Xcode, select the **App** project in the project navigator.
2. Select the **App** target under **Targets**.
3. Go to the **Signing & Capabilities** tab.
4. Ensure **Automatically manage signing** is checked.
5. Select your **Team** from the dropdown.

## 6. Testing on Simulator
1. In the Xcode toolbar, select an iOS Simulator (e.g., iPhone 15 Pro).
2. Click the **Play (Run)** button or press `Cmd + R`.
3. The app will launch in the simulator.

## 7. Generating the .ipa (Physical Device)
1. Select **Any iOS Device (arm64)** from the device list in the toolbar.
2. Go to **Product > Archive** in the top menu.
3. Once the archive is complete, the **Organizer** window will appear.
4. Click **Distribute App**.
5. Select **Development** or **Ad Hoc** as the distribution method.
6. Follow the prompts for signing.
7. Click **Export** to save the `.ipa` file to your Mac.

## 8. Installing on iPhone
1. Connect your iPhone to your Mac.
2. In Xcode, go to **Window > Devices and Simulators**.
3. Select your device.
4. Drag and drop the exported `.ipa` file into the **Installed Apps** section.
