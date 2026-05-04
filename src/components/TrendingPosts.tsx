/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'

interface TrendingPost {
  id: string
  title: string
  slug: string
  content: string
  createdAt: string | Date
  author: { username: string; firstName: string | null }
  tags: { name: string; slug: string }[]
  views?: { totalViews?: number; uniqueViews?: number }[]
}

interface TrendingPostsProps {
  initialPosts?: TrendingPost[]
}

export function TrendingPosts({ initialPosts = [] }: TrendingPostsProps) {
  const [posts, setPosts] = useState<TrendingPost[]>(initialPosts)
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('7d')
  const [loading, setLoading] = useState(false)

  const fetchTrending = async (p: '7d' | '30d' | 'all') => {
    setPeriod(p)
    if (p === '7d' && initialPosts && initialPosts.length > 0) {
      setPosts(initialPosts)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/trending?period=${p}&limit=8`)
      const data = await res.json()
      if (data.posts) setPosts(data.posts)
    } catch (err) {
      console.error('Failed to fetch trending posts:', err)
    } finally {
      setLoading(false)
    }
  }

  if (posts.length === 0 && !loading) return null

  return (
    <nav aria-label="Trending posts">
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </svg>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
            Trending
          </span>
        </div>

        {/* Period tabs */}
        <div role="group" aria-label="Trending period" style={{ display: 'flex', gap: '0.15rem' }}>
          {(['7d', '30d', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => fetchTrending(p)}
              aria-pressed={period === p}
              style={{
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                border: 'none',
                background: period === p ? 'var(--accent-color)' : 'transparent',
                color: period === p ? 'white' : 'var(--text-secondary)',
                fontSize: '0.72rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {p === '7d' ? 'Week' : p === '30d' ? 'Month' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.5rem 0' }}>
          Loading...
        </div>
      ) : (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
          {posts.map((post, index) => (
            <li key={post.id}>
              <Link
                href={`/post/${post.slug}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.6rem 0.5rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'background 0.15s ease',
                  color: 'inherit'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-color-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Number */}
                <span style={{
                  minWidth: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: index < 3 ? 'var(--accent-color)' : 'var(--text-secondary)',
                  lineHeight: 1.5,
                  opacity: index < 3 ? 1 : 0.5
                }}>
                  {index + 1}
                </span>

                {/* Title + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    lineHeight: 1.4,
                    margin: '0 0 0.25rem 0',
                    color: 'var(--text-primary)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {post.title}
                  </p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    {(post.views?.[0]?.uniqueViews || 0).toLocaleString()}
                  </span>
                </div>
              </Link>
              {index < posts.length - 1 && (
                <div style={{ height: '1px', background: 'var(--border-color)', margin: '0 0.5rem', opacity: 0.4 }} />
              )}
            </li>
          ))}
        </ol>
      )}
    </nav>
  )
}
