## 2023-10-25 - Reducing Payload Size for Infinite Scroll
**Learning:** Returning full HTML/Markdown content strings in infinite scroll API routes (like `/api/posts`) causes massive JSON payloads, especially as users scroll deep into the feed. React components only need an excerpt and a cover image for the grid display.
**Action:** Always compute derived fields (like `excerpt` and `coverImage`) on the server *before* sending the JSON response. Use Prisma's `select` clause to fetch only what's needed, and explicitly omit or delete the heavy `content` field from the returned objects.
