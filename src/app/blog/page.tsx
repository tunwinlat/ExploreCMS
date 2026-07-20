/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { BlogHome } from "@/components/blog/BlogHome";
import { parseComponentConfig } from "@/lib/components-config";
import { notFound } from "next/navigation";
import { after } from "next/server";
import type { Metadata } from "next";
import { getBlogPageData } from "@/lib/blog-cache";
import { getSettings, getPopupConfig } from "@/lib/settings-cache";
import { buildPageMetadata } from "@/lib/seo";

// Use ISR with 60 second revalidation for better performance
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildPageMetadata({ title: 'Blog', path: '/blog' }, settings);
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[] }>
}) {
  const query = await searchParams;
  const initialTag = typeof query.tag === 'string' ? query.tag : undefined;

  // Fetch data in parallel with caching
  const [settings, popupConfig, blogData] = await Promise.all([
    getSettings(),
    getPopupConfig(),
    getBlogPageData()
  ]);

  const { enabledComponents } = parseComponentConfig(settings);

  // If blog is not enabled, 404
  if (!enabledComponents.includes('blog')) notFound();

  // Trigger Craft sync in the background after the response is sent
  after(async () => {
    try {
      const { runCraftSync } = await import("@/lib/craftSync");
      await runCraftSync();
    } catch {
      // Non-critical: sync failures should not affect the blog page
    }
  });

  return (
    <BlogHome
      settings={settings}
      popupConfig={popupConfig}
      blogData={blogData}
      initialTag={initialTag}
    />
  );
}
