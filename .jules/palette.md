## 2024-06-18 - Implement Keyboard Navigation for Search Results
**Learning:** Adding keyboard shortcut hints to the UI (like "↑↓ navigate") without actually implementing the backing JavaScript logic sets up poor expectations and harms accessibility.
**Action:** Always ensure any keyboard navigation advertised in the UI is fully implemented using `onKeyDown` listeners, bounds-checked `selectedIndex` state, and scrolling behaviors like `scrollIntoView`.
