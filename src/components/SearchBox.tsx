/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface SearchPost {
  id: string
  title: string
  slug: string
  content: string
  createdAt: string
  author: { username: string; firstName: string | null }
  tags: { name: string; slug: string }[]
}

export function SearchBox() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchPost[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Debounced search
  const searchPosts = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setResults([])
      setHasSearched(false)
      return
    }

    setLoading(true)
    setHasSearched(true)

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=8`)
      const data = await res.json()
      setResults(data.posts || [])
    } catch (err) {
      console.error('Search error:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchPosts(query)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, searchPosts])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
      // Escape to close
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const closeSearch = useCallback(() => {
    setIsOpen(false)
  }, [])

  const openSearch = useCallback(() => {
    setIsOpen(true)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`)
      setIsOpen(false)
    }
  }

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return <>{text}</>

    // Split the text by the query, keeping the matched part
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)

    return (
      <>
        {parts.map((part, i) => {
          if (part.toLowerCase() === query.toLowerCase()) {
            return (
              <mark
                key={i}
                style={{ background: 'var(--accent-color)', color: 'white', padding: '0 2px', borderRadius: '2px' }}
              >
                {part}
              </mark>
            )
          }
          return <span key={i}>{part}</span>
        })}
      </>
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Search Trigger Button */}
      <button
        onClick={openSearch}
        className="search-trigger glass"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Open search"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.6rem 1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-color-secondary)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontSize: '0.9rem',
          minHeight: '44px',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <span className="search-trigger-text">Search posts...</span>
        <kbd className="search-trigger-kbd"
          style={{
            marginLeft: 'auto',
            padding: '0.2rem 0.5rem',
            background: 'var(--bg-color)',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontFamily: 'monospace'
          }}
        >
          Ctrl K
        </kbd>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div
          className="search-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Search posts"
          onClick={closeSearch}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '5vh',
            padding: '5vh 1rem 0',
          }}
        >
          <div
            className="search-container glass"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '600px',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}
          >
            {/* Search Input Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
              <form onSubmit={handleSubmit} style={{ flex: 1, position: 'relative' }} role="search">
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-secondary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    position: 'absolute',
                    left: '1.25rem',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search posts by title or content..."
                  aria-label="Search posts"
                  style={{
                    width: '100%',
                    padding: '1.25rem 1.25rem 1.25rem 3.5rem',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '1.1rem',
                    outline: 'none'
                  }}
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => { setQuery(''); inputRef.current?.focus() }}
                    style={{
                      position: 'absolute',
                      right: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'var(--bg-color)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      fontSize: '1rem',
                    }}
                  >
                    ×
                  </button>
                )}
              </form>

              {/* Close button — always visible */}
              <button
                type="button"
                aria-label="Close search"
                onClick={closeSearch}
                className="search-close-btn"
                style={{
                  flexShrink: 0,
                  padding: '0 1.25rem',
                  height: '100%',
                  minHeight: '64px',
                  border: 'none',
                  borderLeft: '1px solid var(--border-color)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'color 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
                <span className="search-close-label">Close</span>
              </button>
            </div>

            {/* Search Results */}
            <div
              style={{ maxHeight: '60vh', overflowY: 'auto', borderTop: '1px solid var(--border-color)' }}
              aria-live="polite"
              aria-atomic="true"
            >
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }} role="status">
                  <div style={{ animation: 'pulse 2s infinite' }}>Searching...</div>
                </div>
              ) : hasSearched && results.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }} role="status">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 1rem', opacity: 0.5, display: 'block' }}>
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                  <p>No posts found matching &ldquo;{query}&rdquo;</p>
                </div>
              ) : results.length > 0 ? (
                <div>
                  <div style={{ padding: '0.75rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    {results.length} result{results.length !== 1 ? 's' : ''} found
                  </div>
                  {results.map((post) => {
                    const isMarkdown = (post as any).contentFormat === 'markdown'
                    const excerpt = isMarkdown
                      ? post.content.replace(/!\[[^\]]*\]\([^)]+\)/g, '').replace(/#{1,6}\s*/g, '').replace(/[*_~`]+/g, '').replace(/\n+/g, ' ').trim().substring(0, 150)
                      : post.content.replace(/<[^>]*>?/gm, '').trim().substring(0, 150)

                    return (
                      <Link
                        key={post.id}
                        href={`/post/${post.slug}`}
                        onClick={() => setIsOpen(false)}
                        style={{
                          display: 'block',
                          padding: '1rem 1.25rem',
                          borderBottom: '1px solid var(--border-color)',
                          transition: 'background 0.2s ease',
                          textDecoration: 'none'
                        }}
                        className="search-result-item"
                      >
                        <h4
                          style={{
                            fontSize: '1rem',
                            fontWeight: 600,
                            marginBottom: '0.5rem',
                            color: 'var(--text-primary)'
                          }}
                        >
                          {highlightMatch(post.title, query)}
                        </h4>
                        <p
                          style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {highlightMatch(excerpt, query)}
                        </p>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {post.author.firstName || post.author.username} • {new Date(post.createdAt).toLocaleDateString()}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <p>Type at least 2 characters to search</p>
                  <div style={{ marginTop: '1rem', fontSize: '0.85rem', opacity: 0.7 }}>
                    <span style={{ marginRight: '1rem' }}>Search by:</span>
                    <span style={{ background: 'var(--bg-color)', padding: '0.2rem 0.5rem', borderRadius: '4px', marginRight: '0.5rem' }}>Title</span>
                    <span style={{ background: 'var(--bg-color)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Content</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="search-footer"
              style={{
                padding: '0.75rem 1.25rem',
                background: 'var(--bg-color)',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)'
              }}
            >
              <div style={{ display: 'flex', gap: '1rem' }}>
                <span><kbd style={{ background: 'var(--bg-color-secondary)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>↑↓</kbd> navigate</span>
                <span><kbd style={{ background: 'var(--bg-color-secondary)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>↵</kbd> select</span>
              </div>
              <span><kbd style={{ background: 'var(--bg-color-secondary)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>esc</kbd> close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
