## 2026-05-30 - Enforce JWT_SECRET globally
**Vulnerability:** A hardcoded, easily guessable secret was used as a fallback for JWT signing if the environment variable was missing.
**Learning:** This approach poses a critical security risk because testing or local settings could accidentally slip into production, exposing the application to token forgery.
**Prevention:** Never fall back to hardcoded secrets; instead, throw an explicit error to enforce secure configuration in all environments.
