/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect } from 'vitest'
import {
  absolutizeHtmlUrls,
  buildRssFeed,
  escapeXml,
  type RssPostInput,
} from './rss'

const settings = {
  title: 'My Blog',
  headerDescription: 'Thoughts on software.',
  seoSiteUrl: 'https://blog.example.com',
  seoDescription: 'The best dev blog.',
}

const makePost = (overrides: Partial<RssPostInput> = {}): RssPostInput => ({
  title: 'Hello & Welcome',
  slug: 'hello-world',
  content: '<p>A warm greeting.</p><img src="/uploads/cover.png" alt="cover" /><a href="/about">About</a>',
  contentFormat: 'html',
  createdAt: new Date('2026-01-15T10:00:00Z'),
  updatedAt: new Date('2026-02-20T12:00:00Z'),
  language: 'en',
  tags: [{ name: 'greetings' }],
  author: { firstName: 'Ada', lastName: 'Lovelace', username: 'ada' },
  ...overrides,
})

describe('escapeXml', () => {
  it('escapes the five XML special characters', () => {
    expect(escapeXml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&apos;')
  })
})

describe('absolutizeHtmlUrls', () => {
  it('rewrites root-relative src and href', () => {
    const html = '<img src="/a.png"><a href="/b">x</a>'
    expect(absolutizeHtmlUrls(html, 'https://blog.example.com')).toBe(
      '<img src="https://blog.example.com/a.png"><a href="https://blog.example.com/b">x</a>'
    )
  })

  it('leaves absolute, data, mailto, and hash URLs alone', () => {
    const html =
      '<img src="https://cdn.example.com/a.png"><a href="mailto:a@b.c">m</a><a href="#top">t</a><img src="data:image/png;base64,xx">'
    expect(absolutizeHtmlUrls(html, 'https://blog.example.com')).toBe(html)
  })
})

describe('buildRssFeed', () => {
  it('returns null without a site URL', async () => {
    await expect(
      buildRssFeed({
        settings: {},
        posts: [makePost()],
        feedUrl: 'https://blog.example.com/feed.xml',
      })
    ).resolves.toBeNull()
  })

  it('builds a valid RSS 2.0 document with absolute links and content', async () => {
    const xml = await buildRssFeed({
      settings,
      posts: [makePost()],
      feedUrl: 'https://blog.example.com/feed.xml',
      builtAt: new Date('2026-03-01T00:00:00Z'),
    })
    expect(xml).toBeTruthy()
    expect(xml!).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml!).toContain('<rss version="2.0"')
    expect(xml!).toContain('<title>My Blog</title>')
    expect(xml!).toContain('<description>The best dev blog.</description>')
    expect(xml!).toContain(
      '<atom:link href="https://blog.example.com/feed.xml" rel="self" type="application/rss+xml" />'
    )
    expect(xml!).toContain('<title>Hello &amp; Welcome</title>')
    expect(xml!).toContain('<link>https://blog.example.com/post/hello-world</link>')
    expect(xml!).toContain(
      '<guid isPermaLink="true">https://blog.example.com/post/hello-world</guid>'
    )
    expect(xml!).toContain('<dc:creator>Ada Lovelace</dc:creator>')
    expect(xml!).toContain('<category>greetings</category>')
    expect(xml!).toContain('src="https://blog.example.com/uploads/cover.png"')
    expect(xml!).toContain('href="https://blog.example.com/about"')
    expect(xml!).toContain('<content:encoded><![CDATA[')
    expect(xml!).not.toMatch(/item[^>]*>[\s\S]*src="\/uploads/)
  })

  it('renders markdown posts to sanitized HTML', async () => {
    const xml = await buildRssFeed({
      settings,
      posts: [
        makePost({
          title: 'MD Post',
          slug: 'md-post',
          content: '# Hi\n\n![x](/img.png)',
          contentFormat: 'markdown',
        }),
      ],
      feedUrl: 'https://blog.example.com/feed.xml',
    })
    expect(xml).toContain('<h1')
    expect(xml).toContain('src="https://blog.example.com/img.png"')
  })

  it('keeps content:encoded CDATA well-formed when raw HTML contains ]]>', async () => {
    const xml = await buildRssFeed({
      settings,
      posts: [makePost({ content: '<p>foo]]>bar</p>', contentFormat: 'html' })],
      feedUrl: 'https://blog.example.com/feed.xml',
    })
    expect(xml).toBeTruthy()
    // sanitize-html typically turns ]]> into ]]> (already safe inside CDATA).
    // If a terminator ever survived, buildRssFeed splits the CDATA section.
    expect(xml!).toMatch(/<content:encoded><!\[CDATA\[[\s\S]*\]\]><\/content:encoded>/)
    // Must not leave an unescaped ]]> that would close CDATA early before </content:encoded>
    const encoded = xml!.match(
      /<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/
    )?.[1]
    expect(encoded).toBeTruthy()
    expect(encoded!.includes(']]>')).toBe(false)
  })

  it('includes multilingual posts without deduping', async () => {
    const xml = await buildRssFeed({
      settings,
      posts: [
        makePost({ title: 'English', slug: 'en', language: 'en' }),
        makePost({ title: 'Burmese', slug: 'my', language: 'my' }),
      ],
      feedUrl: 'https://blog.example.com/feed.xml',
    })
    expect(xml).toContain('<title>English</title>')
    expect(xml).toContain('<title>Burmese</title>')
    expect(xml).toContain('<dc:language>my</dc:language>')
  })
})
