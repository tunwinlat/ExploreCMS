## 2023-11-20 - Add keyboard navigation to SearchBox
**Learning:** The SearchBox component had visual hints for keyboard navigation (`↑↓ navigate`, `↵ select`) but the actual functionality was missing. Users rely on these visual cues, and failing to provide the functionality breaks trust and accessibility.
**Action:** Always ensure that visual keyboard shortcut hints in UI components correspond to functional implementations (e.g., handling ArrowUp, ArrowDown, and Enter events) to fulfill user expectations.
