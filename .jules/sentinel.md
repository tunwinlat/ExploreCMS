## 2023-10-27 - [Critical] Hardcoded JWT Fallback Secret Removed
**Vulnerability:** A hardcoded `explore-cms-super-secret-key-that-should-be-changed` string was used as a fallback for the `JWT_SECRET` in both `src/lib/auth.ts` and `src/middleware.ts`.
**Learning:** This is a critical security risk because if a developer forgets to set the `JWT_SECRET` environment variable in production, the application will silently use the publicly known fallback secret to sign JWT sessions. This allows any attacker who knows the repository source code to trivially forge arbitrary admin (OWNER) session cookies and completely bypass authentication and authorization.
**Prevention:** Remove hardcoded fallback secrets completely. Instead, securely throw an explicit error (`throw new Error(...)`) at runtime if the critical secret is missing and the environment is set to `production`.

## 2024-03-13 - [High] XSS Vulnerability in SearchBox Component
**Vulnerability:** The `SearchBox` component used `dangerouslySetInnerHTML` combined with an insufficiently escaped `highlightMatch` function. The `query` parameter was not HTML-escaped before being interpolated into the `text.replace()` call.
**Learning:** Using `dangerouslySetInnerHTML` for simple text highlighting is dangerous because it makes XSS easy if user input isn't fully sanitized, and often developers miss escaping edge cases.
**Prevention:** Avoid `dangerouslySetInnerHTML` whenever possible. Implement highlighting by parsing the text into safe React Elements (`<span>`, `<mark>`) instead of HTML strings.
