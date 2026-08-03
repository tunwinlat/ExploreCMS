/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/db'

/**
 * Profile (public biography) is a singleton like SiteSettings.
 * Cached across requests and invalidated by admin/API mutations via the
 * 'site-profile' tag.
 */
const getCachedProfile = unstable_cache(
  async () => {
    if (!process.env.DATABASE_URL) return null
    const profile = await prisma.profile.findUnique({ where: { id: 'singleton' } })
    return profile
      ? { ...profile, updatedAt: profile.updatedAt.toISOString() }
      : null
  },
  ['site-profile'],
  { revalidate: 300, tags: ['site-profile'] }
)

export const getProfile = cache(async () => {
  try {
    return await getCachedProfile()
  } catch {
    return null
  }
})
