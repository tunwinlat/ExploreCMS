/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextResponse } from 'next/server'
import { getPostDb } from '@/lib/bunnyDb'

// Check if post content contains an image
function hasImage(content: string, contentFormat?: string): boolean {
  if (!content) return false
  // Check for markdown image syntax ![alt](url)
  if (/!\[.*?\]\(.*?\)/.test(content)) return true
  // Check for HTML img tags
  if (/<img\s+[^>]*src/i.test(content)) return true
  return false
}

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
    const translationGroupId = (currentPost as any).translationGroupId

    // Find related posts that share tags with the current post
    // Exclude: same post, same translation group (different languages), posts without images
    const relatedPosts = await postDb.post.findMany({
      where: {
        published: true,
        id: { not: currentPost.id }, // Exclude current post
        // Exclude posts from the same translation group (other languages of same post)
        ...(translationGroupId ? {
          NOT: { translationGroupId: translationGroupId }
        } : {}),
        tags: tagIds.length > 0 ? {
          some: {
            id: { in: tagIds }
          }
        } : undefined
      },
      take: limit * 3, // Fetch more to filter out posts without images
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

    // Filter out posts without images
    let posts = relatedPosts.filter(post => hasImage(post.content, (post as any).contentFormat))

    // If not enough related posts by tags, get recent posts with images
    if (posts.length < limit) {
      const additionalPosts = await postDb.post.findMany({
        where: {
          published: true,
          id: { not: currentPost.id },
          ...(translationGroupId ? {
            NOT: { translationGroupId: translationGroupId }
          } : {}),
          // Exclude already fetched posts
          ...(posts.length > 0 ? {
            id: { notIn: posts.map(p => p.id) }
          } : {})
        },
        take: limit * 2,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { username: true, firstName: true } },
          tags: true,
          views: true
        }
      })
      
      // Filter and add more posts with images
      const postsWithImages = additionalPosts.filter(post => 
        hasImage(post.content, (post as any).contentFormat)
      )
      posts = [...posts, ...postsWithImages]
    }

    // Limit to requested amount
    posts = posts.slice(0, limit)

    return NextResponse.json({ posts, currentSlug: slug })
  } catch (error) {
    console.error('Related Posts API Error:', error)
    return NextResponse.json({ error: 'Failed to load related posts' }, { status: 500 })
  }
}
