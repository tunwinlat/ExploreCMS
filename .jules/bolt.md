## 2026-05-15 - Native Lazy Loading Optimization
**Learning:** For dynamic, user-generated external images where Next.js `next/image` cannot be used safely due to strict domain whitelisting, performance optimization must fall back to standard HTML `<img>` tags. In these cases, it is critical to leverage the browser's native `loading="lazy"` attribute to defer off-screen image loading.
**Action:** Always add `loading="lazy"` to standard `<img>` tags used for lists or grids (e.g., `DynamicPostGrid`, `RelatedPosts`) to prevent unnecessary network requests below the fold.
