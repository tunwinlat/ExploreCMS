## 2024-06-08 - Parallelize External API Calls with Promise.allSettled
**Learning:** Sequential external API calls (like fetching GitHub repo details and READMEs) in a `for...of` loop can cause significant performance bottlenecks and increase the likelihood of hitting rate limits.
**Action:** Use a conservative chunked approach (e.g., chunks of 5) with `Promise.allSettled` to parallelize requests while mitigating rate limit risks. When creating DB records in parallel, always append timestamps or random strings to ensure uniqueness for properties like slugs.
