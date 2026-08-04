/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { BlogHome } from "@/components/blog/BlogHome";
import { parseComponentConfig } from "@/lib/components-config";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBlogPageData } from "@/lib/blog-cache";
import { getSettings, getPopupConfig } from "@/lib/settings-cache";
import { prisma } from "@/lib/db";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";

// Use ISR with 60 second revalidation for better performance
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const meta = buildPageMetadata({ title: 'Blog', path: '/blog' }, settings);

  // RSS autodiscovery: main feed + one alternate per published language.
  const siteUrl = getSiteUrl(settings);
  if (siteUrl) {
    const title = settings?.title || 'ExploreCMS';
    const types: Record<string, { url: string; title: string }[]> = {
      'application/rss+xml': [{ url: `${siteUrl}/feed.xml`, title: `${title} RSS Feed` }],
    };
    try {
      const rows = await prisma.post.findMany({
        where: { published: true },
        select: { language: true },
        distinct: ['language'],
      });
      for (const row of rows) {
        const lang = (row.language || '').trim().toLowerCase();
        if (/^[a-z]{2}$/.test(lang)) {
          types['application/rss+xml'].push({
            url: `${siteUrl}/feed/${lang}.xml`,
            title: `${title} RSS Feed (${lang})`,
          });
        }
      }
    } catch {
      // DB not ready — main feed link is enough
    }
    meta.alternates = { ...meta.alternates, types };
  }
  return meta;
}

export default async function BlogPage() {
  // Fetch data in parallel with caching
  const [settings, popupConfig, blogData] = await Promise.all([
    getSettings(),
    getPopupConfig(),
    getBlogPageData()
  ]);

  const { enabledComponents } = parseComponentConfig(settings);

  // If blog is not enabled, 404
  if (!enabledComponents.includes('blog')) notFound();

  return (
    <BlogHome
      settings={settings}
      popupConfig={popupConfig}
      blogData={blogData}
    />
  );
}
