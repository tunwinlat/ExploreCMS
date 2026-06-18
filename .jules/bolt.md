## 2024-06-18 - Native lazy loading for dynamic user content
**Learning:** Standard HTML `<img>` tags are explicitly used for dynamic post content instead of `next/image` to prevent crashes from unpredictable external image domains that aren't whitelisted in `next.config.js`.
**Action:** Always add the native `loading="lazy"` attribute to `<img>` tags for dynamically generated user images rendered below the fold to improve LCP and save bandwidth.
