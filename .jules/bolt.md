## 2026-06-08 - Parallelize External API Calls with Promise.allSettled
**Learning:** Sequential external API calls (like fetching GitHub repo details and READMEs) in a `for...of` loop can cause significant performance bottlenecks and increase the likelihood of hitting rate limits.
**Action:** Use a conservative chunked approach (e.g., chunks of 5) with `Promise.allSettled` to parallelize requests while mitigating rate limit risks. When creating DB records in parallel, always append timestamps or random strings to ensure uniqueness for properties like slugs.

## 2026-06-21 - Server-Side Regex & Payload Reduction
**Learning:** Returning full markdown/HTML strings in API pagination endpoints causes massive JSON payload bloat. Forcing the client to run regex (e.g., extracting excerpts/images) over these large strings blocks the main thread.
**Action:** Always pre-compute derived strings (like `excerpt` and `coverImage`) on the backend API route before sending the response, and drop the original `content` string from the payload if it's not actually displayed.
