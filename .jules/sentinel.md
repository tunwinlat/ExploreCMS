## 2024-05-24 - Per-User Rate Limiting on Password Reset
**Vulnerability:** IP-based rate limiting on the password reset endpoint could be bypassed (e.g. via proxy or distributed IPs), allowing attackers to spam targeted user emails by repeatedly requesting password resets.
**Learning:** Returning a generic success message prevents email enumeration, but without per-user rate limiting, the endpoint remains vulnerable to email spam and resource exhaustion.
**Prevention:** Implement per-user rate limits (e.g. checking the `passwordResetExpiry` time of the user's existing token) in addition to global IP rate limits.

## 2025-05-18 - [High] Stored XSS via SVG Uploads
**Vulnerability:** The file upload endpoints (`src/app/api/upload/route.ts`, `src/app/admin/dashboard/settings/storageActions.ts`, etc.) explicitly allowed uploading `image/svg+xml` files.
**Learning:** Allowing SVG file uploads in a web application without strict server-side sanitization is a critical security risk. SVGs are XML documents that can contain `<script>` tags or `javascript:` handlers. If a malicious user uploads an SVG containing an XSS payload and a victim opens the image directly or it gets rendered appropriately by the browser, the script will execute in the context of the application's domain, leading to Stored XSS.
**Prevention:** Do not include `image/svg+xml` in the allowed MIME types for user file uploads unless the application implements and enforces robust server-side SVG sanitization (e.g. using libraries like `dompurify` specifically configured for SVGs or stripping dangerous tags natively) before storing and serving the file.

## 2025-06-25 - API Key Encryption at Rest
**Vulnerability:** External integration API keys like `bunnyStorageApiKey` were stored in the database correctly encrypted but weren't properly decrypted before usage in endpoints like `src/app/api/upload/route.ts`.
**Learning:** Implementing encryption at rest requires ensuring all paths that read the secrets properly decrypt them using fallback patterns for legacy plaintext keys.
**Prevention:** When encrypting external keys in settings forms or DB migrations, always accompany the change with a full search of usages across the codebase and apply decryption wrappers.
