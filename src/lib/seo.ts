/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Metadata } from 'next'
import { normalizeUrl } from './urlUtils'
import { getExcerpt, getFirstImage } from './renderContent'

/** SiteSettings fields consumed by the SEO helpers (structural, test-friendly). */
export interface SeoSiteConfig {
  title?: string | null
  headerDescription?: string | null
  seoSiteUrl?: string | null
  seoDescription?: string | null
  seoOgImageUrl?: string | null
  seoTwitterHandle?: string | null
  seoRobotsIndex?: boolean | null
  seoGoogleVerification?: string | null
  seoBingVerification?: string | null
}

/** Post fields consumed by the SEO helpers (structural, test-friendly). */
export interface SeoPostInput {
  title: string
  slug: string
  content: string
  contentFormat?: string | null
  createdAt: Date
  updatedAt: Date
  seoDescription?: string | null
  seoOgImageUrl?: string | null
  seoCanonicalUrl?: string | null
  seoNoIndex?: boolean | null
  tags?: { name: string }[]
  author?: { firstName?: string | null; lastName?: string | null; username?: string | null } | null
}

export const DEFAULT_SITE_TITLE = 'ExploreCMS'
export const DEFAULT_SITE_DESCRIPTION =
  'A modern, self-hosted minimalistic blogging platform.'

/**
 * Canonical base URL of the site (no trailing slash), or null when the admin
 * has not configured a valid one. Drives metadataBase, canonicals, sitemap
 * and og:url.
 */
export function getSiteUrl(settings?: SeoSiteConfig | null): string | null {
  const url = normalizeUrl(settings?.seoSiteUrl)
  if (!url || !/^https?:\/\//.test(url)) return null
  return url.replace(/\/+$/, '')
}

/**
 * Join a path against the site URL. Already-absolute URLs (e.g. Bunny CDN
 * image URLs) pass through untouched. Falls back to the raw path when no
 * site URL is configured.
 */
export function absoluteUrl(siteUrl: string | null, path?: string | null): string | null {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  if (!siteUrl) return path
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`
}

export interface OgImageCandidates {
  postImage?: string | null
  contentImage?: string | null
  siteImage?: string | null
  generatedPath: string
}

/**
 * Resolve the share image with an explicit precedence chain:
 * per-post override → first content image → site default → generated card.
 */
export function resolveOgImage(candidates: OgImageCandidates, siteUrl: string | null): string {
  const chosen =
    candidates.postImage ||
    candidates.contentImage ||
    candidates.siteImage ||
    candidates.generatedPath
  return absoluteUrl(siteUrl, chosen) ?? chosen
}

function normalizeTwitterHandle(handle?: string | null): string | undefined {
  const trimmed = handle?.trim()
  if (!trimmed) return undefined
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`
}

function getAuthorName(author?: SeoPostInput['author']): string | undefined {
  if (!author) return undefined
  const full = [author.firstName, author.lastName].filter(Boolean).join(' ').trim()
  return full || author.username || undefined
}

/**
 * Site-wide default metadata for the root layout. Child pages merge over this
 * via the Next.js Metadata API (title template, OG defaults, robots).
 */
export function buildBaseMetadata(settings?: SeoSiteConfig | null): Metadata {
  const title = settings?.title || DEFAULT_SITE_TITLE
  const description =
    settings?.seoDescription || settings?.headerDescription || DEFAULT_SITE_DESCRIPTION
  const siteUrl = getSiteUrl(settings)
  const image = resolveOgImage(
    { siteImage: settings?.seoOgImageUrl, generatedPath: '/opengraph-image' },
    siteUrl
  )
  const noIndex = settings?.seoRobotsIndex === false
  const twitterHandle = normalizeTwitterHandle(settings?.seoTwitterHandle)

  return {
    metadataBase: siteUrl ? new URL(siteUrl) : undefined,
    title: { default: title, template: `%s | ${title}` },
    description,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      siteName: title,
      title,
      description,
      url: siteUrl ?? undefined,
      images: [{ url: image }],
    },
    twitter: {
      card: 'summary_large_image',
      site: twitterHandle,
      title,
      description,
      images: [image],
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
    verification: {
      google: settings?.seoGoogleVerification || undefined,
      other: settings?.seoBingVerification
        ? { 'msvalidate.01': settings.seoBingVerification }
        : undefined,
    },
  }
}

/**
 * Metadata for an individual post page: article OG type, publish/modified
 * times, tags, canonical override and per-post noindex.
 */
export function buildPostMetadata(
  post: SeoPostInput,
  settings?: SeoSiteConfig | null
): Metadata {
  const siteUrl = getSiteUrl(settings)
  const description = post.seoDescription || getExcerpt(post.content, post.contentFormat, 160)
  const canonical = post.seoCanonicalUrl || `/post/${post.slug}`
  const image = resolveOgImage(
    {
      postImage: post.seoOgImageUrl,
      contentImage: getFirstImage(post.content, post.contentFormat),
      siteImage: settings?.seoOgImageUrl,
      generatedPath: `/post/${post.slug}/opengraph-image`,
    },
    siteUrl
  )
  const authorName = getAuthorName(post.author)
  const noIndex = post.seoNoIndex === true || settings?.seoRobotsIndex === false

  return {
    title: post.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: absoluteUrl(siteUrl, `/post/${post.slug}`) ?? undefined,
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: authorName ? [authorName] : undefined,
      tags: post.tags?.map((t) => t.name),
      images: [{ url: image }],
    },
    twitter: {
      card: 'summary_large_image',
      site: normalizeTwitterHandle(settings?.seoTwitterHandle),
      title: post.title,
      description,
      images: [image],
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
  }
}

export type JsonLd = Record<string, unknown>

export interface SeoPageInput {
  title: string
  description?: string | null
  /** Site-relative path, e.g. `/projects` — used for canonical and og:url. */
  path: string
  /** Page-specific share image (e.g. project/album cover). */
  image?: string | null
}

/**
 * Metadata for simple public pages (listings, project/album detail).
 * Title flows through the root layout's `%s | <site>` template.
 */
export function buildPageMetadata(
  page: SeoPageInput,
  settings?: SeoSiteConfig | null
): Metadata {
  const siteUrl = getSiteUrl(settings)
  const description =
    page.description ||
    settings?.seoDescription ||
    settings?.headerDescription ||
    DEFAULT_SITE_DESCRIPTION
  const image = resolveOgImage(
    {
      contentImage: page.image,
      siteImage: settings?.seoOgImageUrl,
      generatedPath: '/opengraph-image',
    },
    siteUrl
  )

  return {
    title: page.title,
    description,
    alternates: { canonical: page.path },
    openGraph: {
      title: page.title,
      description,
      url: absoluteUrl(siteUrl, page.path) ?? undefined,
      images: [{ url: image }],
    },
    twitter: {
      card: 'summary_large_image',
      site: normalizeTwitterHandle(settings?.seoTwitterHandle),
      title: page.title,
      description,
      images: [image],
    },
  }
}

/** schema.org WebSite for the home page. */
export function webSiteJsonLd(settings?: SeoSiteConfig | null): JsonLd {
  const siteUrl = getSiteUrl(settings)
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: settings?.title || DEFAULT_SITE_TITLE,
    description:
      settings?.seoDescription || settings?.headerDescription || DEFAULT_SITE_DESCRIPTION,
    url: siteUrl ?? undefined,
  }
}

