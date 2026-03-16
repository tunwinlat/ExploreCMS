# Security Guide

This document outlines the security measures implemented in ExploreCMS and provides recommendations for secure deployment.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Encryption](#encryption)
- [Rate Limiting](#rate-limiting)
- [Authentication](#authentication)
- [API Security](#api-security)
- [Database Security](#database-security)
- [Content Security](#content-security)

## Environment Variables

### Required for Production

| Variable | Description | Security Notes |
|----------|-------------|----------------|
| `JWT_SECRET` | Secret key for JWT signing | **Required** - Must be at least 32 characters, cryptographically random |
| `ENCRYPTION_KEY` | Key for encrypting sensitive tokens | **Required** - Must be at least 32 characters, never commit to git |
| `DATABASE_URL` | Database connection URL | Use authenticated connections in production |

### Example `.env.local` for Production

```bash
# Required - Generate strong random secrets
JWT_SECRET=your-64-character-random-string-here-never-share-this
ENCRYPTION_KEY=another-32-character-random-key-for-encryption

# Database
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=your-turso-auth-token

# Bunny Storage (optional)
BUNNY_STORAGE_API_KEY=your-bunny-api-key

# Craft.do (optional)
CRAFT_API_TOKEN=your-craft-token

# GitHub (optional)
GITHUB_ACCESS_TOKEN=your-github-token
```

### Generating Secure Secrets

```bash
# For JWT_SECRET (use a long, random string)
openssl rand -base64 64

# For ENCRYPTION_KEY (32 characters)
openssl rand -base64 32
```

## Encryption

### What Gets Encrypted

Sensitive tokens stored in the database are automatically encrypted when `ENCRYPTION_KEY` is set:

- `bunnyToken` (Bunny.net database token)
- `bunnyStorageApiKey` (Bunny Storage API key)
- `craftApiToken` (Craft.do API token)
- `githubAccessToken` (GitHub personal access token)

### How It Works

1. Data is encrypted using AES-256-GCM before storage
2. Encrypted data is prefixed with `enc:` for identification
3. Legacy data without prefix is preserved but unencrypted
4. If `ENCRYPTION_KEY` is not set, data is stored with `plain:` prefix (not recommended for production)

### Migration to Encrypted Storage

1. Set `ENCRYPTION_KEY` in your environment
2. Re-save your integration settings to encrypt the tokens
3. Old plain text data will still work but should be re-saved

## Rate Limiting

Rate limiting is implemented on API endpoints to prevent abuse:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/upload` | 5 requests | 1 minute |
| `/api/search` | 30 requests | 1 minute |
| `/api/views` | 100 requests | 1 minute |
| Auth endpoints | 5 requests | 15 minutes |

### Rate Limit Headers

When rate limited, responses include:
- `429 Too Many Requests` status
- `X-RateLimit-Reset` header with Unix timestamp when limit resets

## Authentication

### JWT Sessions

- Tokens use HS256 algorithm
- 7-day expiration
- HTTP-only cookies
- Secure flag in production
- SameSite=Lax protection

### Cookie Security

```typescript
{
  httpOnly: true,      // Prevents XSS access
  secure: true,        // HTTPS only in production
  sameSite: 'lax',     // CSRF protection
  path: '/',           // Available site-wide
  expires: Date        // 7 days from issue
}
```

### Authorization Levels

| Role | Permissions |
|------|-------------|
| `OWNER` | Full access to all features |
| (none) | Can create posts, edit own posts only |

## API Security

### File Upload Security

- Maximum file size: 10MB
- Allowed types: JPEG, PNG, GIF, WebP, SVG, ICO
- MIME type validation against extension
- Random UUID filenames (no user-controlled names)
- Optional Bunny Storage with CDN

### Input Validation

All user inputs are validated:
- String length limits
- Type checking
- SQL injection protection via Prisma ORM
- XSS protection via sanitize-html

### API Endpoints

| Endpoint | Auth Required | Rate Limited |
|----------|---------------|--------------|
| `/api/upload` | ✅ Yes | ✅ Yes |
| `/api/craft/*` | ✅ Owner only | ✅ Manual sync only |
| `/api/search` | ❌ No | ✅ Yes |
| `/api/views` | ❌ No | ✅ Yes |
| `/api/posts` | ❌ No | ❌ No |

## Database Security

### Connection Security

- Use TLS for all database connections
- Auth tokens stored securely (encrypted at rest)
- Connection pooling managed by Prisma

### Schema Security

- No raw SQL queries (Prisma ORM)
- Prepared statements for all queries
- Field-level validation

## Content Security

### HTML Sanitization

All user-generated HTML is sanitized using `sanitize-html`:

**Allowed Tags:**
- Standard formatting: `h1`-`h6`, `p`, `br`, `strong`, `em`, `code`, etc.
- Media: `img`, `iframe` (YouTube only), `figure`
- Layout: `div`, `section`, `table`, `ul`, `ol`, `li`

**Not Allowed:**
- `<script>` tags
- Event handlers (`onclick`, `onload`, etc.)
- `javascript:` URLs
- Data URLs for images (except SVG)

### Markdown Processing

- Converted to HTML via `marked` library
- Then sanitized through same pipeline
- Emoji support enabled

## Security Checklist for Production

- [ ] Set strong `JWT_SECRET` (min 32 chars, random)
- [ ] Set `ENCRYPTION_KEY` for token encryption
- [ ] Use HTTPS only
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS if needed
- [ ] Enable database authentication
- [ ] Regular dependency updates
- [ ] Review access logs regularly
- [ ] Backup database regularly

## Reporting Security Issues

If you discover a security vulnerability, please:
1. Do not create a public issue
2. Email the maintainer directly
3. Allow time for a fix before disclosure

## Security Updates

This project uses automated dependency updates. Critical security patches are applied as soon as available.
