/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * CI smoke-test seed.
 *
 * A brand-new database starts with default SiteSettings: only the `blog`
 * component enabled and no seoSiteUrl — which means /projects, /photos,
 * /profile and /feed.xml intentionally 404. For the fresh-boot smoke test
 * we want every public route exercised, so this script enables all
 * components and sets a canonical site URL on the SiteSettings singleton.
 *
 * Usage: DATABASE_URL=file:./ci.db node scripts/ci-smoke-seed.mjs
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

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const enabledComponents = JSON.stringify(['blog', 'projects', 'photos', 'profile'])

const client = createClient({ url: resolved })

const updated = await client.execute({
  sql: `UPDATE "SiteSettings"
        SET "enabledComponents" = ?, "defaultComponent" = 'blog', "seoSiteUrl" = ?
        WHERE "id" = 'singleton'`,
  args: [enabledComponents, siteUrl],
})

if (updated.rowsAffected === 0) {
  await client.execute({
    sql: `INSERT INTO "SiteSettings" ("id", "enabledComponents", "defaultComponent", "seoSiteUrl", "updatedAt")
          VALUES ('singleton', ?, 'blog', ?, datetime('now'))`,
    args: [enabledComponents, siteUrl],
  })
}

client.close()
console.log(`smoke seed ok — all components enabled, seoSiteUrl=${siteUrl}`)
