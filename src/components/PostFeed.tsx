/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { sanitizeContent } from '@/lib/sanitize'
import { getExcerpt } from '@/lib/renderContent'

// Create a unified type for the incoming posts from the API
type FeedPost = {
  id: string
  title: string
  slug: string
  content: string
  createdAt: string
  isFeatured: boolean
  author: { firstName: string | null; username: string }
  tags: { name: string; slug: string }[]
  views?: { uniqueViews: number }[] // Since we included views in the API
}

export function PostFeed({ initialPosts = [], initialCursor }: { initialPosts?: FeedPost[], initialCursor?: string }) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts)
  const [cursor, setCursor] = useState<string | undefined>(initialCursor)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(!!initialCursor)
  
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const fetchNextPage = useCallback(async () => {
    if (loading || !hasMore || !cursor) return
    setLoading(true)
    
    try {
      const res = await fetch(`/api/posts?cursor=${cursor}`)
      const data = await res.json()
      
      if (data.posts && data.posts.length > 0) {
        setPosts(prev => [...prev, ...data.posts])
        setCursor(data.nextCursor)
        if (!data.nextCursor) setHasMore(false)
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error("Failed to load more posts:", err)
    } finally {
      setLoading(false)
    }
  }, [cursor, loading, hasMore])

  // Setup Intersection Observer on the invisible 'loading trigger' block
  useEffect(() => {
    if (!hasMore) return

    const currentTarget = loadMoreRef.current
    if (currentTarget) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            fetchNextPage()
          }
        },
        { rootMargin: '200px' } // Trigger fetch slightly before it enters screen
      )
      observerRef.current.observe(currentTarget)
    }

    return () => {
      if (observerRef.current && currentTarget) {
        observerRef.current.unobserve(currentTarget)
      }
    }
  }, [fetchNextPage, hasMore])

  const processedPosts = useMemo(() => {
    return posts.map(post => {
      const uniqueViews = post.views?.[0]?.uniqueViews || 0
      const sanitizedExcerptHtml = sanitizeContent(getExcerpt(post.content, (post as any).contentFormat, 200))
      return { ...post, uniqueViews, sanitizedExcerptHtml }
    })
  }, [posts])

  if (processedPosts.length === 0 && !loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
        No posts have been published yet.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {processedPosts.map(post => {
        const { uniqueViews, sanitizedExcerptHtml } = post;

        return (
          <article 
            key={post.id} 
            className="glass fade-in-up" 
            style={{ 
              padding: '2.5rem', 
              transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)',
              position: 'relative'
            }}
          >
            {post.isFeatured && (
              <div style={{ position: 'absolute', top: '-12px', right: '2rem', background: 'var(--accent-color)', color: 'white', padding: '0.2rem 1rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                Featured
              </div>
            )}
            
            <Link href={`/post/${post.slug}`} style={{ display: 'block' }}>
              <h2 className="heading-xl" style={{ fontSize: '2rem', marginBottom: '1rem', lineHeight: 1.2 }}>{post.title}</h2>
              <div 
                style={{ 
                  color: 'var(--text-secondary)', 
                  marginBottom: '1.5rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.6
                }}
                dangerouslySetInnerHTML={{ __html: sanitizedExcerptHtml }}
              />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{post.author.firstName || post.author.username}</span>
                  <span>•</span>
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  {uniqueViews > 0 && (
                    <>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        {uniqueViews}
                      </span>
                    </>
                  )}
                </div>
                
                {post.tags && post.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {post.tags.slice(0, 3).map(tag => (
                      <span key={tag.name} style={{ background: 'var(--bg-color-secondary)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          </article>
        )
      })}

      {/* Invisible Div used to trigger the "Bottom Reached" scroll computation */}
      <div 
        ref={loadMoreRef} 
        style={{ height: '20px', margin: '2rem 0', display: 'flex', justifyContent: 'center' }}
      >
        {loading && (
          <div style={{ color: 'var(--accent-color)', fontWeight: 600, fontSize: '0.9rem', animation: 'pulse 2s infinite' }}>
            Loading more stories...
          </div>
        )}
      </div>
    </div>
  )
}
