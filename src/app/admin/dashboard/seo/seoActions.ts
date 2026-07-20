/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { normalizeUrl } from '@/lib/urlUtils'

export interface SeoSettingsInput {
  seoSiteUrl: string
  seoDescription: string
  seoOgImageUrl: string
  seoTwitterHandle: string
  seoRobotsIndex: boolean
  seoGoogleVerification: string
  seoBingVerification: string
  seoLlmsTxtEnabled: boolean
}

export async function updateSeoSettings(input: SeoSettingsInput) {
  const payload = await verifySession()
  if (!payload || payload.role !== 'OWNER') {
    throw new Error('Unauthorized')
  }

  const trimOrNull = (value: string) => {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }

  // Site URL must be an absolute http(s) URL — it drives canonicals and the sitemap
  const rawSiteUrl = input.seoSiteUrl.trim()
  const seoSiteUrl = rawSiteUrl ? normalizeUrl(rawSiteUrl) : null
  if (rawSiteUrl && (!seoSiteUrl || !/^https?:\/\//.test(seoSiteUrl))) {
    return { error: 'Site URL must be a valid absolute URL, e.g. https://example.com' }
  }

  // Share image may be absolute (CDN) or a site-relative path (/uploads/...)
  const rawOgImage = input.seoOgImageUrl.trim()
  const seoOgImageUrl = rawOgImage ? normalizeUrl(rawOgImage) : null
  if (rawOgImage && !seoOgImageUrl) {
    return { error: 'Share image must be a valid http(s) URL or a site-relative path' }
  }

  const data = {
    seoSiteUrl,
    seoDescription: trimOrNull(input.seoDescription),
    seoOgImageUrl,
    seoTwitterHandle: trimOrNull(input.seoTwitterHandle),
    seoRobotsIndex: input.seoRobotsIndex,
    seoGoogleVerification: trimOrNull(input.seoGoogleVerification),
    seoBingVerification: trimOrNull(input.seoBingVerification),
    seoLlmsTxtEnabled: input.seoLlmsTxtEnabled,
  }

  try {
    await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      update: data,
      create: { id: 'singleton', ...data },
    })

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to update SEO settings' }
  }
}
