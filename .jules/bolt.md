## 2026-05-28 - Optimize native image tags for user-generated content
**Learning:** In Next.js applications where `next/image` is avoided for unpredictable external URLs (like user-generated post covers), standard `<img>` tags must be explicitly given `loading="lazy"` to prevent eager loading.
**Action:** Always add `loading="lazy"` to native `<img>` tags rendering dynamic content below the fold to improve initial page load performance without the overhead or domain-whitelisting requirements of `next/image`.
