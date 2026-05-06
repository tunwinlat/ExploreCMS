/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { FeaturedPostsCarousel } from '@/components/FeaturedPostsCarousel'
import { TrendingPosts } from '@/components/TrendingPosts'
import DynamicPostGrid from '@/components/DynamicPostGrid'

interface Post {
  id: string
  title: string
  slug: string
  content: string
  contentFormat: string
  isFeatured: boolean
  createdAt: string
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
}

export function BlogContent({
  featuredPosts,
  trendingPosts,
  latestPosts,
  nextCursor,
  navItems,
  sidebarAbout,
}: BlogContentProps) {
  return (
    <div className="home-layout">
      {/* Left Column */}
      <main>
        {featuredPosts.length > 0 && (
          <FeaturedPostsCarousel posts={featuredPosts} />
        )}

        <section className="latest-posts-section" style={{ marginTop: '3rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Latest Stories</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>Fresh from the blog</p>
            </div>
          </div>

          <DynamicPostGrid
            initialPosts={latestPosts}
            navItems={navItems}
            initialCursor={nextCursor}
          />
        </section>
      </main>

      {/* Right Column - Sidebar */}
      <aside className="sidebar">
        {trendingPosts.length > 0 && (
          <div className="glass" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <TrendingPosts initialPosts={trendingPosts} />
          </div>
        )}

        <div className="glass" style={{ padding: '1.25rem' }}>
          <h4 style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
            About
          </h4>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            margin: 0,
          }}>
            {sidebarAbout || 'Discover articles on technology, creativity, and personal growth.'}
          </p>
        </div>
      </aside>
    </div>
  )
}
