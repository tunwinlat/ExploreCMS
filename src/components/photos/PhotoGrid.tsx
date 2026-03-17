/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Lightbox, type LightboxPhoto } from './Lightbox'

interface PhotoGridProps {
  photos: LightboxPhoto[]
}

export function PhotoGrid({ photos }: PhotoGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (photos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.3 }}>📷</div>
        <p>No photos in this album yet.</p>
      </div>
    )
  }

  return (
    <>
      <div style={{
        columns: '3 280px',
        gap: '0.75rem',
      }}>
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            role="button"
            tabIndex={0}
            aria-label={`View photo ${photo.title || i + 1}`}
            style={{
              breakInside: 'avoid',
              marginBottom: '0.75rem',
              borderRadius: '10px',
              overflow: 'hidden',
              cursor: 'pointer',
              position: 'relative',
              border: '1px solid var(--border-color)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onClick={() => setLightboxIndex(i)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setLightboxIndex(i)
              }
            }}
            className="photo-grid-item"
          >
            <style>{`
              .photo-grid-item:hover { transform: scale(1.015); box-shadow: 0 8px 30px rgba(0,0,0,0.2); }
              .photo-grid-item:hover .photo-overlay { opacity: 1 !important; }
            `}</style>
            <Image
              src={photo.url}
              alt={photo.title || 'Photo'}
              width={600}
              height={400}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <div
              className="photo-overlay"
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent 50%)',
                opacity: 0,
                transition: 'opacity 0.25s ease',
                display: 'flex',
                alignItems: 'flex-end',
                padding: '0.75rem',
              }}
            >
              <div style={{ color: '#fff' }}>
                {photo.title && (
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>{photo.title}</p>
                )}
                {photo.location && (
                  <p style={{ fontSize: '0.7rem', opacity: 0.8, margin: '0.15rem 0 0', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {photo.location}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  )
}
