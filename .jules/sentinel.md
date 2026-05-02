## 2024-05-24 - Per-User Rate Limiting on Password Reset
**Vulnerability:** IP-based rate limiting on the password reset endpoint could be bypassed (e.g. via proxy or distributed IPs), allowing attackers to spam targeted user emails by repeatedly requesting password resets.
**Learning:** Returning a generic success message prevents email enumeration, but without per-user rate limiting, the endpoint remains vulnerable to email spam and resource exhaustion.
**Prevention:** Implement per-user rate limits (e.g. checking the `passwordResetExpiry` time of the user's existing token) in addition to global IP rate limits.

## 2025-05-18 - [High] Stored XSS via SVG Uploads
**Vulnerability:** The file upload endpoints (`src/app/api/upload/route.ts`, `src/app/admin/dashboard/settings/storageActions.ts`, etc.) explicitly allowed uploading `image/svg+xml` files.
**Learning:** Allowing SVG file uploads in a web application without strict server-side sanitization is a critical security risk. SVGs are XML documents that can contain `<script>` tags or `javascript:` handlers. If a malicious user uploads an SVG containing an XSS payload and a victim opens the image directly or it gets rendered appropriately by the browser, the script will execute in the context of the application's domain, leading to Stored XSS.
**Prevention:** Do not include `image/svg+xml` in the allowed MIME types for user file uploads unless the application implements and enforces robust server-side SVG sanitization (e.g. using libraries like `dompurify` specifically configured for SVGs or stripping dangerous tags natively) before storing and serving the file.

## 2025-05-24 - [High] Stored XSS via URL Parser Differentials
**Vulnerability:** URL input fields (`githubUrl`, `liveUrl`) were validated with a boolean check `isValidUrl`, but the raw input strings were subsequently saved directly to the database.
**Learning:** Returning a boolean from URL validation leaves applications vulnerable to parser differentials and trailing obfuscations. If an attacker inputs a URL that bypasses the simple string or weak parsing checks but executes maliciously in the browser (e.g. ` javascript:alert(1)` with a leading space), the raw payload is saved. Browsers may normalize and execute payloads differently than the server validated them.
**Prevention:** Always normalize and re-serialize URLs before saving them by using the strictly parsed `URL.toString()` output. If supporting relative URLs, ensure dummy bases (like `http://localhost`) are not inadvertently appended to the saved relative path by handling relative URLs without using a dummy base during normalization.
