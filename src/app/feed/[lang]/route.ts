/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSettings } from '@/lib/settings-cache'
import { parseComponentConfig } from '@/lib/components-config'
import { getSiteUrl } from '@/lib/seo'
import { buildRssFeed, RSS_FEED_LIMIT } from '@/lib/rss'

export const revalidate = 300

const RSS_HEADERS = {
  'Content-Type': 'application/rss+xml; charset=utf-8',
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
} as const

const LANGUAGE_NAME: Record<string, string> = {
  en: 'English',
  my: 'Burmese',
}

/**
 * Per-language RSS 2.0 feed: /feed/en, /feed/my, …
 * (next.config rewrites /feed/:lang.xml → /feed/:lang so readers can use the
 * conventional .xml URLs.)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lang: string }> }
) {
  const { lang } = await params
  const language = lang.toLowerCase()
  if (!/^[a-z]{2}$/.test(language)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const settings = await getSettings()
  const siteUrl = getSiteUrl(settings)
  if (!siteUrl) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const { enabledComponents } = parseComponentConfig(settings)
  if (!enabledComponents.includes('blog')) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const posts = await prisma.post.findMany({
    where: { published: true, seoNoIndex: false, language },
    select: {
      title: true,
      slug: true,
      content: true,
      contentFormat: true,
      createdAt: true,
      updatedAt: true,
      language: true,
      seoDescription: true,
      seoOgImageUrl: true,
      tags: { select: { name: true } },
      author: {
        select: { firstName: true, lastName: true, username: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: RSS_FEED_LIMIT,
  })

  const feedUrl = `${siteUrl}/feed/${language}.xml`
  const xml = await buildRssFeed({
    settings,
    posts,
    feedUrl,
    language,
    titleSuffix: LANGUAGE_NAME[language] ? `(${LANGUAGE_NAME[language]})` : `(${language})`,
  })

  if (!xml) {
    return new NextResponse('Not Found', { status: 404 })
  }

  return new NextResponse(xml, { headers: RSS_HEADERS })
}
