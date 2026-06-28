/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
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
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        contentFormat: true,
        isFeatured: true,
        createdAt: true,
        translationGroupId: true,
        author: {
          select: { username: true, firstName: true }
        },
        tags: {
          select: { name: true, slug: true }
        },
        views: {
          select: { uniqueViews: true }
        }
      }
    })

    const primaryPosts = allPosts.filter(isPrimaryPost)

    let nextCursor: typeof cursor | undefined = undefined;
    const posts = primaryPosts.slice(0, limit + 1)
    if (posts.length > limit) {
      const nextItem = posts.pop()
      nextCursor = nextItem!.id
    }

    // Process posts on the server to reduce payload size
    const processedPosts = posts.map(post => {
      const { content, ...rest } = post;
      return {
        ...rest,
        excerpt: content ? getExcerpt(content, post.contentFormat, 120) : '',
        coverImage: content ? getFirstImage(content, post.contentFormat) : null
      };
    });

    return NextResponse.json({
      posts: processedPosts,
      nextCursor
    })
  } catch (error) {
    console.error("Pagination API Error:", error)
    return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 })
  }
}

