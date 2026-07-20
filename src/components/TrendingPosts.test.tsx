/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { TrendingPosts } from '@/components/TrendingPosts'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('TrendingPosts', () => {
  it('shows total views and refreshes the cached initial data', async () => {
    const post = {
      id: 'post-1',
      title: 'Popular Post',
      slug: 'popular-post',
      content: '',
      createdAt: new Date().toISOString(),
      author: { username: 'author', firstName: null },
      tags: [],
      views: [{ totalViews: 37, uniqueViews: 2 }],
    }
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        posts: [{ ...post, views: { totalViews: 42, uniqueViews: 3 } }],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<TrendingPosts initialPosts={[post]} />)

    expect(screen.getByText('37')).toBeTruthy()
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/trending?period=7d&limit=8',
        { cache: 'no-store' }
      )
    })
    // API returns `views` as a single object (to-one relation); the component
    // must normalize it and show the fresh view count
    await waitFor(() => {
      expect(screen.getByText('42')).toBeTruthy()
    })
  })
})
