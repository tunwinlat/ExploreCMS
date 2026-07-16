# ExploreCMS - Agent Guide

This document provides essential information for AI coding agents working on ExploreCMS.

## Project Overview

ExploreCMS is a self-hosted minimalistic blogging platform built with Next.js App Router and Prisma + LibSQL. It features a glassmorphic UI design system, 41 dynamic themes, rich WYSIWYG editing via TipTap, and integrations with Craft.do, GitHub, Bunny Storage, and S3-compatible storage providers.

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.1.6 (App Router) |
| Language | TypeScript 5.x |
| Styling | CSS Variables + Custom CSS |
| Database | LibSQL (SQLite-compatible) via Prisma |
| Database Adapter | @prisma/adapter-libsql |
| Auth | JWT (jose library) + bcryptjs |
| Editor | TipTap (rich text editor) |
| Themes | CSS Variables + Google Fonts |
| Testing | Vitest + @testing-library/react |
| Linting | ESLint (flat config) |

## Project Structure

```
ExploreCMS/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (routes)/           # Public-facing routes
│   │   │   ├── page.tsx        # Home/Blog listing
│   │   │   ├── post/[slug]/    # Individual post pages
│   │   │   ├── projects/       # Projects showcase
│   │   │   └── photos/         # Photo albums
│   │   ├── admin/              # Admin dashboard
│   │   │   ├── login/          # Authentication
│   │   │   ├── dashboard/      # Main admin UI
│   │   │   │   ├── posts/      # Post management
│   │   │   │   ├── settings/   # Site settings
│   │   │   │   └── ...
│   │   │   └── setup/          # First-time setup wizard
│   │   ├── api/                # API routes
│   │   ├── layout.tsx          # Root layout
│   │   ├── globals.css         # Global styles
│   │   └── themes.css          # Theme definitions
│   ├── components/             # React components
│   │   ├── admin/              # Admin-specific components
│   │   ├── editor/             # TipTap editor components
│   │   └── ...
│   └── lib/                    # Utility libraries
│       ├── db.ts               # Prisma client setup
│       ├── auth.ts             # JWT authentication
│       ├── themes.ts           # Theme definitions
│       └── ...
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Database migrations
├── tests/                      # Test setup
├── public/                     # Static assets
└── package.json
```

## Build and Test Commands

```bash
# Development
npm run dev              # Start development server on http://localhost:3000

# Production Build
npm run build           # Generate Prisma client and build Next.js
npm run start           # Start production server

# Testing
npm run test            # Run Vitest tests

# Linting
npm run lint            # Run ESLint

# Database (Prisma)
npx prisma generate     # Generate Prisma client
npx prisma db push      # Push schema changes (development)
npx prisma migrate dev  # Create and apply migration
```

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | LibSQL connection string (e.g., `file:./dev.db` or `libsql://your-db.turso.io`) |
| `DATABASE_AUTH_TOKEN` | Auth token for hosted LibSQL (Turso, Bunny.net) |
| `JWT_SECRET` | Secret for JWT signing (min 32 chars, generate with `openssl rand -base64 32`) |
| `ENCRYPTION_KEY` | Key for encrypting sensitive tokens (AES-256-GCM) |

### Optional

| Variable | Description |
|----------|-------------|
| `CRAFT_SERVER_URL` | Craft.do Connect API URL |
| `CRAFT_API_TOKEN` | Craft.do Bearer token |
| `GITHUB_ACCESS_TOKEN` | GitHub Personal Access Token |

## Code Style Guidelines

### File Headers
All source files MUST include the Mozilla Public License 2.0 header:

```typescript
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
```

### TypeScript Conventions
- Use strict TypeScript (enabled in tsconfig.json)
- Prefer `interface` over `type` for object shapes
- Use explicit return types for exported functions
- Path alias `@/*` maps to `./src/*`

### Naming Conventions
- Components: PascalCase (e.g., `PostEditor.tsx`)
- Utilities: camelCase (e.g., `postActions.ts`)
- Database actions: Suffix with `Actions` (e.g., `settingsActions.ts`)
- Test files: Suffix with `.test.ts` or `.test.tsx`

### Component Patterns
- Server Components by default (no `'use client'`)
- Add `'use client'` only for:
  - Interactive components (buttons, forms)
  - Browser API usage (localStorage, clipboard)
  - React hooks (useState, useEffect)
- Co-locate related components with their page routes

### CSS Conventions
- Use CSS variables from `globals.css` for theming
- Theme-specific styles go in `themes.css`
- Glassmorphic effect: `className="glass"`
- Animation: `className="fade-in-up"`

## Testing Instructions

### Test Framework
- **Runner**: Vitest
- **DOM**: jsdom environment
- **Assertions**: @testing-library/jest-dom

### Test File Locations
Place tests alongside source files or in `__tests__` subdirectories:
```
src/lib/auth.ts           → src/lib/auth.test.ts
src/app/api/posts/route.ts → src/app/api/posts/route.test.ts
```

### Running Tests
```bash
# Run all tests
npm run test

# Run specific test file
npx vitest run src/lib/auth.test.ts

# Watch mode
npx vitest
```

### Test Patterns
- Mock database calls using Vitest mocks
- Mock `next/headers` and `next/cookies` for auth tests
- Use `@testing-library/react` for component tests

## Database Architecture

### Database Models

