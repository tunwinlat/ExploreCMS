## 2024-03-19 - Context-Aware ARIA Labels for Dynamic Remove Buttons
**Learning:** Icon-only or text-symbol removal buttons (like '×') in dynamically generated lists (e.g., tech tags or gallery images) create significant accessibility issues for screen reader users when they lack context, as they only hear "button x".
**Action:** Always provide context-aware `aria-label`s (e.g., `aria-label={"Remove " + tag + " tag"}`) and appropriate titles on dynamic remove buttons, ensuring each button's purpose is clear independently.
