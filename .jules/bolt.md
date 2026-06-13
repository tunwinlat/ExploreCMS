
## 2024-05-19 - Safe suppression of ESLint rules in JSX
**Learning:** When attempting to suppress Next.js image warnings (`@next/next/no-img-element`) for standard HTML `<img>` tags inside JSX, adding `/* eslint-disable-next-line ... */` directly above the element renders the comment as literal text in the UI. Also, attempting to add file-level disables or complex logic can introduce unneeded lint warnings or break other React rules (like hook order).
**Action:** Next time, carefully wrap inline JSX disable comments in curly braces: `{/* eslint-disable-next-line @next/next/no-img-element */}`. If a file is too complex, prefer `// eslint-disable-next-line ...` inside JavaScript blocks, or explicitly use curly brace syntax for comments within JSX trees.
