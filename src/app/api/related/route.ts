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
    
    // First, get the current post to find its tags and translation group
    const currentPost = await postDb.post.findUnique({
      where: { slug },
      include: { tags: true }
    })

    if (!currentPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const tagIds = currentPost.tags.map(tag => tag.id)
    const translationGroupId = currentPost.translationGroupId
    const translationGroupFilter = translationGroupId ? {
      // A simple NOT filter also excludes NULL values in SQL. Include standalone
      // posts explicitly while filtering out translations of the current post.
      OR: [
        { translationGroupId: null },
        { translationGroupId: { not: translationGroupId } }
      ]
    } : {}

    // Find related posts that share tags with the current post.
    // Posts without images are valid recommendations; the card renders a placeholder for them.
    const relatedPosts = await postDb.post.findMany({
      where: {
        published: true,
        id: { not: currentPost.id }, // Exclude current post
        ...translationGroupFilter,
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

    let posts = relatedPosts

    // If there are not enough tag matches, fill the remaining slots with recent posts.
    if (posts.length < limit) {
      const additionalPosts = await postDb.post.findMany({
        where: {
          published: true,
          // Exclude the current post and the tag matches already selected above.
          id: { notIn: [currentPost.id, ...posts.map(post => post.id)] },
          ...translationGroupFilter
        },
        take: limit - posts.length,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { username: true, firstName: true } },
          tags: true,
          views: true
        }
      })
      posts = [...posts, ...additionalPosts]
    }

    // Limit to requested amount
    posts = posts.slice(0, limit)

    return NextResponse.json({ posts, currentSlug: slug })
  } catch (error) {
    console.error('Related Posts API Error:', error)
    return NextResponse.json({ error: 'Failed to load related posts' }, { status: 500 })
  }
}
