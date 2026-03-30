## 2024-05-19 - Stored XSS via External Link URLs
**Vulnerability:** The project creation/edit server action (`saveProject` in `projectActions.ts`) did not validate the URL scheme for `githubUrl` and `liveUrl` inputs. If an attacker provided a `javascript:` payload, it was saved to the database and executed when clicked on the frontend `<a>` tags.
**Learning:** Even fields implicitly understood as web URLs must be strictly validated on the server. Next.js does not sanitize the `href` attribute of native HTML `<a>` tags automatically.
**Prevention:** Always validate URL schemes before saving them to the database by using the `URL` constructor to enforce an allowlist of safe protocols (e.g., `['http:', 'https:'].includes(parsed.protocol)`).