| Model | Purpose |
|-------|---------|
| `User` | Admin accounts (roles: OWNER, ADMIN, CONTRIBUTOR) |
| `Post` | Blog posts with rich content |
| `Tag` | Categorization for posts |
| `Project` | Portfolio projects (GitHub integration) |
| `PhotoAlbum` / `Photo` | Photo gallery management |
| `SiteSettings` | Global configuration (singleton) |
| `SiteAnalytics` / `PostView` | View tracking |
| `PopupConfig` | Announcement popup (singleton) |

### Key Patterns
- Singleton tables use `id: String @id @default("singleton")`
- Timestamps: `createdAt DateTime @default(now())` + `updatedAt DateTime @updatedAt`
- Relations always specify `onDelete` behavior
- Encrypted fields stored with `enc:` prefix in `SiteSettings`

### Database Connection
```typescript
// Use global Prisma instance (src/lib/db.ts)
import { prisma } from '@/lib/db'

// Use fresh client in serverless/production
import { getPrismaClient } from '@/lib/db'
const prisma = getPrismaClient()
```

### Production Auto-Migration (src/lib/db-init.ts)

**Production databases are migrated automatically — no manual steps required.**
On server startup, `ensureMigrations()` (invoked from `src/app/layout.tsx`) applies
idempotent raw-SQL migrations directly against hosted LibSQL databases
(`libsql://`, `https://`, `wss://` URLs). Local `file:` databases are skipped —
use `npx prisma db push` / `npx prisma migrate dev` in development instead.
Fresh installs additionally run `initializeDatabase()` from the `/setup` wizard.

**MANDATORY checklist when changing the database schema:**

1. Update `prisma/schema.prisma`
2. Create a Prisma migration in `prisma/migrations/` (`npx prisma migrate dev`) for local dev parity
3. Add equivalent idempotent SQL (e.g. `ALTER TABLE ... ADD COLUMN`, `CREATE TABLE`) to the `migrations` array in `runSchemaMigrations()` in `src/lib/db-init.ts` — "duplicate column" / "already exists" errors are ignored by design
4. **Update the fast-path probe** at the top of `runSchemaMigrations()` to check for your NEWEST table/column — otherwise existing deployments will silently skip all migrations
5. For new tables, also add the `CREATE TABLE` (+ indexes) to `initializeDatabase()` in the same file (used by the setup wizard on fresh installs)
6. Run `npx prisma generate` to regenerate the client

Skipping steps 3–5 means the feature works locally but breaks in production.
The regression tests in `src/lib/db-init.test.ts` verify this behavior.

## Security Considerations

### Authentication
- JWT sessions with 7-day expiration
- HTTP-only cookies with Secure flag in production
- bcryptjs for password hashing

### Authorization
- Middleware checks for admin routes
- Role-based access (OWNER > ADMIN > CONTRIBUTOR)
- Server Actions verify session before operations

### Input Validation
- All user inputs sanitized via `sanitize-html`
- File uploads: size limit (10MB), MIME type validation
- Rate limiting on API endpoints (src/lib/rateLimit.ts)

### Security Headers
Configured in `next.config.ts`:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict CSP for uploaded SVGs

### Encryption
Sensitive tokens encrypted with AES-256-GCM when `ENCRYPTION_KEY` is set:
- Bunny Storage API key
- Craft.do API token
- GitHub access token

## Key Conventions

### Server Actions
- Place in `actions.ts` or `*Actions.ts` files
- Always check authentication at start
- Return `{ success: boolean, error?: string, data?: T }` pattern
- Revalidate cache with `revalidatePath()` after mutations

### API Routes
- Use route handlers in `app/api/*/route.ts`
- Return NextResponse with proper status codes
- Implement rate limiting for public endpoints

### Caching Strategy
- ISR with `revalidate = 60` for public pages
- Data cached using custom cache utilities:
  - `getSettings()` → `src/lib/settings-cache.ts`
  - `getBlogPageData()` → `src/lib/blog-cache.ts`

### Error Handling
- Database errors: Log and return user-friendly messages
- Auth failures: Return `null` or redirect to `/admin/login`
- API errors: Return JSON with `{ error: string }`

### Theme System
- 41 themes defined in `src/lib/themes.ts`
- Each theme can specify Google Font URL
- CSS variables adapt to active theme
- Theme stored in `SiteSettings.theme`

## Development Workflow

1. **First Setup**: Run `npm install`, configure `.env.local`, run `npx prisma generate`
2. **Database**: For local dev, use `DATABASE_URL="file:./dev.db"`
3. **Start Dev**: `npm run dev`, visit `http://localhost:3000/setup`
4. **Create Owner**: Use setup wizard to create first admin account
5. **Writing**: Access admin at `/admin/dashboard`

## Deployment Notes

- **Vercel**: Recommended platform, requires external database (Turso/Bunny.net)
- **Database**: LibSQL-compatible required for production
- **Migrations**: Applied automatically at server startup (see "Production Auto-Migration") — no manual `prisma migrate deploy` needed
- **Storage**: Bunny Storage or S3-compatible required for image uploads on Vercel
- **Environment**: Must set `JWT_SECRET` and `ENCRYPTION_KEY` in production

## License

This project is licensed under the Mozilla Public License, v. 2.0 (MPL-2.0). All source files must include the MPL-2.0 header comment.
