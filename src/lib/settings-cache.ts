/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { cache } from 'react'
import { prisma } from '@/lib/db'

/**
 * Shared, per-request memoized getSettings.
 * React cache() deduplicates calls within a single render pass,
 * so layout.tsx and page.tsx both importing this will only hit
 * the database once per request.
 */
export const getSettings = cache(async () => {
  try {
    return await prisma.siteSettings.findUnique({ where: { id: 'singleton' } })
  } catch {
    return null
  }
})
