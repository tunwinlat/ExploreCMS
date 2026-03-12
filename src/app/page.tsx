/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Link from "next/link";
import { prisma } from "@/lib/db";
import { getPostDb } from "@/lib/bunnyDb";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ViewTracker } from "@/components/ViewTracker";
import { SearchBox } from "@/components/SearchBox";
import { FeaturedPostsCarousel } from "@/components/FeaturedPostsCarousel";
import { TrendingPosts } from "@/components/TrendingPosts";
import DynamicPostGrid from "@/components/DynamicPostGrid";

// Force dynamic rendering — the homepage reads from whichever DB is active
// and must always show the latest published posts
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getFeaturedPosts() {
  try {
    const postDb = await getPostDb();
    const posts = await postDb.post.findMany({
      where: {
        published: true,
        isFeatured: true
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { username: true, firstName: true } },
        tags: true,
        views: true
      }
    });
    
    // Do not fall back to recent posts; an empty array means no carousel should render
    // callers rely on `featuredPosts.length > 0` to decide whether to show the slider.
    return posts;
  } catch (error) {
    console.error('Error fetching featured posts:', error);
    return [];
  }
}

async function getTrendingPosts() {
  try {
    const postDb = await getPostDb();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const posts = await postDb.post.findMany({
      where: {
        published: true,
        createdAt: { gte: sevenDaysAgo }
      },
      take: 6,
      orderBy: {
        views: {
          totalViews: 'desc'
        }
      },
      include: {
        author: { select: { username: true, firstName: true } },
        tags: true,
        views: true
      }
    });
    
    return posts;
  } catch (error) {
    console.error('Error fetching trending posts:', error);
    return [];
  }
}

async function getLatestPosts() {
  try {
    const postDb = await getPostDb();
    const limit = 9;
    
    const posts = await postDb.post.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
        author: true,
        tags: true,
        views: true
      }
    });

    let nextCursor: string | undefined = undefined;
    const renderPosts = [...posts];
    
    if (renderPosts.length > limit) {
      const nextItem = renderPosts.pop();
      nextCursor = nextItem!.id;
    }

    return { posts: renderPosts, nextCursor };
  } catch (error) {
    console.error('Error fetching latest posts:', error);
    return { posts: [], nextCursor: undefined };
  }
}

async function getSettings() {
  try {
    const settings = await (prisma as any).siteSettings.findUnique({
      where: { id: 'singleton' }
    });
    return settings;
  } catch (error) {
    console.error('Error fetching settings:', error);
    return null;
  }
}

export default async function Home() {
  const [featuredPosts, trendingPosts, { posts: latestPosts, nextCursor }, settings] = await Promise.all([
    getFeaturedPosts(),
    getTrendingPosts(),
    getLatestPosts(),
    getSettings()
  ]);

  let navItems = [];
  try {
    navItems = JSON.parse(settings?.navigationConfig || '[]');
  } catch(e) {
    navItems = [{ id: 'latest', type: 'latest', label: 'Latest' }, { id: 'featured', type: 'featured', label: 'Featured' }];
  }

  return (
    <div className="container main-content fade-in-up">
      {/* Header Actions */}
      <div style={{ 
        position: 'absolute', 
        top: '1.5rem', 
        right: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <SearchBox />
        <ThemeToggle />
      </div>

      {/* Hero Header */}
      <header style={{ 
        marginBottom: '3rem', 
        textAlign: 'center', 
        paddingTop: '4rem'
      }}>
        <h1 className="heading-xl">{settings?.headerTitle || "Explore. Create. Inspire."}</h1>
        <p style={{ 
          fontSize: '1.25rem', 
          color: 'var(--text-secondary)', 
          maxWidth: '600px', 
          margin: '0 auto 2rem', 
          whiteSpace: 'pre-wrap' 
        }}>
          {settings?.headerDescription || "Welcome to my personal corner of the internet. Here I share technical deep-dives and pieces of my life story."}
        </p>
      </header>

      <main>
        {/* Featured Posts Carousel */}
        {featuredPosts.length > 0 && (
          <FeaturedPostsCarousel posts={featuredPosts.map((p: any) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            content: p.content,
            createdAt: typeof p.createdAt === 'string' ? p.createdAt : p.createdAt?.toISOString() || new Date().toISOString(),
            author: { 
              username: p.author?.username || 'admin', 
              firstName: p.author?.firstName || null 
            },
            tags: Array.isArray(p.tags) ? p.tags.map((t: any) => ({ name: t.name, slug: t.slug })) : [],
            views: Array.isArray(p.views) ? p.views : p.views ? [p.views] : []
          }))} />
        )}

        {/* Trending Posts Section */}
        {trendingPosts.length > 0 && (
          <TrendingPosts initialPosts={trendingPosts.map((p: any) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            content: p.content,
            createdAt: typeof p.createdAt === 'string' ? p.createdAt : p.createdAt?.toISOString() || new Date().toISOString(),
            author: { 
              username: p.author?.username || 'admin', 
              firstName: p.author?.firstName || null 
            },
            tags: Array.isArray(p.tags) ? p.tags.map((t: any) => ({ name: t.name, slug: t.slug })) : [],
            views: Array.isArray(p.views) ? p.views : p.views ? [p.views] : []
          }))} />
        )}

        {/* Latest Posts Section */}
        <section className="latest-posts-section" style={{ marginTop: '2rem' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            marginBottom: '1.5rem'
          }}>
            <div 
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Latest Stories</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>Fresh from the blog</p>
            </div>
          </div>

          <DynamicPostGrid 
            initialPosts={latestPosts.map((p: any) => ({
              id: p.id,
              title: p.title,
              slug: p.slug,
              isFeatured: p.isFeatured,
              author: { 
                username: p.author?.username || 'admin', 
                firstName: p.author?.firstName || 'Admin' 
              },
              createdAt: typeof p.createdAt === 'string' ? p.createdAt : p.createdAt?.toISOString() || new Date().toISOString(),
              tags: Array.isArray(p.tags) ? p.tags.map((t: any) => ({ name: t.name, slug: t.slug })) : [],
              views: Array.isArray(p.views) ? p.views : [],
              content: p.content
            }))} 
            navItems={navItems} 
            initialCursor={nextCursor} 
          />
        </section>
      </main>

      <footer style={{ 
        marginTop: '5rem', 
        borderTop: '1px solid var(--border-color)', 
        paddingTop: '2rem', 
        textAlign: 'center', 
        color: 'var(--text-secondary)', 
        fontSize: '0.9rem' 
      }}>
        <p>© {new Date().getFullYear()} {settings?.title || 'ExploreCMS'}. All rights reserved.</p>
      </footer>
      <ViewTracker />
    </div>
  );
}
