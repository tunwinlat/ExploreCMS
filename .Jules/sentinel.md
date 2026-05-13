## 2024-05-24 - Per-User Rate Limiting on Password Reset
**Vulnerability:** IP-based rate limiting on the password reset endpoint could be bypassed (e.g. via proxy or distributed IPs), allowing attackers to spam targeted user emails by repeatedly requesting password resets.
**Learning:** Returning a generic success message prevents email enumeration, but without per-user rate limiting, the endpoint remains vulnerable to email spam and resource exhaustion.
**Prevention:** Implement per-user rate limits (e.g. checking the `passwordResetExpiry` time of the user's existing token) in addition to global IP rate limits.

## 2025-05-18 - [High] Stored XSS via SVG Uploads
**Vulnerability:** The file upload endpoints (`src/app/api/upload/route.ts`, `src/app/admin/dashboard/settings/storageActions.ts`, etc.) explicitly allowed uploading `image/svg+xml` files.
**Learning:** Allowing SVG file uploads in a web application without strict server-side sanitization is a critical security risk. SVGs are XML documents that can contain `<script>` tags or `javascript:` handlers. If a malicious user uploads an SVG containing an XSS payload and a victim opens the image directly or it gets rendered appropriately by the browser, the script will execute in the context of the application's domain, leading to Stored XSS.
**Prevention:** Do not include `image/svg+xml` in the allowed MIME types for user file uploads unless the application implements and enforces robust server-side SVG sanitization (e.g. using libraries like `dompurify` specifically configured for SVGs or stripping dangerous tags natively) before storing and serving the file.

## 2026-04-15 - File Upload MIME Spoofing Vulnerability
**Vulnerability:** The API endpoint `src/app/api/upload/route.ts` relied solely on the `file.type` (MIME type) and file extension to determine the type of the uploaded file.
**Learning:** Relying exclusively on HTTP headers or file extensions for validation can lead to MIME spoofing attacks (e.g. uploading an executable disguised as a `.png`). Ensuring that the actual contents of the uploaded files match their claimed extension (via magic byte validation) is a more robust verification method to prevent the uploading of malicious files.
**Prevention:** Introduce a check against known 'magic bytes' or file signatures (e.g., `FF D8 FF` for JPEG, `89 50 4E 47` for PNG) at the beginning of the file buffer to accurately verify its format before proceeding with the upload process.

## 2025-06-25 - API Key Encryption at Rest
**Vulnerability:** External integration API keys like `bunnyStorageApiKey` were stored in the database correctly encrypted but weren't properly decrypted before usage in endpoints like `src/app/api/upload/route.ts`.
**Learning:** Implementing encryption at rest requires ensuring all paths that read the secrets properly decrypt them using fallback patterns for legacy plaintext keys.
**Prevention:** When encrypting external keys in settings forms or DB migrations, always accompany the change with a full search of usages across the codebase and apply decryption wrappers.

## 2025-05-01 - [High] Stored XSS via Parser Differentials in getSafeUrl
**Vulnerability:** The `getSafeUrl` function used for validating user-provided URLs in `ProjectCard` and `Project` pages checked that the parsed URL's protocol was `http:` or `https:`, but returned the *raw* user input string instead of the serialized URL.
**Learning:** Returning raw URL strings after validation can lead to Stored XSS if the browser's URL parser differs slightly from the backend validation parser (e.g., handling of leading/trailing spaces, control characters, or obfuscations).
**Prevention:** When validating URLs using the `URL` constructor, always return the strictly serialized and normalized URL (`parsed.toString()`) to ensure the rendered URL perfectly matches the validated state.
