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
## 2024-05-18 - CSS-Driven Dropdown Menu Accessibility
**Learning:** Dropdown menus driven purely by CSS `:hover` states are completely inaccessible to keyboard users and screen readers, trapping navigation or preventing access to sub-items.
**Action:** When implementing CSS-driven dropdown menus, ensure keyboard accessibility by adding `:focus-within` selectors to the container alongside `:hover`, and manage the trigger button's `aria-expanded` attribute dynamically via React state (`onFocus`, `onBlur`, `onMouseEnter`, `onMouseLeave`).
## 2024-05-03 - Decorative Visual Symbols in ARIA-Labelled Buttons
**Learning:** Adding semantic state attributes like `aria-label` or `aria-pressed` to interactive components (e.g., icon-only buttons) is good, but any accompanying purely visual text symbols (such as checkmarks, emojis, or '✕') must be wrapped in `<span aria-hidden="true">` to prevent redundant or confusing screen reader announcements.
**Action:** When adding or verifying `aria-label`s on buttons, always check if the visual contents are decorative and explicitly hide them from screen readers using `aria-hidden="true"`.