/** schema.org BlogPosting for a post page. */
export function blogPostingJsonLd(
  post: SeoPostInput,
  settings?: SeoSiteConfig | null
): JsonLd {
  const siteUrl = getSiteUrl(settings)
  const siteTitle = settings?.title || DEFAULT_SITE_TITLE
  const description = post.seoDescription || getExcerpt(post.content, post.contentFormat, 160)
  const image = resolveOgImage(
    {
      postImage: post.seoOgImageUrl,
      contentImage: getFirstImage(post.content, post.contentFormat),
      siteImage: settings?.seoOgImageUrl,
      generatedPath: `/post/${post.slug}/opengraph-image`,
    },
    siteUrl
  )
  const authorName = getAuthorName(post.author)

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description,
    image: [image],
    datePublished: post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: authorName ? [{ '@type': 'Person', name: authorName }] : undefined,
    publisher: { '@type': 'Organization', name: siteTitle },
    keywords: post.tags?.map((t) => t.name).join(', ') || undefined,
    mainEntityOfPage: absoluteUrl(siteUrl, `/post/${post.slug}`) ?? undefined,
  }
}

/** schema.org BreadcrumbList. Items are `[name, path-or-url]` pairs in order. */
export function breadcrumbJsonLd(
  items: { name: string; path: string }[],
  settings?: SeoSiteConfig | null
): JsonLd {
  const siteUrl = getSiteUrl(settings)
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(siteUrl, item.path) ?? undefined,
    })),
  }
}
