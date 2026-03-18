/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getPostDb } from '@/lib/bunnyDb'

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

    const primaryPosts = allPosts.filter(
      (p: any) => !p.translationGroupId || p.translationGroupId === p.id
    )

    let nextCursor: typeof cursor | undefined = undefined;
    const posts = primaryPosts.slice(0, limit + 1)
    if (posts.length > limit) {
      const nextItem = posts.pop()
      nextCursor = nextItem!.id
    }

    return NextResponse.json({
      posts,
      nextCursor
    })
  } catch (error) {
    console.error("Pagination API Error:", error)
    return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 })
  }
}
