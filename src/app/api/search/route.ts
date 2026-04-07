/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextResponse } from 'next/server'
import { getPostDb } from '@/lib/bunnyDb'
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit'

export async function GET(request: Request) {
  // Rate limiting
  const clientIP = getClientIP(request)
  const rateLimit = checkRateLimit(clientIP, RATE_LIMITS.search)
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429, headers: { 'X-RateLimit-Reset': String(rateLimit.resetTime) } }
    )
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()
  const parsedLimit = parseInt(searchParams.get('limit') || '10')
  const limit = Math.min(Number.isNaN(parsedLimit) ? 10 : parsedLimit, 20)

  if (!query || query.length < 2 || query.length > 200) {
    return NextResponse.json({ posts: [] })
  }

  try {
    const postDb = await getPostDb()
    
    // Search in both title and content
    const posts = await postDb.post.findMany({
      where: {
        published: true,
        OR: [
          { title: { contains: query } },
          { content: { contains: query } }
        ]
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

    return NextResponse.json({ posts, query })
  } catch (error) {
    console.error('Search API Error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}

