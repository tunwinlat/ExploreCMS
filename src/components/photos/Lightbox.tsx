/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useEffect, useCallback } from 'react'
import Image from 'next/image'

export interface LightboxPhoto {
  id: string
  url: string
  title?: string
  description?: string
  location?: string
  takenAt?: string | null
}

interface LightboxProps {
  photos: LightboxPhoto[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

export function Lightbox({ photos, currentIndex, onClose, onNavigate }: LightboxProps) {
  const photo = photos[currentIndex]
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < photos.length - 1

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1)
    if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1)
  }, [currentIndex, hasPrev, hasNext, onClose, onNavigate])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  if (!photo) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.92)',
        backdropFilter: 'blur(20px)',
      }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '1.25rem',
          right: '1.25rem',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.1)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
          transition: 'background 0.2s',
        }}
        aria-label="Close"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      {/* Counter */}
      <div style={{
        position: 'absolute',
        top: '1.35rem',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '0.8rem',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: '0.1em',
      }}>
        {currentIndex + 1} / {photos.length}
      </div>

      {/* Main image */}
      <div
        style={{ position: 'relative', maxWidth: '90vw', maxHeight: '80vh', width: '100%' }}
        onClick={e => e.stopPropagation()}
      >
        <Image
          src={photo.url}
          alt={photo.title || 'Photo'}
          width={1400}
          height={900}
          style={{
            objectFit: 'contain',
            width: '100%',
            height: 'auto',
            maxHeight: '80vh',
            borderRadius: '8px',
          }}
          priority
        />
      </div>

      {/* Prev button */}
      {hasPrev && (
        <button
          onClick={e => { e.stopPropagation(); onNavigate(currentIndex - 1) }}
          style={{
            position: 'absolute',
            left: '1.25rem',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          aria-label="Previous photo"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      )}

      {/* Next button */}
      {hasNext && (
        <button
          onClick={e => { e.stopPropagation(); onNavigate(currentIndex + 1) }}
          style={{
            position: 'absolute',
            right: '1.25rem',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          aria-label="Next photo"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      )}

      {/* Caption */}
      {(photo.title || photo.description || photo.location) && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '2rem',
            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
            textAlign: 'center',
          }}
        >
          {photo.title && (
            <p style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, margin: '0 0 0.25rem' }}>
              {photo.title}
            </p>
          )}
          {photo.description && (
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', margin: '0 0 0.25rem' }}>
              {photo.description}
            </p>
          )}
          {photo.location && (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {photo.location}
            </p>
          )}
        </div>
      )}

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '0.4rem',
            maxWidth: '80vw',
            overflowX: 'auto',
            padding: '0.5rem',
          }}
        >
          {photos.map((p, i) => (
            <button
              key={p.id}
              onClick={() => onNavigate(i)}
              style={{
                width: '48px',
                height: '36px',
                borderRadius: '4px',
                overflow: 'hidden',
                border: i === currentIndex
                  ? '2px solid var(--accent-color)'
                  : '2px solid transparent',
                opacity: i === currentIndex ? 1 : 0.5,
                cursor: 'pointer',
                flexShrink: 0,
                padding: 0,
                background: 'transparent',
                transition: 'opacity 0.2s, border-color 0.2s',
                position: 'relative',
              }}
              aria-label={`Go to photo ${i + 1}`}
            >
              <Image
                src={p.url}
                alt={p.title || `Photo ${i + 1}`}
                fill
                style={{ objectFit: 'cover' }}
                sizes="48px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
