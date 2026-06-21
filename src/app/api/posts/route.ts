/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextResponse } from 'next/server'
import { getPostDb } from '@/lib/bunnyDb'
import { isPrimaryPost } from '@/lib/translationUtils'
import { getExcerpt, getFirstImage } from '@/lib/renderContent'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')
  const limit = 9 // Fixed payload size

  try {
    const postDb = await getPostDb();
    // Fetch a generous buffer so we have enough primary posts after filtering out translations.
    // A post is "primary" if translationGroupId is null or equals its own id.
    const fetchLimit = (limit + 1) * 5
    const allPosts = await postDb.post.findMany({
      where: { published: true },
      take: fetchLimit,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { username: true, firstName: true }
        },
        tags: true,
        views: true
      }
    })

    const primaryPosts = allPosts.filter(isPrimaryPost)

    let nextCursor: typeof cursor | undefined = undefined;
    const posts = primaryPosts.slice(0, limit + 1)
    if (posts.length > limit) {
      const nextItem = posts.pop()
      nextCursor = nextItem!.id
    }

    // ⚡ Bolt: Pre-compute expensive fields server-side and remove heavy content payload
    const optimizedPosts = posts.map(post => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contentFormat = (post as any).contentFormat;
      return {
        ...post,
        excerpt: post.content ? getExcerpt(post.content, contentFormat, 120) : '',
        coverImage: post.content ? getFirstImage(post.content, contentFormat) : null,
        content: undefined, // Drop massive string payload to save bandwidth
      };
    });

    return NextResponse.json({
      posts: optimizedPosts,
      nextCursor
    })
  } catch (error) {
    console.error("Pagination API Error:", error)
    return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 })
  }
}

