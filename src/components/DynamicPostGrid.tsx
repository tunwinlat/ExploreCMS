/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'

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
  content?: string
  excerpt?: string
  coverImage?: string | null
}

export default function DynamicPostGrid({
  initialPosts,
  navItems,
  initialCursor,
  initialTag,
}: {
  initialPosts: Post[],
  navItems: NavItem[],
  initialCursor?: string,
  initialTag?: string,
}) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [activeFilter, setActiveFilter] = useState<{type: 'latest'|'featured'|'tag', target?: string}>(
    initialTag ? { type: 'tag', target: initialTag } : { type: 'latest' }
  )

  // Pagination State
  const [cursor, setCursor] = useState<string | undefined>(initialCursor)
  const [loading, setLoading] = useState(!!initialTag)
  const [hasMore, setHasMore] = useState(initialTag ? false : !!initialCursor)

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setActiveFilter(initialTag ? { type: 'tag', target: initialTag } : { type: 'latest' })
  }, [initialTag])

  useEffect(() => {
    if (activeFilter.type !== 'tag' || !activeFilter.target) {
      setPosts(initialPosts)
      setCursor(initialCursor)
      setHasMore(!!initialCursor)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const loadTaggedPosts = async () => {
      setLoading(true)
      setHasMore(false)

      try {
        const params = new URLSearchParams({ tag: activeFilter.target! })
        const res = await fetch(`/api/posts?${params.toString()}`, { signal: controller.signal })
        const data = await res.json()

        if (!controller.signal.aborted && data.posts) {
          setPosts(data.posts)
          setCursor(data.nextCursor)
          setHasMore(!!data.nextCursor)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('Failed to load tagged posts:', err)
          setPosts([])
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadTaggedPosts()
    return () => controller.abort()
  }, [activeFilter.type, activeFilter.target, initialCursor, initialPosts])

  const fetchNextPage = useCallback(async () => {
    if (loading || !hasMore || !cursor) return
    setLoading(true)

    try {
      const params = new URLSearchParams({ cursor })
      if (activeFilter.type === 'tag' && activeFilter.target) {
        params.set('tag', activeFilter.target)
      }
      const res = await fetch(`/api/posts?${params.toString()}`)
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
  }, [activeFilter.target, activeFilter.type, cursor, loading, hasMore])

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

  // ⚡ Bolt: Memoize post filtering (moved hook before early returns).
  // excerpt/coverImage arrive pre-computed from the server (SSR + /api/posts).
  const processedFilteredPosts = useMemo(() => {
    return posts.filter(post => {
      if (activeFilter.type === 'latest') return true;
      if (activeFilter.type === 'featured') return post.isFeatured;
      if (activeFilter.type === 'tag' && activeFilter.target) {
        return post.tags.some(t => t.slug === activeFilter.target);
      }
      return true;
    });
  }, [posts, activeFilter]);

  return (
    <div>
      {/* Filter tabs (dropdown nav items are flattened into their tag children) */}
      <div className="filter-tabs" role="group" aria-label="Filter posts">
        {navItems.flatMap((item) => {
          if (item.type === 'dropdown') {
            return (item.children ?? []).map(child => (
              <button
                key={child.id}
                onClick={() => setActiveFilter({ type: 'tag', target: child.tagSlug })}
                aria-pressed={activeFilter.type === 'tag' && activeFilter.target === child.tagSlug}
                className="filter-tab"
              >
                {child.label}
              </button>
            ))
          }

          const isActive = activeFilter.type === item.type && (!item.tagSlug || item.tagSlug === activeFilter.target)

          return [(
            <button
              key={item.id}
              onClick={() => setActiveFilter({ type: item.type as 'latest'|'featured'|'tag', target: item.tagSlug })}
              aria-pressed={isActive}
              className="filter-tab"
            >
              {item.label}
            </button>
          )]
        })}
      </div>

      {/* Magazine list */}
      {processedFilteredPosts.length === 0 ? (
        <p className="empty-state">
          {loading ? 'Loading posts…' : 'No posts found for this view.'}
        </p>
      ) : (
        <div className="post-list">
          {processedFilteredPosts.map(post => {
            const createdAt = typeof post.createdAt === 'string' ? post.createdAt : post.createdAt.toISOString()
            return (
              <Link key={post.id} href={`/post/${post.slug}`} className="post-row">
                {post.coverImage && (
                  <div className="post-row-thumb">
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 220px"
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                )}

                <div className="post-row-body">
                  {post.isFeatured && <span className="eyebrow">Featured</span>}
                  <h2 className="post-row-title">{post.title}</h2>

                  {post.excerpt && (
                    <p className="post-row-excerpt">{post.excerpt}</p>
                  )}

                  {post.tags.length > 0 && (
                    <div className="tag-list">
                      {post.tags.map(tag => (
                        <span key={tag.name} className="tag-chip">{tag.name}</span>
                      ))}
                    </div>
                  )}

                  <p className="meta post-row-meta">
                    <span>{post.author.firstName || post.author.username}</span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={createdAt}>
                      {new Date(createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </time>
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <div
        ref={loadMoreRef}
        className="post-list-status"
        role="status"
        aria-live="polite"
      >
        {loading && processedFilteredPosts.length > 0 && (
          <span aria-label="Loading more stories">Loading more stories…</span>
        )}
        {!loading && !hasMore && processedFilteredPosts.length > 0 && (
          <span className="post-list-end">You&rsquo;ve reached the end.</span>
        )}
      </div>
    </div>
  )
}
