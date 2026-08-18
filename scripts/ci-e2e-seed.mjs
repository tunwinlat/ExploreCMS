/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * CI Playwright E2E seed.
 *
 * Inserts a single deterministic published post (and its author) so the
 * end-to-end suite has something to assert against. Runs AFTER the smoke
 * seed (scripts/ci-smoke-seed.mjs), which enables all public components and
 * sets a canonical site URL.
 *
 * Uses raw SQL via @libsql/client (not Prisma) because Prisma's `@default`
 * values (cuid(), now(), etc.) are applied client-side, not in the DB — a
 * raw insert must supply every NOT NULL column explicitly. Inserts are
 * guarded with INSERT OR IGNORE on the primary keys so re-runs are idempotent.
 *
 * Usage: DATABASE_URL=file:./ci.db node scripts/ci-e2e-seed.mjs
 */

import { createClient } from '@libsql/client'
import { isAbsolute, join } from 'node:path'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

// Prisma resolves relative file: URLs against the schema directory (prisma/),
// not the process cwd — the seed must hit the same file the app uses.
let resolved = url
if (url.startsWith('file:')) {
  const p = url.slice('file:'.length)
  if (!isAbsolute(p)) resolved = `file:${join(process.cwd(), 'prisma', p)}`
}

const client = createClient({ url: resolved })

const AUTHOR_ID = 'ci-e2e-author'
const POST_ID = 'ci-e2e-post'
const POST_SLUG = 'ci-e2e-test-post'
const POST_TITLE = 'CI E2E Test Post'
const POST_CONTENT =
  '<p>This post is inserted by the Playwright end-to-end seed so the public ' +
  'blog has one deterministic, published article to assert against.</p>'

// Author (required by Post.authorId). INSERT OR IGNORE keeps re-runs idempotent.
await client.execute({
  sql: `INSERT OR IGNORE INTO "User"
        ("id", "username", "firstName", "lastName", "password", "role", "createdAt", "updatedAt", "emailVerified")
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)`,
  args: [AUTHOR_ID, 'ci-e2e-author', 'CI E2E', 'Author', 'ci-e2e-not-a-real-password', 'CONTRIBUTOR', 0],
})

await client.execute({
  sql: `INSERT OR IGNORE INTO "Post"
        ("id", "title", "slug", "content", "contentFormat", "published", "isFeatured",
         "createdAt", "updatedAt", "authorId", "language", "seoNoIndex")
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?, ?)`,
  args: [POST_ID, POST_TITLE, POST_SLUG, POST_CONTENT, 'html', 1, 0, AUTHOR_ID, 'en', 0],
})

client.close()
console.log(`e2e seed ok — published post "${POST_TITLE}" (/post/${POST_SLUG})`)
