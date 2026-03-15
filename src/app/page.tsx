/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { prisma } from "@/lib/db";
import { getPostDb } from "@/lib/bunnyDb";
import { ViewTracker } from "@/components/ViewTracker";
import { PopupToast } from "@/components/PopupToast";
import { SiteHeader } from "@/components/SiteHeader";
import { BlogContent } from "@/components/blog/BlogContent";
import { parseComponentConfig, COMPONENTS } from "@/lib/components-config";
import { redirect } from "next/navigation";
import { after } from "next/server";

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getSettings() {
  try {
    return await (prisma as any).siteSettings.findUnique({ where: { id: 'singleton' } });
  } catch { return null; }
}

async function getPopupConfig() {
  try {
    return await prisma.popupConfig.findUnique({ where: { id: 'singleton' } });
  } catch { return null; }
}

async function getBlogData() {
  try {
    const postDb = await getPostDb();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const limit = 9;

    const [featured, trending, latestRaw] = await Promise.all([
      postDb.post.findMany({
        where: { published: true, isFeatured: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { username: true, firstName: true } }, tags: true, views: true },
      }),
      postDb.post.findMany({
        where: { published: true, createdAt: { gte: sevenDaysAgo } },
        take: 8,
        orderBy: { views: { totalViews: 'desc' } },
        include: { author: { select: { username: true, firstName: true } }, tags: true, views: true },
      }),
      postDb.post.findMany({
        where: { published: true },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        include: { author: true, tags: true, views: true },
      }),
    ]);

    const featuredFinal = featured.length > 0 ? featured : await postDb.post.findMany({
      where: { published: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { username: true, firstName: true } }, tags: true, views: true },
    });

    let nextCursor: string | undefined;
    const latestPosts = [...latestRaw];
    if (latestPosts.length > limit) {
      const nextItem = latestPosts.pop();
      nextCursor = nextItem!.id;
    }

    return { featuredPosts: featuredFinal, trendingPosts: trending, latestPosts, nextCursor };
  } catch {
    return { featuredPosts: [], trendingPosts: [], latestPosts: [], nextCursor: undefined };
  }
}

function normalizePosts(posts: any[]) {
  return posts.map((p: any) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    content: p.content,
    isFeatured: p.isFeatured,
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : p.createdAt?.toISOString() || new Date().toISOString(),
    author: { username: p.author?.username || 'admin', firstName: p.author?.firstName || null },
    tags: Array.isArray(p.tags) ? p.tags.map((t: any) => ({ name: t.name, slug: t.slug })) : [],
    views: Array.isArray(p.views) ? p.views : p.views ? [p.views] : [],
  }));
}

export default async function Home() {
  const [settings, popupConfig] = await Promise.all([getSettings(), getPopupConfig()]);

  const componentConfig = parseComponentConfig(settings);
  const { enabledComponents, defaultComponent } = componentConfig;
  const enabledMeta = COMPONENTS.filter(c => enabledComponents.includes(c.id));

  // If default component is not blog, redirect to its canonical path
  if (defaultComponent !== 'blog') {
    redirect(defaultComponent === 'projects' ? '/projects' : '/photos');
  }

  // Blog is default — render blog content
  const { featuredPosts, trendingPosts, latestPosts, nextCursor } = await getBlogData();

  // Trigger Craft sync in the background after the response is sent
  after(async () => {
    try {
      const { runCraftSync } = await import("@/lib/craftSync");
      await runCraftSync();
    } catch {
      // Non-critical: sync failures should not affect the page
    }
  });

  let navItems: any[] = [];
  try {
    navItems = JSON.parse(settings?.navigationConfig || '[]');
  } catch {
    navItems = [{ id: 'latest', type: 'latest', label: 'Latest' }, { id: 'featured', type: 'featured', label: 'Featured' }];
  }

  return (
    <div className="main-content fade-in-up">
      <SiteHeader
        title={settings?.title || 'ExploreCMS'}
        enabledComponents={enabledMeta}
        defaultComponent={defaultComponent}
      />

      {/* Hero Section */}
      <div className="container" style={{ marginBottom: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 2rem' }}>
          <h1 className="heading-xl">{settings?.headerTitle || "Explore. Create. Inspire."}</h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {settings?.headerDescription || "Welcome to my personal corner of the internet."}
          </p>
        </div>
      </div>

      <div className="container">
        <BlogContent
          featuredPosts={normalizePosts(featuredPosts)}
          trendingPosts={normalizePosts(trendingPosts)}
          latestPosts={normalizePosts(latestPosts)}
          nextCursor={nextCursor}
          navItems={navItems}
          sidebarAbout={settings?.sidebarAbout}
        />
      </div>

      <footer className="container" style={{
        marginTop: '5rem',
        borderTop: '1px solid var(--border-color)',
        paddingTop: '2rem',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        fontSize: '0.9rem',
      }}>
        <p>© {new Date().getFullYear()} {settings?.footerText || `${settings?.title || 'ExploreCMS'}. All rights reserved.`}</p>
      </footer>

      {popupConfig?.enabled && popupConfig.content && (
        <PopupToast
          title={popupConfig.title || ''}
          content={popupConfig.content}
          displayMode={popupConfig.displayMode || 'once'}
        />
      )}
      <ViewTracker />
    </div>
  );
}
