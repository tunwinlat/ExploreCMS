## 2026-04-03 - Redundant Screen Reader Announcements for Visual Symbols
**Learning:** Icon-only buttons with `aria-label` and visual text symbols (like emojis or "×") cause redundant/confusing announcements.
**Action:** When adding semantic state attributes like `aria-pressed` or `aria-label` to interactive components, wrap any accompanying purely visual text symbols in `<span aria-hidden="true">` to prevent redundant screen reader announcements.
## 2026-03-15 - Missing Dialog Roles in Custom Modals
**Learning:** Found an app-wide accessibility issue where custom modals (like SearchBox and the generic Modal component) are missing essential ARIA roles (`role="dialog"` and `aria-modal="true"`). This prevents screen readers from correctly identifying the modal context and restricting interaction to the modal contents.
**Action:** Add `role="dialog"` and `aria-modal="true"` to modal container elements across the application to ensure screen reader users understand when a modal is active.
## 2024-03-24 - Interactive Grid Items Accessibility
**Learning:** Interactive div elements used as buttons (e.g., photo grid items) are completely ignored by keyboard navigation, making features like the Lightbox inaccessible to non-mouse users.
**Action:** Always add `tabIndex={0}`, `role="button"`, and an `onKeyDown` handler (listening for Enter/Space) to `div`s that act as clickable cards or grid items.
## 2024-04-01 - Interactive Grid Filter Toggle Accessibility
**Learning:** Found an app-wide accessibility issue where custom interactive filter toggle buttons (e.g., in DynamicPostGrid) are missing essential ARIA states (`aria-pressed`). This prevents screen readers from correctly communicating the active state of filter toggles.
**Action:** Always add `aria-pressed={isActive}` to toggle buttons used for filtering or switching states to ensure screen reader users understand the currently active selection.
## 2026-04-03 - Fixing missing jsdom environment in test for TipTapEditor
**Learning:** Found a Vitest `ReferenceError: document is not defined` when running a test related to an editor component that triggers DOM events.
**Action:** Always verify if a test interacts with the DOM (`document.dispatchEvent`, `window.prompt`, etc.). If so, prepend `/** @vitest-environment jsdom */` to the top of the test file to mock browser globals correctly and resolve the error.
## 2026-04-03 - Next.js Build Error: Proxy missing expected function export name
**Learning:** In Next.js, when changing `middleware.ts` to `proxy.ts`, the exported function inside the file must also be renamed from `export async function middleware(...)` to `export async function proxy(...)`.
**Action:** When renaming Next.js conventions like `middleware.ts` to `proxy.ts`, ensure you also rename the default export function to match `proxy`.
