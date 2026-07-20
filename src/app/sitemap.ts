/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/db'
import { getSettings } from '@/lib/settings-cache'
import { parseComponentConfig } from '@/lib/components-config'
import { getSiteUrl } from '@/lib/seo'

/**
 * Dynamic sitemap served at /sitemap.xml.
 * Requires the admin to configure the site URL (Admin → SEO) — without an
 * absolute base URL a sitemap is meaningless, so we return an empty list.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSettings()
  const siteUrl = getSiteUrl(settings)
  if (!siteUrl) return []

  const { enabledComponents } = parseComponentConfig(settings)

  const [posts, projects, albums] = await Promise.all([
    prisma.post.findMany({
      where: { published: true, seoNoIndex: false },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
    enabledComponents.includes('projects')
      ? prisma.project.findMany({
          where: { published: true },
          select: { slug: true, updatedAt: true },
        })
      : Promise.resolve([]),
    enabledComponents.includes('photos')
      ? prisma.photoAlbum.findMany({
          where: { published: true },
          select: { slug: true, updatedAt: true },
        })
      : Promise.resolve([]),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: 'daily', priority: 1.0 },
  ]
  if (enabledComponents.includes('blog')) {
    staticRoutes.push({
      url: `${siteUrl}/blog`,
      changeFrequency: 'daily',
      priority: 0.8,
    })
  }
  if (enabledComponents.includes('projects')) {
    staticRoutes.push({
      url: `${siteUrl}/projects`,
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }
  if (enabledComponents.includes('photos')) {
    staticRoutes.push({
      url: `${siteUrl}/photos`,
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }

  return [
    ...staticRoutes,
    ...posts.map((post): MetadataRoute.Sitemap[number] => ({
      url: `${siteUrl}/post/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    })),
    ...projects.map((project): MetadataRoute.Sitemap[number] => ({
      url: `${siteUrl}/projects/${project.slug}`,
      lastModified: project.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.6,
    })),
    ...albums.map((album): MetadataRoute.Sitemap[number] => ({
      url: `${siteUrl}/photos/${album.slug}`,
      lastModified: album.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.6,
    })),
  ]
}
