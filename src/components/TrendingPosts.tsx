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
    if (initialPosts.length > 0) return
    
    fetchTrending()
  }, [period, initialPosts.length])

  const fetchTrending = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/trending?period=${period}&limit=8`)
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
    if (index === 0) return { 
      background: 'linear-gradient(135deg, #FFD700, #FFA500)', 
      color: '#000',
      boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)'
    }
    if (index === 1) return { 
      background: 'linear-gradient(135deg, #C0C0C0, #A0A0A0)', 
      color: '#000',
      boxShadow: '0 4px 12px rgba(192, 192, 192, 0.3)'
    }
    if (index === 2) return { 
      background: 'linear-gradient(135deg, #CD7F32, #B87333)', 
      color: '#fff',
      boxShadow: '0 4px 12px rgba(205, 127, 50, 0.3)'
    }
    return { 
      background: 'var(--bg-color)', 
      color: 'var(--text-secondary)',
      border: '1px solid var(--border-color)'
    }
  }

  if (loading) {
    return (
      <aside className="trending-sidebar glass" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Trending</h3>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', animation: 'pulse 2s infinite' }}>
          Loading...
        </div>
      </aside>
    )
  }

  if (posts.length === 0) return null

  return (
    <aside className="trending-sidebar">
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.75rem', 
        marginBottom: '1.25rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </svg>
        </div>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Trending Now</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
            {period === '7d' ? 'This week' : period === '30d' ? 'This month' : 'All time'}
          </p>
        </div>
      </div>

      {/* Period Filter */}
      <div style={{ 
        display: 'flex', 
        gap: '0.25rem', 
        marginBottom: '1.25rem',
        background: 'var(--bg-color)',
        padding: '0.25rem',
        borderRadius: '8px'
      }}>
        {(['7d', '30d', 'all'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              flex: 1,
              padding: '0.4rem 0.5rem',
              borderRadius: '6px',
              border: 'none',
              background: period === p ? 'var(--accent-color)' : 'transparent',
              color: period === p ? 'white' : 'var(--text-secondary)',
              fontSize: '0.75rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {p === '7d' ? 'Week' : p === '30d' ? 'Month' : 'All'}
          </button>
        ))}
      </div>

      {/* Trending List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {posts.map((post, index) => {
          const rankStyle = getRankStyle(index)
          const imgMatch = post.content.match(/<img[^>]+src="([^">]+)"/)
          const coverImage = imgMatch ? imgMatch[1] : null

          return (
            <Link 
              key={post.id} 
              href={`/post/${post.slug}`}
              className="trending-item"
              style={{
                display: 'flex',
                gap: '0.75rem',
                padding: '0.75rem',
                background: 'var(--bg-color)',
                borderRadius: '10px',
                border: '1px solid transparent',
                transition: 'all 0.2s ease',
                textDecoration: 'none',
                alignItems: 'flex-start'
              }}
            >
              {/* Rank Badge */}
              <div 
                style={{
                  width: '28px',
                  height: '28px',
                  minWidth: '28px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  ...rankStyle
                }}
              >
                {index + 1}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    marginBottom: '0.35rem',
                    lineHeight: 1.4,
                    color: 'var(--text-primary)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {post.title}
                </h4>
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  fontSize: '0.75rem', 
                  color: 'var(--text-secondary)'
                }}>
                  <span>{post.author.firstName || post.author.username}</span>
                  <span style={{ opacity: 0.5 }}>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                    width: '50px',
                    height: '50px',
                    minWidth: '50px',
                    borderRadius: '6px',
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
    </aside>
  )
}
