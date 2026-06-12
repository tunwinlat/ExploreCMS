## 2024-06-12 - Fix Custom Keyboard Event Bubbling
**Learning:** When implementing custom `onKeyDown` handlers on container components like search modals, event bubbling can intercept native keyboard events (like `Enter` on focused links). This breaks the expected behavior for users relying on `Tab` to navigate.
**Action:** Always constrain custom container keyboard handlers by checking `document.activeElement` against the intended input element before calling `e.preventDefault()` or performing custom logic.
