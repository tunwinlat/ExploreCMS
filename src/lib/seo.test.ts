/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect } from 'vitest'
import {
  getSiteUrl,
  absoluteUrl,
  resolveOgImage,
  buildBaseMetadata,
  buildPostMetadata,
  buildPageMetadata,
  webSiteJsonLd,
  blogPostingJsonLd,
  breadcrumbJsonLd,
  DEFAULT_SITE_TITLE,
  DEFAULT_SITE_DESCRIPTION,
  type SeoPostInput,
} from './seo'

const baseSettings = {
  title: 'My Blog',
  headerDescription: 'Thoughts on software.',
  seoSiteUrl: 'https://blog.example.com',
  seoDescription: 'The best dev blog.',
  seoOgImageUrl: null,
  seoTwitterHandle: 'myblog',
  seoRobotsIndex: true,
  seoGoogleVerification: null,
  seoBingVerification: null,
}

const makePost = (overrides: Partial<SeoPostInput> = {}): SeoPostInput => ({
  title: 'Hello World',
  slug: 'hello-world',
  content: '<p>A warm greeting to the world.</p><img src="/uploads/cover.png" />',
  contentFormat: 'html',
  createdAt: new Date('2026-01-15T10:00:00Z'),
  updatedAt: new Date('2026-02-20T12:00:00Z'),
  tags: [{ name: 'greetings' }, { name: 'meta' }],
  author: { firstName: 'Ada', lastName: 'Lovelace', username: 'ada' },
  ...overrides,
})

describe('getSiteUrl', () => {
  it('returns null when not configured', () => {
    expect(getSiteUrl(null)).toBeNull()
    expect(getSiteUrl(undefined)).toBeNull()
    expect(getSiteUrl({})).toBeNull()
  })

  it('normalizes and strips trailing slashes', () => {
    expect(getSiteUrl({ seoSiteUrl: 'https://example.com/' })).toBe('https://example.com')
    expect(getSiteUrl({ seoSiteUrl: 'https://example.com///' })).toBe('https://example.com')
  })

  it('rejects non-http(s) and relative values', () => {
    expect(getSiteUrl({ seoSiteUrl: 'javascript:alert(1)' })).toBeNull()
    expect(getSiteUrl({ seoSiteUrl: 'example.com' })).toBeNull()
  })
})

describe('absoluteUrl', () => {
  it('passes absolute URLs through (CDN images)', () => {
    expect(absoluteUrl('https://example.com', 'https://cdn.example.com/a.png')).toBe(
      'https://cdn.example.com/a.png'
    )
  })

  it('joins relative paths against the site URL', () => {
    expect(absoluteUrl('https://example.com', '/uploads/a.png')).toBe(
      'https://example.com/uploads/a.png'
    )
  })

  it('falls back to the raw path without a site URL', () => {
    expect(absoluteUrl(null, '/uploads/a.png')).toBe('/uploads/a.png')
  })

  it('returns null for empty input', () => {
    expect(absoluteUrl('https://example.com', null)).toBeNull()
    expect(absoluteUrl('https://example.com', '')).toBeNull()
  })
})

describe('resolveOgImage', () => {
  const siteUrl = 'https://example.com'

  it('prefers per-post override over everything', () => {
    expect(
      resolveOgImage(
        { postImage: '/p.png', contentImage: '/c.png', siteImage: '/s.png', generatedPath: '/g' },
        siteUrl
      )
    ).toBe('https://example.com/p.png')
  })

  it('falls back content → site → generated', () => {
    expect(
      resolveOgImage({ contentImage: '/c.png', siteImage: '/s.png', generatedPath: '/g' }, siteUrl)
    ).toBe('https://example.com/c.png')
    expect(resolveOgImage({ siteImage: '/s.png', generatedPath: '/g' }, siteUrl)).toBe(
      'https://example.com/s.png'
    )
    expect(resolveOgImage({ generatedPath: '/g' }, siteUrl)).toBe('https://example.com/g')
  })
})

describe('buildBaseMetadata', () => {
  it('provides safe defaults without settings', () => {
    const meta = buildBaseMetadata(null)
    expect(meta.title).toEqual({
      default: DEFAULT_SITE_TITLE,
      template: `%s | ${DEFAULT_SITE_TITLE}`,
    })
    expect(meta.description).toBe(DEFAULT_SITE_DESCRIPTION)
    expect(meta.metadataBase).toBeUndefined()
  })

  it('builds full metadata from settings', () => {
    const meta = buildBaseMetadata(baseSettings)
    expect(meta.title).toEqual({ default: 'My Blog', template: '%s | My Blog' })
    expect(meta.description).toBe('The best dev blog.')
    expect(meta.metadataBase).toEqual(new URL('https://blog.example.com'))
    expect(meta.openGraph).toMatchObject({
      type: 'website',
      siteName: 'My Blog',
      url: 'https://blog.example.com',
    })
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image', site: '@myblog' })
  })

  it('falls back to headerDescription when no SEO description', () => {
    const meta = buildBaseMetadata({ ...baseSettings, seoDescription: null })
    expect(meta.description).toBe('Thoughts on software.')
  })

  it('uses the generated card when no uploaded share image', () => {
    const meta = buildBaseMetadata(baseSettings)
    expect(meta.openGraph?.images).toEqual([
      { url: 'https://blog.example.com/opengraph-image' },
    ])
  })

  it('emits noindex robots only when indexing is disabled', () => {
    expect(buildBaseMetadata(baseSettings).robots).toBeUndefined()
    expect(buildBaseMetadata({ ...baseSettings, seoRobotsIndex: false }).robots).toEqual({
      index: false,
      follow: false,
    })
  })

  it('includes verification tokens when configured', () => {
    const meta = buildBaseMetadata({
      ...baseSettings,
      seoGoogleVerification: 'goog-token',
      seoBingVerification: 'bing-token',
    })
    expect(meta.verification).toEqual({
      google: 'goog-token',
      other: { 'msvalidate.01': 'bing-token' },
    })
  })
})

