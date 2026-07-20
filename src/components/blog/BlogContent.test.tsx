/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { BlogContent } from '@/components/blog/BlogContent'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const basePost = {
  id: 'post-1',
  title: 'Technology Post',
  slug: 'technology-post',
  content: '',
  isFeatured: false,
  createdAt: new Date().toISOString(),
  author: { username: 'author', firstName: null },
  tags: [{ name: 'Technology', slug: 'technology' }],
  views: [],
}

describe('BlogContent', () => {
  it('hides featured UI when there are no featured posts', () => {
    render(
      <BlogContent
        featuredPosts={[]}
        trendingPosts={[]}
        latestPosts={[]}
        navItems={[
          { id: 'latest', type: 'latest', label: 'Latest' },
          { id: 'featured', type: 'featured', label: 'Featured' },
        ]}
      />
    )

    expect(screen.getByRole('button', { name: 'Latest' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Featured' })).toBeNull()
  })

  it('loads posts matching the tag from the post link', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ posts: [basePost] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <BlogContent
        featuredPosts={[]}
        trendingPosts={[]}
        latestPosts={[
          {
            ...basePost,
            id: 'post-2',
            title: 'Travel Post',
            slug: 'travel-post',
            tags: [{ name: 'Travel', slug: 'travel' }],
          },
        ]}
        navItems={[]}
        initialTag="technology"
      />
    )

    expect(await screen.findByText('Technology Post')).toBeTruthy()
    expect(screen.queryByText('Travel Post')).toBeNull()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/posts?tag=technology',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it('renders the lead story with excerpt and a link to the post', () => {
    render(
      <BlogContent
        featuredPosts={[
          {
            ...basePost,
            id: 'featured-1',
            title: 'Featured Story',
            slug: 'featured-story',
            isFeatured: true,
            excerpt: 'An excerpt of the featured story.',
            coverImage: 'https://example.com/cover.jpg',
          },
        ]}
        trendingPosts={[]}
        latestPosts={[]}
        navItems={[]}
      />
    )

    expect(screen.getByRole('heading', { name: 'Featured Story' })).toBeTruthy()
    expect(screen.getByText('An excerpt of the featured story.')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Featured Story/ }).getAttribute('href')).toBe('/post/featured-story')
  })

  it('renders latest posts as rows with excerpts and an end-of-list marker', () => {
    render(
      <BlogContent
        featuredPosts={[]}
        trendingPosts={[]}
        latestPosts={[
          { ...basePost, excerpt: 'Latest excerpt text.' },
        ]}
        navItems={[]}
      />
    )

    expect(screen.getByText('Latest excerpt text.')).toBeTruthy()
    expect(screen.getByText(/reached the end/i)).toBeTruthy()
  })
})
