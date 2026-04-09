## 2023-10-27 - [Critical] Hardcoded JWT Fallback Secret Removed
**Vulnerability:** A hardcoded `explore-cms-super-secret-key-that-should-be-changed` string was used as a fallback for the `JWT_SECRET` in both `src/lib/auth.ts` and `src/middleware.ts`.
**Learning:** This is a critical security risk because if a developer forgets to set the `JWT_SECRET` environment variable in production, the application will silently use the publicly known fallback secret to sign JWT sessions. This allows any attacker who knows the repository source code to trivially forge arbitrary admin (OWNER) session cookies and completely bypass authentication and authorization.
**Prevention:** Remove hardcoded fallback secrets completely. Instead, securely throw an explicit error (`throw new Error(...)`) at runtime if the critical secret is missing and the environment is set to `production`.

## 2024-03-13 - [High] XSS Vulnerability in SearchBox Component
**Vulnerability:** The `SearchBox` component used `dangerouslySetInnerHTML` combined with an insufficiently escaped `highlightMatch` function. The `query` parameter was not HTML-escaped before being interpolated into the `text.replace()` call.
**Learning:** Using `dangerouslySetInnerHTML` for simple text highlighting is dangerous because it makes XSS easy if user input isn't fully sanitized, and often developers miss escaping edge cases.
**Prevention:** Avoid `dangerouslySetInnerHTML` whenever possible. Implement highlighting by parsing the text into safe React Elements (`<span>`, `<mark>`) instead of HTML strings.

## 2024-03-14 - [High] XSS Vulnerabilities in PostFeed and PostModalIntercept Components
**Vulnerability:** The `PostFeed` and `PostModalIntercept` components used `dangerouslySetInnerHTML` directly with user-generated post content without any sanitization.
**Learning:** This is a High priority XSS vulnerability, as it directly evaluates user-controlled HTML string as HTML in the browser. A malicious user who can create or modify posts could inject harmful scripts into the page.
**Prevention:** Ensure that any HTML strings rendered using `dangerouslySetInnerHTML` are properly sanitized using the `sanitizeContent` utility from `@/lib/sanitize`. Be careful with truncating HTML strings; they must either be truncated carefully so that no tags are left open, or sanitized *after* truncation (if it doesn't leave broken script tags that are then stripped) or use another safer approach, but at least `sanitizeContent` must be applied.
## 2025-03-05 - Rate Limiting on Login Action
**Vulnerability:** Brute-force attacks on the admin login endpoint.
**Learning:** Next.js server actions do not receive a standard `Request` object. To extract client IPs for rate-limiting inside server actions, we must retrieve headers (`x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`) using `headers()` from `next/headers`.
**Prevention:** Explicitly construct the client IP from the `headers()` payload in critical server actions and pass it to utility rate limiters like `checkRateLimit`.
## 2024-05-30 - Missing Rate Limiting on Password Reset Endpoints
**Vulnerability:** The `requestPasswordReset` and `resetPassword` server actions lacked rate limiting.
**Learning:** Even if the login page is rate limited, secondary authentication flows like password reset can be abused for brute force attacks (trying to guess reset tokens) or email enumeration/spam (flooding user inboxes with reset emails).
**Prevention:** Always apply the `auth` rate limiting profile (or a similarly strict one) to *all* authentication-related endpoints, including password resets and account recovery flows.
## 2025-03-27 - [High] Missing Rate Limiting on Verification Email Sending Action
**Vulnerability:** The `sendVerificationEmail` server action in `src/app/admin/dashboard/profile/profileActions.ts` lacked rate limiting, allowing an attacker to abuse the endpoint to flood a user's inbox with verification emails and exhaust email sending quotas.
**Learning:** Any endpoint that triggers an external action like sending emails MUST be rate limited to prevent abuse, spam, and resource exhaustion.
**Prevention:** Always apply strict rate limiting (e.g. `RATE_LIMITS.auth`) to endpoints responsible for triggering email dispatches, leveraging `checkRateLimit` and extracting the client IP from the `headers()`.
## 2026-04-03 - [High] Stored XSS via Unvalidated Project URLs
**Vulnerability:** The `saveProject` server action in `src/app/admin/dashboard/projects/projectActions.ts` did not validate the `githubUrl` and `liveUrl` inputs before saving them to the database. These URLs were later rendered directly into the `href` attribute of anchor tags in `src/app/projects/[slug]/page.tsx`.
**Learning:** This allowed an attacker (e.g. an Editor/Admin) to input a payload like `javascript:alert(1)`, which would be saved and trigger a Stored XSS vulnerability when a visitor clicks the link on the project page. Server actions must strictly validate URL schemes to ensure they are safe.
**Prevention:** When processing URL inputs in server actions, always validate that the protocol is safe (`http:` or `https:`) using the `URL` constructor before storing them in the database to prevent Stored XSS vulnerabilities when rendered directly into `href` attributes.
## 2024-04-06 - Prevent IP Spoofing via Unvalidated Forwarded Headers in Authentication Endpoints
**Vulnerability:** Several authentication server actions (login, password reset request, password reset confirmation, verification email sending) were manually extracting client IP addresses using unverified `x-forwarded-for`, `x-real-ip`, and `cf-connecting-ip` HTTP headers.
**Learning:** Extracting IPs blindly from forwarded headers without validating the connection source (trusted proxy) enables trivial IP spoofing by attackers injecting these headers into their requests, thereby bypassing IP-based rate limiting configurations protecting sensitive authentication endpoints.
**Prevention:** Always rely on secure middleware/utility functions designed to resolve the IP address in proxy environments (such as a shared `getClientIP` method that validates against a list of trusted proxies) rather than manually splitting HTTP headers within route/action handlers. Ensure the extraction utility operates reliably when passed Next.js `Headers` objects from server actions via `getClientIPFromHeaders`.
## 2025-05-18 - [High] Stored XSS via Malicious SVG Uploads
**Vulnerability:** The application's file upload API (`src/app/api/upload/route.ts`) allowed users to upload `image/svg+xml` files. Uploaded files were saved to the public `/uploads/` directory without sanitization.
**Learning:** SVG files can contain embedded `<script>` tags. If a malicious SVG is uploaded and later accessed directly by a user in the same origin (e.g., `http://localhost:3000/uploads/malicious.svg`), the script will execute in the context of the application, leading to a Stored XSS vulnerability.
**Prevention:** Avoid accepting SVG uploads unless absolutely necessary. If required, strictly sanitize the SVG content on the server (e.g., using DOMPurify or a dedicated SVG sanitizer) before saving, or serve the uploads from a separate, sandboxed domain with appropriate Content-Security-Policy and Content-Disposition headers.
