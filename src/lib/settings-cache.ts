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
  if (!process.env.DATABASE_URL) return null;
  try {
    return await prisma.siteSettings.findUnique({ where: { id: 'singleton' } })
  } catch {
    return null
  }
})

/**
 * Shared, per-request memoized getPopupConfig.
 * ⚡ Bolt: Deduplicates database queries for the singleton popup config
 * across the main frontend pages to prevent redundant round-trips.
 */
export const getPopupConfig = cache(async () => {
  if (!process.env.DATABASE_URL) return null;
  try {
    return await prisma.popupConfig.findUnique({ where: { id: 'singleton' } })
  } catch {
    return null
  }
})
