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
    
    // If no featured posts, return the most recent posts
    if (posts.length === 0) {
      return await postDb.post.findMany({
        where: { published: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { username: true, firstName: true } },
          tags: true,
          views: true
        }
      });
    }
    
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
      take: 8,
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
    <div className="main-content fade-in-up">
      {/* Header */}
      <header style={{ 
        borderBottom: '1px solid var(--border-color)',
        padding: '1rem 0',
        marginBottom: '2rem'
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Logo */}
          <Link href="/" style={{ 
            fontSize: '1.5rem', 
            fontWeight: 800,
            background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {settings?.title || 'ExploreCMS'}
          </Link>

          {/* Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <SearchBox />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container" style={{ marginBottom: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 2rem' }}>
          <h1 className="heading-xl">{settings?.headerTitle || "Explore. Create. Inspire."}</h1>
          <p style={{ 
            fontSize: '1.15rem', 
            color: 'var(--text-secondary)', 
            lineHeight: 1.7
          }}>
            {settings?.headerDescription || "Welcome to my personal corner of the internet. Here I share technical deep-dives and pieces of my life story."}
          </p>
        </div>
      </div>

      <div className="container">
        {/* Main 2-Column Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '2.5rem',
          alignItems: 'start'
        }} className="home-layout">
          {/* Left Column - Main Content */}
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

            {/* Latest Posts Section */}
            <section className="latest-posts-section" style={{ marginTop: '3rem' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                marginBottom: '1.5rem'
              }}>
                <div 
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Latest Stories</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>Fresh from the blog</p>
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

          {/* Right Column - Sidebar */}
          <aside style={{ position: 'sticky', top: '90px' }} className="sidebar">
            {/* Trending Posts */}
            <div className="glass" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
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
            </div>

            {/* About Card */}
            <div className="glass" style={{ padding: '1.25rem' }}>
              <h4 style={{ 
                fontSize: '0.9rem', 
                fontWeight: 600, 
                marginBottom: '0.75rem',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 16v-4"></path>
                  <path d="M12 8h.01"></path>
                </svg>
                About
              </h4>
              <p style={{ 
                fontSize: '0.85rem', 
                color: 'var(--text-secondary)', 
                lineHeight: 1.6,
                margin: 0
              }}>
                {settings?.sidebarAbout || 'Discover articles on technology, creativity, and personal growth. Use the search or browse by tags to find what interests you.'}
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <footer className="container" style={{ 
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
