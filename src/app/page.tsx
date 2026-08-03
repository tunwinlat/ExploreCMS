/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { BlogHome } from "@/components/blog/BlogHome";
import { parseComponentConfig } from "@/lib/components-config";
import { redirect } from "next/navigation";
import { getBlogPageData } from "@/lib/blog-cache";
import { getSettings, getPopupConfig } from "@/lib/settings-cache";

// Use ISR with 60 second revalidation for better performance
export const revalidate = 60;

export default async function Home() {
  // Fetch data in parallel with caching
  const [settings, popupConfig, blogData] = await Promise.all([
    getSettings(),
    getPopupConfig(),
    getBlogPageData()
  ]);

  const { defaultComponent } = parseComponentConfig(settings);

  // If default component is not blog, redirect to its canonical path
  if (defaultComponent !== 'blog') {
    redirect(
    defaultComponent === 'projects' ? '/projects'
    : defaultComponent === 'photos' ? '/photos'
    : '/profile'
  );
  }

  return (
    <BlogHome
      settings={settings}
      popupConfig={popupConfig}
      blogData={blogData}
    />
  );
}
