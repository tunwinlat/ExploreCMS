/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/db'

/**
 * Persist settings across requests while React cache() also deduplicates calls
 * made by metadata, the root layout, and the page during one render pass.
 */
const getCachedSettings = unstable_cache(
  async () => {
    if (!process.env.DATABASE_URL) return null
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } })
    return settings
      ? { ...settings, updatedAt: settings.updatedAt.toISOString() }
      : null
  },
  ['site-settings'],
  { revalidate: 300, tags: ['site-settings'] }
)

export const getSettings = cache(async () => {
  try {
    return await getCachedSettings()
  } catch {
    return null
  }
})

/**
 * Popup configuration changes rarely and is invalidated by its admin actions.
 */
const getCachedPopupConfig = unstable_cache(
  async () => {
    if (!process.env.DATABASE_URL) return null
    const popup = await prisma.popupConfig.findUnique({ where: { id: 'singleton' } })
    return popup ? { ...popup, updatedAt: popup.updatedAt.toISOString() } : null
  },
  ['popup-config'],
  { revalidate: 300, tags: ['popup-config'] }
)

export const getPopupConfig = cache(async () => {
  try {
    return await getCachedPopupConfig()
  } catch {
    return null
  }
})
