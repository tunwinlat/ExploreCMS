## 2024-05-30 - Lazy Load Images
**Learning:** Adding lazy loading to images that appear below the fold improves initial page load times, especially important when Next.js `Image` component isn't used for unpredictable external sources.
**Action:** Always include `loading="lazy"` on standard HTML `<img>` tags if they are below the fold (e.g., in grids).
