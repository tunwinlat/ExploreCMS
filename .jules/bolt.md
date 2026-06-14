## 2026-06-14 - Parallelize API calls using chunks
**Learning:** Sequential loops for external API calls like GitHub and database queries cause performance bottlenecks. Using Promise.allSettled with chunking safely parallelizes requests without hitting rate limits.
**Action:** Apply conservative chunk sizes (e.g. 5) when batching API requests and database updates.
