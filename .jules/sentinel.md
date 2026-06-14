## $(date +%Y-%m-%d) - Protocol-Relative URL XSS Misconceptions
**Vulnerability:** Attempted to block `//javascript:alert(1)` to prevent XSS.
**Learning:** Scheme-relative URLs starting with `//` parse the subsequent string as the hostname, not the protocol. They do not trigger JavaScript execution in modern browsers and do not constitute an XSS vector. Centralizing URL validation is good practice, but the rationale should be accurate.
**Prevention:** Avoid modifying URL validation logic specifically to block `//javascript:` based on the false assumption that it causes XSS.
