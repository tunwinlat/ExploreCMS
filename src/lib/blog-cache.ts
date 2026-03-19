/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db';

// Blog post data without heavy content field (for listings)
export interface BlogListingPost {
  id: string;
  title: string;
  slug: string;
  contentFormat: string;
  isFeatured: boolean;
  createdAt: Date;
  author: { username: string; firstName: string | null };
  tags: { name: string; slug: string }[];
  views: { totalViews: number } | null;
  translationGroupId: string | null;
}

// Check if a post is primary (not a translation)
function isPrimaryPost(post: { id: string; translationGroupId: string | null }): boolean {
  return !post.translationGroupId || post.translationGroupId === post.id;
}

/**
 * Fetch blog listing posts with minimal data (no content field)
 * This is cached for 60 seconds to reduce database load
 */
export const getCachedBlogListingPosts = unstable_cache(
  async (): Promise<BlogListingPost[]> => {
    // Single efficient query with minimal fields
    const posts = await prisma.post.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 100, // Reasonable limit for most blogs
      select: {
        id: true,
        title: true,
        slug: true,
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
          select: { totalViews: true }
        }
      }
    });
    
    return posts;
  },
  ['blog-listing-posts'],
  { revalidate: 60, tags: ['blog-posts'] }
);

/**
 * Get blog data organized for the blog page
 * Uses a single cached query instead of 3 separate heavy queries
 */
export const getBlogPageData = cache(async () => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  // Get all posts from cache (single query, no content field)
  const allPosts = await getCachedBlogListingPosts();
  
  // Filter primary posts (not translations)
  const primaryPosts = allPosts.filter(isPrimaryPost);
  
  // Get featured posts (up to 5)
  const featuredPosts = primaryPosts
    .filter(p => p.isFeatured)
    .slice(0, 5);
  
  // Fallback: if no featured, use latest 5
  const featuredFinal = featuredPosts.length > 0 
    ? featuredPosts 
    : primaryPosts.slice(0, 5);
  
  // Get trending posts (last 7 days, sorted by views)
  const trendingPosts = primaryPosts
    .filter(p => new Date(p.createdAt) >= sevenDaysAgo)
    .sort((a, b) => (b.views?.totalViews || 0) - (a.views?.totalViews || 0))
    .slice(0, 8);
  
  // Get latest posts (9 for initial display, plus 1 for cursor)
  const latestPosts = primaryPosts.slice(0, 10);
  
  // Determine next cursor
  let nextCursor: string | undefined;
  if (latestPosts.length > 9) {
    const nextItem = latestPosts.pop();
    nextCursor = nextItem!.id;
  }
  
  return {
    featuredPosts: featuredFinal,
    trendingPosts,
    latestPosts,
    nextCursor
  };
});

/**
 * Invalidate blog cache (call after post changes)
 */
export async function invalidateBlogCache() {
  const { revalidateTag } = await import('next/cache');
  revalidateTag('blog-posts', 'default');
}
