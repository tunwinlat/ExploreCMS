/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface TrendingPost {
  id: string
  title: string
  slug: string
  content: string
  createdAt: string
  author: { username: string; firstName: string | null }
  tags: { name: string; slug: string }[]
  views?: { totalViews: number; uniqueViews: number }[]
}

interface TrendingPostsProps {
  initialPosts?: TrendingPost[]
}

export function TrendingPosts({ initialPosts = [] }: TrendingPostsProps) {
  const [posts, setPosts] = useState<TrendingPost[]>(initialPosts)
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('7d')
  const [loading, setLoading] = useState(!initialPosts.length)

  useEffect(() => {
    if (initialPosts.length > 0) return // Skip if we have initial posts
    
    fetchTrending()
  }, [period, initialPosts.length])

  const fetchTrending = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/trending?period=${period}&limit=6`)
      const data = await res.json()
      if (data.posts) {
        setPosts(data.posts)
      }
    } catch (err) {
      console.error('Failed to fetch trending posts:', err)
    } finally {
      setLoading(false)
    }
  }

  const getRankStyle = (index: number) => {
    if (index === 0) return { background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#000' }
    if (index === 1) return { background: 'linear-gradient(135deg, #C0C0C0, #A0A0A0)', color: '#000' }
    if (index === 2) return { background: 'linear-gradient(135deg, #CD7F32, #B87333)', color: '#fff' }
    return { background: 'var(--bg-color-secondary)', color: 'var(--text-primary)' }
  }

  if (loading) {
    return (
      <section className="trending-section" style={{ marginBottom: '4rem' }}>
        <div className="glass" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-secondary)', animation: 'pulse 2s infinite' }}>
            Loading trending posts...
          </div>
        </div>
      </section>
    )
  }

  if (posts.length === 0) return null

  return (
    <section className="trending-section" style={{ marginBottom: '4rem' }}>
      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div 
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Trending Now</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>Most popular posts this {period === '7d' ? 'week' : period === '30d' ? 'month' : 'period'}</p>
          </div>
        </div>

        {/* Period Filter */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-color-secondary)', padding: '0.25rem', borderRadius: '10px' }}>
          {(['7d', '30d', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: period === p ? 'var(--accent-color)' : 'transparent',
                color: period === p ? 'white' : 'var(--text-secondary)',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {p === '7d' ? 'Week' : p === '30d' ? 'Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Trending Grid */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1rem'
        }}
      >
        {posts.map((post, index) => {
          const rankStyle = getRankStyle(index)
          const excerpt = post.content
            .replace(/<[^>]*>?/gm, '')
            .trim()
            .substring(0, 100) + '...'
          
          const imgMatch = post.content.match(/<img[^>]+src="([^">]+)"/)
          const coverImage = imgMatch ? imgMatch[1] : null

          return (
            <Link 
              key={post.id} 
              href={`/post/${post.slug}`}
              className="trending-card"
              style={{
                display: 'flex',
                gap: '1rem',
                padding: '1rem',
                background: 'var(--bg-color-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                transition: 'all 0.3s ease',
                textDecoration: 'none',
                alignItems: 'flex-start'
              }}
            >
              {/* Rank Badge */}
              <div 
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  flexShrink: 0,
                  ...rankStyle
                }}
              >
                {index + 1}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 
                  style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                    lineHeight: 1.4,
                    color: 'var(--text-primary)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {post.title}
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>{post.author.firstName || post.author.username}</span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    {(post.views?.[0]?.uniqueViews || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Thumbnail */}
              {coverImage && (
                <div 
                  style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}
                >
                  <img 
                    src={coverImage} 
                    alt="" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
