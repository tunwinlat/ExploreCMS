/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { getExcerpt, getFirstImage } from '@/lib/renderContent'

import { NavItem } from '@/app/admin/dashboard/navigation/NavBuilder'

type Post = {
  id: string
  title: string
  slug: string
  isFeatured: boolean
  author: { username: string, firstName: string | null }
  createdAt: string | Date 
  tags: { name: string, slug: string }[]
  views?: { uniqueViews: number }[]
  content: string
}


function DropdownNav({ item, activeFilter, setActiveFilter }: {
  item: NavItem,
  activeFilter: {type: 'latest'|'featured'|'tag', target?: string},
  setActiveFilter: (filter: {type: 'latest'|'featured'|'tag', target?: string}) => void
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="dropdown-container"
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains((e.relatedTarget as Node) || null)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        className="btn glass"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        style={{ padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        {item.label} <span style={{ fontSize: '0.8rem' }} aria-hidden="true">▼</span>
      </button>
      <div
        className="dropdown-menu glass"
        role="menu"
        style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '0.5rem',
          minWidth: '200px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          padding: '0.5rem',
          zIndex: 50,
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden',
          transition: 'all var(--transition-fast)'
        }}
      >
        {item.children?.map(child => (
          <button
            key={child.id}
            role="menuitem"
            onClick={() => {
              setActiveFilter({ type: 'tag', target: child.tagSlug });
              setIsOpen(false);
            }}
            aria-pressed={activeFilter.target === child.tagSlug}
            style={{
              padding: '0.75rem 1rem',
              background: activeFilter.target === child.tagSlug ? 'var(--accent-color)' : 'transparent',
              color: activeFilter.target === child.tagSlug ? 'white' : 'var(--text-primary)',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
              transition: 'background var(--transition-fast)'
            }}
            className="dropdown-item"
          >
            {child.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function DynamicPostGrid({ 
  initialPosts, 
  navItems, 
  initialCursor 
}: { 
  initialPosts: Post[], 
  navItems: NavItem[], 
  initialCursor?: string 
}) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [activeFilter, setActiveFilter] = useState<{type: 'latest'|'featured'|'tag', target?: string}>({type: 'latest'})
  
  // Pagination State
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
        { rootMargin: '200px' } 
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
      const contentFormat = (post as any).contentFormat
      const coverImage = getFirstImage(post.content, contentFormat)
      const excerpt = getExcerpt(post.content, contentFormat, 120)
      return { ...post, coverImage, excerpt }
    })
  }, [posts])

  const filteredPosts = processedPosts.filter(post => {
    if (activeFilter.type === 'latest') return true;
    if (activeFilter.type === 'featured') return post.isFeatured;
    if (activeFilter.type === 'tag' && activeFilter.target) {
      return post.tags.some(t => t.slug === activeFilter.target);
    }
    return true;
  })

  return (
    <div>
      {/* Primary Navigation System */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '3rem', flexWrap: 'wrap' }}>
        {navItems.map((item) => {
          if (item.type === 'dropdown') {
            return (
              <DropdownNav
                key={item.id}
                item={item}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
              />
            )
          }

          // Normal tag or latest/featured button
          const isActive = activeFilter.type === item.type && (!item.tagSlug || item.tagSlug === activeFilter.target)
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveFilter({ type: item.type as any, target: item.tagSlug })}
              aria-pressed={isActive}
              className={`btn ${isActive ? 'btn-primary' : 'glass'}`}
              style={{ transition: 'all var(--transition-normal)', padding: '0.5rem 1.25rem' }}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {/* Masonry / Pinterest Style Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '2rem',
        alignItems: 'start'
      }}>
        {filteredPosts.length === 0 ? (
          <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)' }}>No posts found for this view.</p>
        ) : (
          filteredPosts.map(post => {
            return (
              <Link key={post.id} href={`/post/${post.slug}`} style={{ textDecoration: 'none' }}>
                <article className="glass article-card fade-in-up" style={{
                  transition: 'all var(--transition-normal)',
                  breakInside: 'avoid',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 0,
                  overflow: 'hidden'
                }}>
                  {post.coverImage && (
                    <div style={{ width: '100%', height: '240px', overflow: 'hidden', borderBottom: '1px solid var(--border-color)' }}>
                      <img src={post.coverImage} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} className="card-img" />
                    </div>
                  )}
                  
                  <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    {post.isFeatured && (
                      <div style={{ display: 'inline-block', background: 'var(--accent-color)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '1rem', width: 'fit-content', letterSpacing: '0.05em' }}>
                        FEATURED
                      </div>
                    )}
                    <h2 style={{ fontSize: '1.4rem', marginBottom: '0.75rem', color: 'var(--text-primary)', lineHeight: 1.3, fontWeight: 700 }}>
                      {post.title}
                    </h2>
                    
                    {post.excerpt && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6, flex: 1 }}>
                        {post.excerpt}
                      </p>
                    )}
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      {post.tags.map(tag => (
                        <span key={tag.name} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
                          {tag.name}
                        </span>
                      ))}
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 500 }}>
                      <span>{post.author.firstName || post.author.username}</span>
                      <span>{new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                </article>
              </Link>
            )
          })
        )}
      </div>

      <div 
        ref={loadMoreRef} 
        style={{ height: '40px', margin: '3rem 0', display: 'flex', justifyContent: 'center' }}
        role="status"
        aria-live="polite"
      >
        {loading && (
          <div style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem', animation: 'pulse 2s infinite' }} aria-label="Loading more stories">
            Loading more stories...
          </div>
        )}
      </div>
    </div>
  )
}
