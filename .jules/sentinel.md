## 2024-05-24 - Per-User Rate Limiting on Password Reset
**Vulnerability:** IP-based rate limiting on the password reset endpoint could be bypassed (e.g. via proxy or distributed IPs), allowing attackers to spam targeted user emails by repeatedly requesting password resets.
**Learning:** Returning a generic success message prevents email enumeration, but without per-user rate limiting, the endpoint remains vulnerable to email spam and resource exhaustion.
**Prevention:** Implement per-user rate limits (e.g. checking the `passwordResetExpiry` time of the user's existing token) in addition to global IP rate limits.

## 2025-05-18 - [High] Stored XSS via SVG Uploads
**Vulnerability:** The file upload endpoints (`src/app/api/upload/route.ts`, `src/app/admin/dashboard/settings/storageActions.ts`, etc.) explicitly allowed uploading `image/svg+xml` files.
**Learning:** Allowing SVG file uploads in a web application without strict server-side sanitization is a critical security risk. SVGs are XML documents that can contain `<script>` tags or `javascript:` handlers. If a malicious user uploads an SVG containing an XSS payload and a victim opens the image directly or it gets rendered appropriately by the browser, the script will execute in the context of the application's domain, leading to Stored XSS.
**Prevention:** Do not include `image/svg+xml` in the allowed MIME types for user file uploads unless the application implements and enforces robust server-side SVG sanitization (e.g. using libraries like `dompurify` specifically configured for SVGs or stripping dangerous tags natively) before storing and serving the file.

## $(date +%Y-%m-%d) - Fix encrypted API key usage in Bunny CDN upload route
**Vulnerability:** The application was passing the database-encrypted `bunnyStorageApiKey` directly to the `BunnyStorageClient` without decrypting it, causing uploads to fail and exposing the encrypted payload to a third-party service.
**Learning:** When adopting field-level database encryption (e.g., `src/lib/crypto.ts`), ensure all consumers of the newly encrypted fields are updated to decrypt the values before use, particularly external API clients.
**Prevention:** Implement comprehensive end-to-end tests for all integration points whenever encryption is rolled out to an existing field, or use strongly-typed wrapper classes for secrets to prevent encrypted strings from being passed as plain-text credentials.

## $(date +%Y-%m-%d) - Prevent Stored XSS via URL Parser Differentials
**Vulnerability:** The URL validation logic in `projectActions.ts` verified that URLs started with a safe protocol (`http:`/`https:`) or `/` but returned a boolean instead of the normalized URL string. The raw user input was then saved to the database. This allowed bypasses via parser differentials (where `new URL()` parses the input safely but the browser interprets it differently) or obfuscated inputs like `\njavascript:alert(1)`.
**Learning:** Returning a simple boolean from URL validation is insufficient when dealing with complex parsers. The raw input must never be trusted directly if it has been validated via a parser.
**Prevention:** Always normalize the URL using `new URL().toString()` and store the strictly serialized output in the database, ensuring that the stored value matches exactly what was validated.
