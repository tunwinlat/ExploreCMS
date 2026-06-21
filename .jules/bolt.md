## 2024-06-21 - Server-Side Regex & Payload Reduction
**Learning:** Returning full markdown/HTML strings in API pagination endpoints causes massive JSON payload bloat. Forcing the client to run regex (e.g., extracting excerpts/images) over these large strings blocks the main thread.
**Action:** Always pre-compute derived strings (like `excerpt` and `coverImage`) on the backend API route before sending the response, and drop the original `content` string from the payload if it's not actually displayed.
