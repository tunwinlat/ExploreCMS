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
import DynamicPostGrid from "@/components/DynamicPostGrid";

// Force dynamic rendering — the homepage reads from whichever DB is active
// and must always show the latest published posts
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Home() {
  const limit = 10
  const postDb = await getPostDb();
  
  // ⚡ Bolt: Parallelize independent DB queries and remove unused tags fetch
  // This reduces the critical path latency by fetching settings and posts concurrently
  const [rawPostsResult, settings] = await Promise.all([
    postDb.post.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
        author: true,
        tags: true,
        views: true
      } as any
    }),
    (prisma as any).siteSettings.findUnique({
      where: { id: 'singleton' }
    })
  ]);

  const posts = rawPostsResult as any[];

  // Compute cursor logic exactly like the API
  let nextCursor: string | undefined = undefined;
  const renderPosts = [...posts]
  
  if (renderPosts.length > limit) {
    const nextItem = renderPosts.pop() 
    nextCursor = nextItem!.id
  }

  let navItems = []
  try {
    navItems = JSON.parse(settings?.navigationConfig || '[]')
  } catch(e) {
    navItems = [{ id: 'latest', type: 'latest', label: 'Latest' }, { id: 'featured', type: 'featured', label: 'Featured' }]
  }

  return (
    <div className="container main-content fade-in-up">
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
        <ThemeToggle />
      </div>
      <header style={{ marginBottom: "4rem", textAlign: "center", paddingTop: "2rem" }}>
        <h1 className="heading-xl">{settings?.headerTitle || "Explore. Create. Inspire."}</h1>
        <p style={{ fontSize: "1.25rem", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto 2rem", whiteSpace: "pre-wrap" }}>
          {settings?.headerDescription || "Welcome to my personal corner of the internet. Here I share technical deep-dives and pieces of my life story."}
        </p>
      </header>

      <main>
        <DynamicPostGrid 
          initialPosts={renderPosts.map((p: any) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            isFeatured: p.isFeatured,
            author: { username: p.author?.username || 'admin', firstName: p.author?.firstName || 'Admin' },
            createdAt: typeof p.createdAt === 'string' ? p.createdAt : p.createdAt?.toISOString() || new Date().toISOString(),
            tags: Array.isArray(p.tags) ? p.tags.map((t: any) => ({ name: t.name, slug: t.slug })) : [],
            views: Array.isArray(p.views) ? p.views : [],
            content: p.content
          }))} 
          navItems={navItems} 
          initialCursor={nextCursor} 
        />
      </main>

      <footer style={{ marginTop: '5rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        <p>© {new Date().getFullYear()} ExploreCMS. All rights reserved.</p>
      </footer>
      <ViewTracker />
    </div>
  );
}
