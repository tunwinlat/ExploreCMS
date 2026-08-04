/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  absoluteUrl,
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_TITLE,
  getSiteUrl,
  type SeoSiteConfig,
} from '@/lib/seo'
import { getExcerpt, renderPostContent } from '@/lib/renderContent'

/** Default number of posts included in the public feed. */
export const RSS_FEED_LIMIT = 50

export interface RssPostInput {
  title: string
  slug: string
  content: string
  contentFormat?: string | null
  createdAt: Date
  updatedAt: Date
  language?: string | null
  seoDescription?: string | null
  seoOgImageUrl?: string | null
  tags?: { name: string }[]
  author?: {
    firstName?: string | null
    lastName?: string | null
    username?: string | null
  } | null
}

export interface RssChannelInput {
  settings?: SeoSiteConfig | null
  posts: RssPostInput[]
  /** Absolute self URL of this feed (e.g. https://example.com/feed.xml). */
  feedUrl: string
  /** Override build timestamp (tests). Defaults to now. */
  builtAt?: Date
}

/** Escape text for XML element/attribute content. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Rewrite root-relative `src`/`href` attributes in HTML so feed readers that
 * open the item off-site still load assets and links correctly.
 * Already-absolute http(s), mailto, data, and protocol-relative URLs pass through.
 */
export function absolutizeHtmlUrls(html: string, siteUrl: string): string {
  const base = siteUrl.replace(/\/+$/, '')
  return html.replace(
    /\b(src|href)=["']([^"']+)["']/gi,
    (match, attr: string, rawUrl: string) => {
      const url = rawUrl.trim()
      if (!url || url.startsWith('#') || url.startsWith('data:') || url.startsWith('mailto:')) {
        return match
      }
      if (/^https?:\/\//i.test(url) || url.startsWith('//')) {
        return match
      }
      if (url.startsWith('/')) {
        return `${attr}="${base}${url}"`
      }
      // Bare relative path (no leading slash)
      return `${attr}="${base}/${url}"`
    }
  )
}

function authorName(
  author?: RssPostInput['author']
): string | undefined {
  if (!author) return undefined
  const full = [author.firstName, author.lastName].filter(Boolean).join(' ').trim()
  return full || author.username || undefined
}

function rfc822(date: Date): string {
  return date.toUTCString()
}

/**
 * Build a complete RSS 2.0 document string for the given channel + posts.
 * Caller is responsible for only passing public/published posts.
 * Returns null when the site has no absolute base URL (feed would be useless).
 */
export async function buildRssFeed(input: RssChannelInput): Promise<string | null> {
  const siteUrl = getSiteUrl(input.settings)
  if (!siteUrl) return null

  const title = input.settings?.title || DEFAULT_SITE_TITLE
  const description =
    input.settings?.seoDescription ||
    input.settings?.headerDescription ||
    DEFAULT_SITE_DESCRIPTION
  const builtAt = input.builtAt ?? new Date()

  const itemXml: string[] = []
  for (const post of input.posts) {
    const link = absoluteUrl(siteUrl, `/post/${post.slug}`)
    if (!link || !/^https?:\/\//i.test(link)) continue

    const rawHtml = await renderPostContent(post.content, post.contentFormat)
    const html = absolutizeHtmlUrls(rawHtml, siteUrl)
    const descriptionText =
      post.seoDescription?.trim() ||
      getExcerpt(post.content, post.contentFormat, 280) ||
      post.title
    const creator = authorName(post.author)
    const categories = (post.tags ?? [])
      .map((t) => t.name.trim())
      .filter(Boolean)
      .map((name) => `      <category>${escapeXml(name)}</category>`)
      .join('\n')

    const guid = link
    const language = post.language?.trim() || undefined

    itemXml.push(
      [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(guid)}</guid>`,
        `      <pubDate>${rfc822(post.createdAt)}</pubDate>`,
        `      <description>${escapeXml(descriptionText)}</description>`,
        `      <content:encoded><![CDATA[${html.replace(/]]>/g, ']]]]><![CDATA[>')}]]></content:encoded>`,
        creator ? `      <dc:creator>${escapeXml(creator)}</dc:creator>` : null,
        language ? `      <dc:language>${escapeXml(language)}</dc:language>` : null,
        categories || null,
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  const channel = [
    '  <channel>',
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${escapeXml(siteUrl)}</link>`,
    `    <description>${escapeXml(description)}</description>`,
    '    <language>en</language>',
    `    <lastBuildDate>${rfc822(builtAt)}</lastBuildDate>`,
    '    <generator>ExploreCMS</generator>',
    `    <atom:link href="${escapeXml(input.feedUrl)}" rel="self" type="application/rss+xml" />`,
    ...itemXml,
    '  </channel>',
  ].join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">',
    channel,
    '</rss>',
    '',
  ].join('\n')
}
