
## 2025-05-24 - [High] Stored XSS via URL Parser Differentials
**Vulnerability:** URL input fields (`githubUrl`, `liveUrl`) were validated with a boolean check `isValidUrl`, but the raw input strings were subsequently saved directly to the database.
**Learning:** Returning a boolean from URL validation leaves applications vulnerable to parser differentials and trailing obfuscations. If an attacker inputs a URL that bypasses the simple string or weak parsing checks but executes maliciously in the browser (e.g. ` javascript:alert(1)` with a leading space), the raw payload is saved. Browsers may normalize and execute payloads differently than the server validated them.
**Prevention:** Always normalize and re-serialize URLs before saving them by using the strictly parsed `URL.toString()` output. If supporting relative URLs, ensure dummy bases (like `http://localhost`) are not inadvertently appended to the saved relative path by handling relative URLs without using a dummy base during normalization.

## 2026-06-02 - [Critical] Stored XSS in Image/URL Server Actions
**Vulnerability:** Several Server Actions (`addProjectImage`, `saveProject`, `addPhoto`, `saveAlbum`, `updateAlbumCover`) accepted raw URL inputs (e.g., `url` or `coverImage`) and stored them in the database without validation. This allowed an attacker to inject `javascript:` URIs, leading to Stored XSS when the image links were rendered.
**Learning:** The URL normalization logic that existed locally in `projectActions.ts` was effective but not applied consistently to all image and URL fields across the platform. Duplication leads to missed coverage.
**Prevention:** Create a centralized validation utility (`src/lib/urlUtils.ts`) and uniformly pass all external URL inputs through it before persisting to the database.
