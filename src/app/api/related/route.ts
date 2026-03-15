/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextResponse } from 'next/server'
import { getPostDb } from '@/lib/bunnyDb'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const parsedLimit = parseInt(searchParams.get('limit') || '4')
  const limit = Math.min(Number.isNaN(parsedLimit) ? 4 : parsedLimit, 6)

  if (!slug || slug.length > 300) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
  }

  try {
    const postDb = await getPostDb()
    
    // First, get the current post to find its tags
    const currentPost = await postDb.post.findUnique({
      where: { slug },
      include: { tags: true }
    })

    if (!currentPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const tagIds = currentPost.tags.map(tag => tag.id)

    // Find related posts that share tags with the current post
    const relatedPosts = await postDb.post.findMany({
      where: {
        published: true,
        id: { not: currentPost.id }, // Exclude current post
        tags: tagIds.length > 0 ? {
          some: {
            id: { in: tagIds }
          }
        } : undefined
      },
      take: limit,
      orderBy: [
        // Prioritize posts with more matching tags
        { createdAt: 'desc' }
      ],
      include: {
        author: {
          select: { username: true, firstName: true }
        },
        tags: true,
        views: true
      }
    })

    // If no related posts by tags, get recent posts
    let posts = relatedPosts
    if (posts.length === 0) {
      posts = await postDb.post.findMany({
        where: {
          published: true,
          id: { not: currentPost.id }
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { username: true, firstName: true } },
          tags: true,
          views: true
        }
      })
    }

    return NextResponse.json({ posts, currentSlug: slug })
  } catch (error) {
    console.error('Related Posts API Error:', error)
    return NextResponse.json({ error: 'Failed to load related posts' }, { status: 500 })
  }
}
