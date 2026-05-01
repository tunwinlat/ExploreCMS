## 2024-05-24 - Per-User Rate Limiting on Password Reset
**Vulnerability:** IP-based rate limiting on the password reset endpoint could be bypassed (e.g. via proxy or distributed IPs), allowing attackers to spam targeted user emails by repeatedly requesting password resets.
**Learning:** Returning a generic success message prevents email enumeration, but without per-user rate limiting, the endpoint remains vulnerable to email spam and resource exhaustion.
**Prevention:** Implement per-user rate limits (e.g. checking the `passwordResetExpiry` time of the user's existing token) in addition to global IP rate limits.

## 2025-05-18 - [High] Stored XSS via SVG Uploads
**Vulnerability:** The file upload endpoints (`src/app/api/upload/route.ts`, `src/app/admin/dashboard/settings/storageActions.ts`, etc.) explicitly allowed uploading `image/svg+xml` files.
**Learning:** Allowing SVG file uploads in a web application without strict server-side sanitization is a critical security risk. SVGs are XML documents that can contain `<script>` tags or `javascript:` handlers. If a malicious user uploads an SVG containing an XSS payload and a victim opens the image directly or it gets rendered appropriately by the browser, the script will execute in the context of the application's domain, leading to Stored XSS.
**Prevention:** Do not include `image/svg+xml` in the allowed MIME types for user file uploads unless the application implements and enforces robust server-side SVG sanitization (e.g. using libraries like `dompurify` specifically configured for SVGs or stripping dangerous tags natively) before storing and serving the file.

## $(date +%Y-%m-%d) - [High] Stored XSS via Parser Differentials in getSafeUrl
**Vulnerability:** The `getSafeUrl` function used for validating user-provided URLs in `ProjectCard` and `Project` pages checked that the parsed URL's protocol was `http:` or `https:`, but returned the *raw* user input string instead of the serialized URL.
**Learning:** Returning raw URL strings after validation can lead to Stored XSS if the browser's URL parser differs slightly from the backend validation parser (e.g., handling of leading/trailing spaces, control characters, or obfuscations).
**Prevention:** When validating URLs using the `URL` constructor, always return the strictly serialized and normalized URL (`parsed.toString()`) to ensure the rendered URL perfectly matches the validated state.
