## 2024-06-20 - Add SearchBox Keyboard Navigation
**Learning:** When adding visual keyboard shortcut hints (like `↑↓ navigate`, `↵ select`) in UI components, ensure the underlying logic is implemented. In `SearchBox.tsx`, the hints existed but only 'Escape' was handled, leading to an incomplete UX.
**Action:** Always verify that functional states (like `selectedIndex`) match visual cues. When adding active states to elements with existing hover styles (`:hover`), use dedicated CSS classes (e.g., `.selected`) instead of inline styles to prevent specificity conflicts.
