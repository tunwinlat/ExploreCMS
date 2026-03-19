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
