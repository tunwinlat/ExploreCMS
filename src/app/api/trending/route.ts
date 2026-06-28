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
  const parsedLimit = parseInt(searchParams.get('limit') || '6')
  const limit = Math.min(Number.isNaN(parsedLimit) ? 6 : parsedLimit, 10)
  const rawPeriod = searchParams.get('period') || '7d'
  const period = ['7d', '30d', 'all'].includes(rawPeriod) ? rawPeriod : '7d'

  try {
    const postDb = await getPostDb()
    
    // Calculate date filter based on period
    let dateFilter = {}
    if (period === '7d') {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      dateFilter = { createdAt: { gte: sevenDaysAgo } }
    } else if (period === '30d') {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      dateFilter = { createdAt: { gte: thirtyDaysAgo } }
    }

    // Get trending posts based on view count
    const posts = await postDb.post.findMany({
      where: {
        published: true,
        ...dateFilter
      },
      take: limit,
      orderBy: {
        views: {
          totalViews: 'desc'
        }
      },
      include: {
        author: {
          select: { username: true, firstName: true }
        },
        tags: true,
        views: true
      }
    })

    return NextResponse.json({ posts, period })
  } catch (error) {
    console.error('Trending API Error:', error)
    return NextResponse.json({ error: 'Failed to load trending posts' }, { status: 500 })
  }
}

