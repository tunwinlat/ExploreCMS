/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/db'
import { getExcerpt, getFirstImage } from '@/lib/renderContent'

const getCachedPost = unstable_cache(
  async (slug: string) => {
    if (!process.env.DATABASE_URL) return null

    const post = await prisma.post.findFirst({
      where: { slug, published: true },
      include: {
        author: true,
        tags: true,
      },
    })

    if (!post) return null

    return {
      ...post,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    }
  },
  ['post-detail'],
  { revalidate: 60, tags: ['blog-posts'] }
)

/** Cross-request cached post lookup, with Date values restored for SEO helpers. */
export const getPost = cache(async (slug: string) => {
  const post = await getCachedPost(slug)
  if (!post) return null

  return {
    ...post,
    createdAt: new Date(post.createdAt),
    updatedAt: new Date(post.updatedAt),
  }
})

const getCachedTranslations = unstable_cache(
  async (translationGroupId: string | null, currentSlug: string) => {
    if (!process.env.DATABASE_URL || !translationGroupId) return []

    return prisma.post.findMany({
      where: {
        translationGroupId,
        published: true,
        slug: { not: currentSlug },
      },
      select: { language: true, slug: true },
    })
  },
  ['post-translations'],
  { revalidate: 60, tags: ['blog-posts'] }
)

export const getTranslations = cache(getCachedTranslations)

const getCachedRelatedPosts = unstable_cache(
  async (
    currentPostId: string,
    tagIds: string[],
    translationGroupId: string | null,
    limit: number
  ) => {
    if (!process.env.DATABASE_URL) return []

    const translationGroupFilter = translationGroupId
      ? {
          OR: [
            { translationGroupId: null },
            { translationGroupId: { not: translationGroupId } },
          ],
        }
      : {}

    const include = {
      author: { select: { username: true, firstName: true } },
      tags: { select: { name: true, slug: true } },
    } as const

    const matches = await prisma.post.findMany({
      where: {
        published: true,
        id: { not: currentPostId },
        ...translationGroupFilter,
        tags: tagIds.length > 0 ? { some: { id: { in: tagIds } } } : undefined,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include,
    })

    const fallback = matches.length < limit
      ? await prisma.post.findMany({
          where: {
            published: true,
            id: { notIn: [currentPostId, ...matches.map((post) => post.id)] },
            ...translationGroupFilter,
          },
          take: limit - matches.length,
          orderBy: { createdAt: 'desc' },
          include,
        })
      : []

    return [...matches, ...fallback].slice(0, limit).map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      createdAt: post.createdAt.toISOString(),
      excerpt: getExcerpt(post.content, post.contentFormat, 120),
      coverImage: getFirstImage(post.content, post.contentFormat),
      author: post.author,
      tags: post.tags,
    }))
  },
  ['related-posts'],
  { revalidate: 60, tags: ['blog-posts'] }
)

export const getRelatedPosts = cache(getCachedRelatedPosts)

export type RelatedPost = Awaited<ReturnType<typeof getRelatedPosts>>[number]
