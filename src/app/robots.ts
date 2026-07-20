/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { MetadataRoute } from 'next'
import { getSettings } from '@/lib/settings-cache'
import { getSiteUrl } from '@/lib/seo'

/**
 * Dynamic robots.txt served at /robots.txt.
 * When the admin disables indexing (Admin → SEO), every crawler is blocked.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettings()
  const siteUrl = getSiteUrl(settings)

  if (settings?.seoRobotsIndex === false) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'],
    },
    sitemap: siteUrl ? `${siteUrl}/sitemap.xml` : undefined,
  }
}
