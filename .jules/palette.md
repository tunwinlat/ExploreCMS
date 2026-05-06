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
## 2024-05-19 - Missing ARIA Relationships in Dropdown Menus
**Learning:** Custom dropdown menus built with `<div>` and `<button>` elements often lack the necessary ARIA relationships to inform screen readers that a button opens a menu and which elements constitute the menu items.
**Action:** Always add `aria-haspopup="menu"` and `aria-controls="[menu-id]"` to the toggle button. Ensure the dropdown container has `id="[menu-id]"` and `role="menu"`, and each item inside has `role="menuitem"`.
