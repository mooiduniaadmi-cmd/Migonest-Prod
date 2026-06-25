# iOS Keyboard Layout Resolution

This document specifies the layout strategies implemented to permanently resolve Apple/iOS software keyboard overlay and form clipping issues in Migonest.

## The Issues
1. **Header Escaping**: Forms using `KeyboardResize.Native` paired with Absolute positioning caused modals to be pushed UP and hidden behind the top navigation bar.
2. **Input Clipping**: Inputs anchored at the bottom of scroll containers (like "Search Countries" or "Password") were clipped beneath the keyboard.
3. **Dropdown Masking**: Dropdown menus (which use `absolute` positioning within `overflow-y-auto` bounds) physically lacked scrollable space to render beneath a focused input when constrained by the open keyboard.

## The Fix (Permanent Reference)

### 1. Capacitor Base Logic
- **`capacitor.config.ts`**: Set `Keyboard.resize` to `KeyboardResize.Body`. This ensures the root document scales accurately without distorting the layout coordinates, allowing traditional CSS and `fixed` components to behave predictably.

### 2. Global Keyboard Handlers (`App.tsx`)
Because iOS Safari does not proactively auto-scroll nested elements and doesn't tell inner `div` elements to resize dynamically:
- **Focus Auto-Scroll**: A global `focusin` listener was attached to the document. When an input is focused, the app waits exactly 300ms (to account for the native iOS keyboard animation) and triggers `.scrollIntoView({ behavior: 'smooth', block: 'center' })`.
- **Dynamic Offset Variable**: Native listeners on `keyboardWillShow` extract `info.keyboardHeight` and inject it globally into `document.documentElement` as `--keyboard-offset`.

### 3. Smart Modal Resizing (Core Forms)
- **Hard Clamp**: Modals (e.g., `ExpertApplicationModal`, `HiringWizardModal`) abandoned static `max-h` limits in favor of responsive inline styling calculation:
  ```javascript
  style={{ maxHeight: 'calc(95% - var(--keyboard-offset, 0px))' }}
  ```
  This rigidly stops the `overflow-y-auto` window exactly at the top crest of the active keyboard.

### 4. The Overscroll Spacer
To guarantee that the `.scrollIntoView('center')` logic can successfully elevate bottom-tier inputs, an artificial buffer was placed at the very end of every modal:
```javascript
{/* Dynamic Mobile Overscroll Spacer */}
<div className="w-full shrink-0 transition-all duration-300" style={{ height: 'var(--keyboard-offset, 0px)' }} aria-hidden="true" />
```
**Mechanism**: This forces the bottom of the scroll container to expand by the *exact* size of the keyboard. This allows the user to manually scroll "past" the bottom of the form to cleanly view dropdown menus (like Search Regions) that hang below the active input field.

## Troubleshooting Future Regressions
If any inputs begin hiding on iOS again:
1. Ensure the container has `overflow-y-auto` and the dynamic `style={{ maxHeight: 'calc(X% - var(--keyboard-offset, 0px))' }}` is intact.
2. Ensure the `<div ... height: 'var(--keyboard-offset...' />` spacer exists at the final boundary of the long scrolling `div`.
3. Verify that `App.tsx` retains the global `focusin` interceptor.
