/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
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
  it('shows the cached initial data without an extra request on mount', () => {
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
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<TrendingPosts initialPosts={[post]} />)

    expect(screen.getByText('37')).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
