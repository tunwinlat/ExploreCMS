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
    const posts = await postDb.post.findMany({
      where: { published: true },
      take: limit + 1, // Fetch one extra to check if there's a next page
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

    let nextCursor: typeof cursor | undefined = undefined;
    if (posts.length > limit) {
      const nextItem = posts.pop() // Remove the extra item
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
