/**
 * Opens a URL in the best way depending on the platform.
 *
 * - On Capacitor (iOS/Android): uses `@capacitor/browser` SFSafariViewController,
 *   which keeps the user inside the app context. After the browser closes
 *   (e.g., Stripe redirects to success_url and the page loads in-browser), the
 *   `onBrowserFinished` callback is called so the app can re-check state.
 *
 * - On Web: falls back to `window.location.href` which is the normal redirect.
 */

import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export async function openExternalUrl(url: string, onBrowserFinished?: () => void) {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      if (onBrowserFinished) {
        // Listen for browser close event
        const listener = await Browser.addListener('browserFinished', () => {
          listener.remove();
          onBrowserFinished();
        });
      }

      await Browser.open({ url, presentationStyle: 'fullscreen' });
    } catch (err) {
      console.error('[Browser] Failed to open native browser, falling back to window.open:', err);
      window.open(url, '_blank');
      if (onBrowserFinished) onBrowserFinished();
    }
  } else {
    // Standard web - open in new tab as requested on desktop
    window.open(url, '_blank');
    // Call finished callback immediately so polling can start in original tab
    if (onBrowserFinished) {
      onBrowserFinished();
    }
  }
}
