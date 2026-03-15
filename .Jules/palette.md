## 2026-03-15 - Missing Dialog Roles in Custom Modals
**Learning:** Found an app-wide accessibility issue where custom modals (like SearchBox and the generic Modal component) are missing essential ARIA roles (`role="dialog"` and `aria-modal="true"`). This prevents screen readers from correctly identifying the modal context and restricting interaction to the modal contents.
**Action:** Add `role="dialog"` and `aria-modal="true"` to modal container elements across the application to ensure screen reader users understand when a modal is active.
