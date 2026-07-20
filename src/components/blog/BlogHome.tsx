/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { BlogContent } from "@/components/blog/BlogContent";
import { PopupToast } from "@/components/PopupToast";
import { ViewTracker } from "@/components/ViewTracker";
import { parseComponentConfig, COMPONENTS } from "@/lib/components-config";
import type { BlogListingPost } from "@/lib/blog-cache";

interface BlogHomeSettings {
  title?: string | null
  headerTitle?: string | null
  headerDescription?: string | null
  footerText?: string | null
  sidebarAbout?: string | null
  navigationConfig?: string | null
  enabledComponents?: string | null
  defaultComponent?: string | null
}

interface BlogHomePopup {
  enabled: boolean
  title?: string | null
  content?: string | null
  displayMode?: string | null
}

interface BlogHomeData {
  featuredPosts: BlogListingPost[]
  trendingPosts: BlogListingPost[]
  latestPosts: BlogListingPost[]
  nextCursor?: string
}

function normalizePosts(posts: BlogListingPost[]) {
  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    content: '', // Content not needed for listing
    contentFormat: p.contentFormat || 'html',
    isFeatured: p.isFeatured,
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : p.createdAt?.toISOString() || new Date().toISOString(),
    excerpt: p.excerpt ?? '',
    coverImage: p.coverImage ?? null,
    author: { username: p.author?.username || 'admin', firstName: p.author?.firstName || null },
    tags: Array.isArray(p.tags) ? p.tags.map((t) => ({ name: t.name, slug: t.slug })) : [],
    views: p.views ? [p.views] : [],
  }));
}

/**
 * Shared blog home render used by both `/` (when blog is the default
 * component) and `/blog`. The route files only differ in their
 * redirect/404 guard; everything else lives here.
 */
export function BlogHome({ settings, popupConfig, blogData, initialTag }: {
  settings: BlogHomeSettings | null
  popupConfig: BlogHomePopup | null
  blogData: BlogHomeData
  initialTag?: string
}) {
  const { enabledComponents, defaultComponent } = parseComponentConfig(settings);
  const enabledMeta = COMPONENTS.filter(c => enabledComponents.includes(c.id));
  const { featuredPosts, trendingPosts, latestPosts, nextCursor } = blogData;

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

      {/* Hero Section */}
      <PageHero
        title={settings?.headerTitle || "Explore. Create. Inspire."}
        description={settings?.headerDescription || "Welcome to my personal corner of the internet."}
      />

      <div className="container">
        <BlogContent
          featuredPosts={normalizePosts(featuredPosts)}
          trendingPosts={normalizePosts(trendingPosts)}
          latestPosts={normalizePosts(latestPosts)}
          nextCursor={nextCursor}
          navItems={navItems}
          sidebarAbout={settings?.sidebarAbout ?? undefined}
          initialTag={initialTag}
        />
      </div>

      <SiteFooter title={settings?.title} footerText={settings?.footerText} />

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
