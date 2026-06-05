export const runtime = 'edge';
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextResponse } from 'next/server'
import { getPostDb } from '@/lib/bunnyDb'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const parsedLimit = parseInt(searchParams.get('limit') || '5')
  const limit = Math.min(Number.isNaN(parsedLimit) ? 5 : parsedLimit, 10)

  try {
    const postDb = await getPostDb()
    
    // Get featured posts
    const posts = await postDb.post.findMany({
      where: {
        published: true,
        isFeatured: true
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { username: true, firstName: true }
        },
        tags: true,
        views: true
      }
    })

    // No fallback; return an empty array if nothing is explicitly featured
    return NextResponse.json({ posts })
  } catch (error) {
    console.error('Featured Posts API Error:', error)
    return NextResponse.json({ error: 'Failed to load featured posts' }, { status: 500 })
  }
}

