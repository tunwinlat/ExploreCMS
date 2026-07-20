/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { LeadStory } from '@/components/blog/LeadStory'
import { TrendingPosts } from '@/components/TrendingPosts'
import DynamicPostGrid from '@/components/DynamicPostGrid'

interface Post {
  id: string
  title: string
  slug: string
  content: string
  contentFormat?: string
  isFeatured: boolean
  createdAt: string
  excerpt?: string
  coverImage?: string | null
  author: { username: string; firstName: string | null }
  tags: { name: string; slug: string }[]
  views: any[]
}

interface BlogContentProps {
  featuredPosts: Post[]
  trendingPosts: Post[]
  latestPosts: Post[]
  nextCursor?: string
  navItems: any[]
  sidebarAbout?: string
  initialTag?: string
}

export function BlogContent({
  featuredPosts,
  trendingPosts,
  latestPosts,
  nextCursor,
  navItems,
  sidebarAbout,
  initialTag,
}: BlogContentProps) {
  const visibleNavItems = featuredPosts.length > 0
    ? navItems
    : navItems.filter(item => item.type !== 'featured')

  return (
    <div className="home-layout">
      {/* Left Column */}
      <main>
        {featuredPosts.length > 0 && (
          <LeadStory posts={featuredPosts} />
        )}

        <section className="latest-posts-section">
          <div className="section-header">
            <p className="eyebrow">Fresh from the blog</p>
            <h2 className="display-2">Latest Stories</h2>
            <hr className="rule" />
          </div>

          <DynamicPostGrid
            initialPosts={latestPosts}
            navItems={visibleNavItems}
            initialCursor={nextCursor}
            initialTag={initialTag}
          />
        </section>
      </main>

      {/* Right Column - Sidebar */}
      <aside className="sidebar">
        {trendingPosts.length > 0 && (
          <section className="sidebar-section">
            <TrendingPosts initialPosts={trendingPosts} />
          </section>
        )}

        <section className="sidebar-section sidebar-about">
          <p className="eyebrow">About</p>
          <p className="sidebar-about-text">
            {sidebarAbout || 'Discover articles on technology, creativity, and personal growth.'}
          </p>
        </section>
      </aside>
    </div>
  )
}
