## 2024-06-24 - Speed up GitHub repository bulk import and sync
**Learning:** Sequential processing in large external API integrations (like iterating GitHub API requests and database operations one at a time) creates a significant performance bottleneck due to query waterfalls and cumulative latency.
**Action:** When parallelizing operations that involve external APIs like GitHub alongside database updates, use a conservative chunk size (e.g., 5-10) with `Promise.allSettled` to avoid hitting API rate limits while achieving performance gains.
