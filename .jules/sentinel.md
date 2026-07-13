## 2026-05-30 - Enforce JWT_SECRET globally
**Vulnerability:** A hardcoded, easily guessable secret was used as a fallback for JWT signing if the environment variable was missing.
**Learning:** This approach poses a critical security risk because testing or local settings could accidentally slip into production, exposing the application to token forgery.
**Prevention:** Never fall back to hardcoded secrets; instead, throw an explicit error to enforce secure configuration in all environments.

## 2026-06-09 - [Stored XSS via MIME spoofing in Craft Sync]
**Vulnerability:** External images synced from Craft.do were downloaded and uploaded to CDN without validating the MIME type against an allowlist or verifying magic bytes. The fallback logic generated `.jpg` extensions but retained the original Content-Type. This allowed Stored XSS where malicious files (e.g. SVG or HTML) could be uploaded and served from the CDN with their original, executable Content-Type.
**Learning:** Always validate both the Content-Type and file content (magic bytes) for any external file downloaded by the server before uploading it to a storage bucket, to prevent MIME spoofing. Never rely blindly on the Content-Type header from an untrusted source or fall back to safe extensions while retaining unsafe Content-Type metadata.
**Prevention:** Use a centralized, strict allowlist of image MIME types and verify the file content using magic byte signatures before accepting external downloads.

## 2026-06-14 - Centralize URL normalization
**Vulnerability:** Duplicated URL sanitization logic across components increases the risk of logical drift and inconsistent validation.
**Learning:** Centralizing security functions is a best practice that prevents future inconsistencies in URL validation.
**Prevention:** Extract shared URL validation into a centralized utility and update all call-sites to use it.
