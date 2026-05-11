/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ViewTracker } from "@/components/ViewTracker";
import { PopupToast } from "@/components/PopupToast";
import { SiteHeader } from "@/components/SiteHeader";
import { BlogContent } from "@/components/blog/BlogContent";
import { parseComponentConfig, COMPONENTS } from "@/lib/components-config";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { getBlogPageData, BlogListingPost } from "@/lib/blog-cache";
import { getSettings, getPopupConfig } from "@/lib/settings-cache";

// Use ISR with 60 second revalidation for better performance
export const revalidate = 60;

function normalizePosts(posts: BlogListingPost[]) {
  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    content: '', // Content not needed for listing
    contentFormat: p.contentFormat || 'html',
    isFeatured: p.isFeatured,
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : p.createdAt?.toISOString() || new Date().toISOString(),
    author: { username: p.author?.username || 'admin', firstName: p.author?.firstName || null },
    tags: Array.isArray(p.tags) ? p.tags.map((t) => ({ name: t.name, slug: t.slug })) : [],
    views: p.views ? [p.views] : [],
  }));
}

export default async function BlogPage() {
  // Fetch data in parallel with caching
  const [settings, popupConfig, blogData] = await Promise.all([
    getSettings(),
    getPopupConfig(),
    getBlogPageData()
  ]);

  const componentConfig = parseComponentConfig(settings);
  const { enabledComponents, defaultComponent } = componentConfig;

  // If blog is not enabled, 404
  if (!enabledComponents.includes('blog')) notFound();

  const enabledMeta = COMPONENTS.filter(c => enabledComponents.includes(c.id));
  const { featuredPosts, trendingPosts, latestPosts, nextCursor } = blogData;

  // Trigger Craft sync in the background after the response is sent
  after(async () => {
    try {
      const { runCraftSync } = await import("@/lib/craftSync");
      await runCraftSync();
    } catch {
      // Non-critical: sync failures should not affect the blog page
    }
  });

  let navItems: { id: string; type: string; label: string }[] = [];
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
