## 2023-10-27 - Keyboard Navigation Hints Should Be Functional
**Learning:** Adding visual hints for keyboard shortcuts in UI components (like `↑↓` for navigation or `↵` to select) creates an expectation for keyboard users. If the corresponding `keydown` event listeners and state management are not actually implemented, it leads to a frustrating experience.
**Action:** Whenever adding UI hints for keyboard navigation, always ensure the backing logic (e.g., tracking a `selectedIndex`, using `scrollIntoView`, and handling `ArrowUp`/`ArrowDown`/`Enter`) is fully implemented and tested.
