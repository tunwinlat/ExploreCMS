/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface FeaturedPost {
  id: string
  title: string
  slug: string
  content: string
  createdAt: string
  author: { username: string; firstName: string | null }
  tags: { name: string; slug: string }[]
  views?: { uniqueViews: number }[]
}

interface FeaturedPostsCarouselProps {
  posts: FeaturedPost[]
}

export function FeaturedPostsCarousel({ posts }: FeaturedPostsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % posts.length)
  }, [posts.length])

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + posts.length) % posts.length)
  }, [posts.length])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
    // Resume autoplay after 5 seconds
    setTimeout(() => setIsAutoPlaying(true), 5000)
  }

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || posts.length <= 1) return
    
    const interval = setInterval(nextSlide, 5000)
    return () => clearInterval(interval)
  }, [isAutoPlaying, nextSlide, posts.length])

  if (posts.length === 0) return null

  const currentPost = posts[currentIndex]
  const excerpt = currentPost.content
    .replace(/<[^>]*>?/gm, '')
    .trim()
    .substring(0, 200) + '...'
  
  const imgMatch = currentPost.content.match(/<img[^>]+src="([^">]+)"/)
  const coverImage = imgMatch ? imgMatch[1] : null

  return (
    <section className="featured-carousel" style={{ marginBottom: '4rem' }}>
      <div 
        className="carousel-container glass"
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          minHeight: '450px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Background Image with Overlay */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: coverImage ? `url(${coverImage})` : 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div 
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.2) 100%)'
            }}
          />
        </div>

        {/* Content */}
        <div 
          className="carousel-content fade-in-up"
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '3rem',
            marginTop: 'auto',
            color: 'white'
          }}
        >
          <div 
            style={{
              display: 'inline-block',
              background: 'var(--accent-color)',
              color: 'white',
              padding: '0.3rem 1rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '1rem'
            }}
          >
            Featured
          </div>
          
          <h2 
            style={{
              fontSize: 'clamp(1.8rem, 4vw, 3rem)',
              fontWeight: 800,
              marginBottom: '1rem',
              lineHeight: 1.2,
              textShadow: '0 2px 10px rgba(0,0,0,0.3)'
            }}
          >
            <Link href={`/post/${currentPost.slug}`} style={{ color: 'white' }}>
              {currentPost.title}
            </Link>
          </h2>
          
          <p 
            style={{
              fontSize: '1.1rem',
              opacity: 0.9,
              maxWidth: '600px',
              marginBottom: '1.5rem',
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {excerpt}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.95rem', opacity: 0.8 }}>
            <span style={{ fontWeight: 600 }}>{currentPost.author.firstName || currentPost.author.username}</span>
            <span>•</span>
            <span>{new Date(currentPost.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            {currentPost.views && currentPost.views[0]?.uniqueViews > 0 && (
              <>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  {currentPost.views[0].uniqueViews}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Navigation Arrows */}
        {posts.length > 1 && (
          <>
            <button
              onClick={() => { prevSlide(); setIsAutoPlaying(false); setTimeout(() => setIsAutoPlaying(true), 5000) }}
              className="carousel-nav-btn"
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 3,
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                transition: 'all 0.3s ease'
              }}
              aria-label="Previous slide"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button
              onClick={() => { nextSlide(); setIsAutoPlaying(false); setTimeout(() => setIsAutoPlaying(true), 5000) }}
              className="carousel-nav-btn"
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 3,
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                transition: 'all 0.3s ease'
              }}
              aria-label="Next slide"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {posts.length > 1 && (
          <div 
            style={{
              position: 'absolute',
              bottom: '1.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 3,
              display: 'flex',
              gap: '0.5rem'
            }}
          >
            {posts.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                style={{
                  width: index === currentIndex ? '32px' : '10px',
                  height: '10px',
                  borderRadius: '5px',
                  background: index === currentIndex ? 'white' : 'rgba(255,255,255,0.4)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
