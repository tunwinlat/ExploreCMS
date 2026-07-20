/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSettings } from '@/lib/settings-cache'
import { parseComponentConfig } from '@/lib/components-config'
import { getSiteUrl, DEFAULT_SITE_TITLE, DEFAULT_SITE_DESCRIPTION } from '@/lib/seo'
import { getExcerpt } from '@/lib/renderContent'

/**
 * /llms.txt — a token-efficient Markdown map of the site for LLM crawlers
 * (llmstxt.org convention). Toggleable in Admin → SEO; requires a site URL.
 */
export async function GET() {
  const settings = await getSettings()
  const siteUrl = getSiteUrl(settings)

  if (!siteUrl || settings?.seoLlmsTxtEnabled === false) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const { enabledComponents } = parseComponentConfig(settings)
  const title = settings?.title || DEFAULT_SITE_TITLE
  const description =
    settings?.seoDescription || settings?.headerDescription || DEFAULT_SITE_DESCRIPTION

  const [posts, projects, albums] = await Promise.all([
    prisma.post.findMany({
      where: { published: true, seoNoIndex: false },
      select: { title: true, slug: true, content: true, contentFormat: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    enabledComponents.includes('projects')
      ? prisma.project.findMany({
          where: { published: true },
          select: { title: true, slug: true, tagline: true },
          orderBy: { order: 'asc' },
        })
      : Promise.resolve([]),
    enabledComponents.includes('photos')
      ? prisma.photoAlbum.findMany({
          where: { published: true },
          select: { title: true, slug: true, description: true },
          orderBy: { order: 'asc' },
        })
      : Promise.resolve([]),
  ])

  const lines: string[] = [`# ${title}`, '', `> ${description}`, '']

  if (posts.length > 0) {
    lines.push('## Blog', '')
    for (const post of posts) {
      const excerpt = getExcerpt(post.content, post.contentFormat, 120)
      lines.push(`- [${post.title}](${siteUrl}/post/${post.slug})${excerpt ? `: ${excerpt}` : ''}`)
    }
    lines.push('')
  }

  if (projects.length > 0) {
    lines.push('## Projects', '')
    for (const project of projects) {
      lines.push(
        `- [${project.title}](${siteUrl}/projects/${project.slug})${project.tagline ? `: ${project.tagline}` : ''}`
      )
    }
    lines.push('')
  }

  if (albums.length > 0) {
    lines.push('## Photos', '')
    for (const album of albums) {
      lines.push(
        `- [${album.title}](${siteUrl}/photos/${album.slug})${album.description ? `: ${album.description}` : ''}`
      )
    }
    lines.push('')
  }

  return new NextResponse(lines.join('\n'), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}