describe('buildPostMetadata', () => {
  it('builds article metadata derived from the post', () => {
    const meta = buildPostMetadata(makePost(), baseSettings)
    expect(meta.title).toBe('Hello World')
    expect(meta.description).toBe('A warm greeting to the world.')
    expect(meta.alternates?.canonical).toBe('/post/hello-world')
    expect(meta.openGraph).toMatchObject({
      type: 'article',
      publishedTime: '2026-01-15T10:00:00.000Z',
      modifiedTime: '2026-02-20T12:00:00.000Z',
      authors: ['Ada Lovelace'],
      tags: ['greetings', 'meta'],
      url: 'https://blog.example.com/post/hello-world',
    })
    // First content image wins over the generated card
    expect(meta.openGraph?.images).toEqual([
      { url: 'https://blog.example.com/uploads/cover.png' },
    ])
    expect(meta.robots).toBeUndefined()
  })

  it('honors per-post overrides', () => {
    const meta = buildPostMetadata(
      makePost({
        seoDescription: 'Custom description.',
        seoOgImageUrl: 'https://cdn.example.com/custom.png',
        seoCanonicalUrl: 'https://original.example.com/post',
        seoNoIndex: true,
      }),
      baseSettings
    )
    expect(meta.description).toBe('Custom description.')
    expect(meta.alternates?.canonical).toBe('https://original.example.com/post')
    expect(meta.openGraph?.images).toEqual([{ url: 'https://cdn.example.com/custom.png' }])
    expect(meta.robots).toEqual({ index: false, follow: false })
  })

  it('noindexes when site indexing is disabled even without per-post flag', () => {
    const meta = buildPostMetadata(makePost(), { ...baseSettings, seoRobotsIndex: false })
    expect(meta.robots).toEqual({ index: false, follow: false })
  })

  it('falls back to username when author has no full name', () => {
    const meta = buildPostMetadata(
      makePost({ author: { firstName: null, lastName: null, username: 'ada' } }),
      baseSettings
    )
    expect(meta.openGraph).toMatchObject({ authors: ['ada'] })
  })
})

describe('buildPageMetadata', () => {
  it('builds listing metadata with canonical and page image', () => {
    const meta = buildPageMetadata(
      { title: 'Projects', path: '/projects', image: '/uploads/cover.png' },
      baseSettings
    )
    expect(meta.title).toBe('Projects')
    expect(meta.description).toBe('The best dev blog.')
    expect(meta.alternates?.canonical).toBe('/projects')
    expect(meta.openGraph).toMatchObject({ url: 'https://blog.example.com/projects' })
    expect(meta.openGraph?.images).toEqual([{ url: 'https://blog.example.com/uploads/cover.png' }])
  })

  it('prefers site default image over the generated card', () => {
    const meta = buildPageMetadata(
      { title: 'Blog', path: '/blog' },
      { ...baseSettings, seoOgImageUrl: '/uploads/site-og.png' }
    )
    expect(meta.openGraph?.images).toEqual([{ url: 'https://blog.example.com/uploads/site-og.png' }])
  })
})

describe('JSON-LD builders', () => {
  it('webSiteJsonLd describes the site', () => {
    expect(webSiteJsonLd(baseSettings)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'My Blog',
      description: 'The best dev blog.',
      url: 'https://blog.example.com',
    })
  })

  it('blogPostingJsonLd describes the post', () => {
    const jsonLd = blogPostingJsonLd(makePost(), baseSettings)
    expect(jsonLd).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: 'Hello World',
      datePublished: '2026-01-15T10:00:00.000Z',
      dateModified: '2026-02-20T12:00:00.000Z',
      author: [{ '@type': 'Person', name: 'Ada Lovelace' }],
      publisher: { '@type': 'Organization', name: 'My Blog' },
      keywords: 'greetings, meta',
      mainEntityOfPage: 'https://blog.example.com/post/hello-world',
    })
    expect(jsonLd.image).toEqual(['https://blog.example.com/uploads/cover.png'])
  })

  it('breadcrumbJsonLd numbers items in order', () => {
    const jsonLd = breadcrumbJsonLd(
      [
        { name: 'Home', path: '/' },
        { name: 'Blog', path: '/blog' },
        { name: 'Hello World', path: '/post/hello-world' },
      ],
      baseSettings
    )
    expect(jsonLd['@type']).toBe('BreadcrumbList')
    expect(jsonLd.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://blog.example.com/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://blog.example.com/blog' },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Hello World',
        item: 'https://blog.example.com/post/hello-world',
      },
    ])
  })
})
