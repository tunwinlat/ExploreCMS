## 2026-06-06 - Native Lazy Loading on HTML Images
**Learning:** When adding native `loading="lazy"` to `<img>` tags in Next.js (when using standard `<img>` instead of Next's `<Image>`), ensure that comments inside conditional JSX blocks are wrapped properly to avoid syntax errors, and that code review expectations (e.g. including performance metric explanations in comments) are strictly met.
**Action:** Double-check JSX comment syntax and always include a brief explanation comment near the optimization explaining the bandwidth/LCP benefits.
