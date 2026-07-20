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
      <p className="empty-state">No photos in this album yet.</p>
    )
  }

  return (
    <>
      <div className="photo-grid">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            aria-label={`View photo ${photo.title || i + 1}`}
            className="photo-grid-item"
            onClick={() => setLightboxIndex(i)}
          >
            <Image
              src={photo.url}
              alt={photo.title || `Photo ${i + 1}`}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            {(photo.title || photo.location) && (
              <div className="photo-overlay">
                <div>
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
            )}
          </button>
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
