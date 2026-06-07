## 2024-06-07 - Add native lazy loading to images
**Learning:** The memory mentions that Next.js <Image> component is avoided for unpredictable external sources. We need to add native `loading="lazy"` to standard HTML `<img>` tags rendered below the fold for better performance.
**Action:** When seeing `<img>` tags for below-the-fold content like RelatedPosts or DynamicPostGrid, add `loading="lazy"`.
