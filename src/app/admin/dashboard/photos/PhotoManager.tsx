/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { addPhoto, deletePhoto, updateAlbumCover } from './photoActions'
import { useToast } from '@/components/admin/Toast'

interface Photo {
  id: string
  url: string
  title: string
  description: string
  location: string
  takenAt: string | null
  featured: boolean
  order: number
}

interface PhotoManagerProps {
  albumId: string
  initialPhotos: Photo[]
}

export default function PhotoManager({ albumId, initialPhotos }: PhotoManagerProps) {
  const { toast: showToast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)

  // Add photo form state
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [takenAt, setTakenAt] = useState('')
  const [featured, setFeatured] = useState(false)
  const [showForm, setShowForm] = useState(false)

  async function handleAddPhoto() {
    if (!url.trim()) return
    startTransition(async () => {
      const fd = new FormData()
      fd.append('albumId', albumId)
      fd.append('url', url.trim())
      fd.append('title', title)
      fd.append('description', description)
      fd.append('location', location)
      if (takenAt) fd.append('takenAt', takenAt)
      fd.append('featured', featured.toString())

      const result = await addPhoto(fd)
      if (result?.error) {
        showToast(result.error, 'error')
      } else {
        showToast('Photo added!', 'success')
        setPhotos([...photos, {
          id: Date.now().toString(),
          url: url.trim(), title, description, location,
          takenAt: takenAt || null, featured, order: photos.length,
        }])
        setUrl('')
        setTitle('')
        setDescription('')
        setLocation('')
        setTakenAt('')
        setFeatured(false)
        setShowForm(false)
      }
    })
  }

  async function handleDelete(photoId: string) {
    if (!confirm('Delete this photo?')) return
    const result = await deletePhoto(photoId, albumId)
    if (result?.error) {
      showToast(result.error, 'error')
    } else {
      setPhotos(photos.filter(p => p.id !== photoId))
      showToast('Photo deleted', 'success')
    }
  }

  async function handleSetCover(photoUrl: string) {
    const result = await updateAlbumCover(albumId, photoUrl)
    if (result?.error) {
      showToast(result.error, 'error')
    } else {
      showToast('Album cover updated', 'success')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-color)',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div>
      {/* Add photo button */}
      <button
        type="button"
        onClick={() => setShowForm(!showForm)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.55rem 1.1rem',
          borderRadius: '10px',
          background: showForm ? 'var(--border-color)' : 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
          border: 'none',
          color: showForm ? 'var(--text-primary)' : '#fff',
          fontSize: '0.85rem',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '1.25rem',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {showForm
            ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
            : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>
          }
        </svg>
        {showForm ? 'Cancel' : 'Add Photo'}
      </button>

      {/* Add photo form */}
      {showForm && (
        <div style={{
          padding: '1.25rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Photo URL *
            </label>
            <input value={url} onChange={e => setUrl(e.target.value)} style={inputStyle} placeholder="https://..." />
          </div>
          {url && (
            <div style={{ borderRadius: '8px', overflow: 'hidden', aspectRatio: '16/9', position: 'relative' }}>
              <Image src={url} alt="Preview" fill style={{ objectFit: 'cover' }} sizes="400px" />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} placeholder="Title (optional)" />
            <input value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} placeholder="Location (optional)" />
          </div>
          <input value={description} onChange={e => setDescription(e.target.value)} style={inputStyle} placeholder="Description (optional)" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <input type="date" value={takenAt} onChange={e => setTakenAt(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} />
              Featured
            </label>
          </div>
          <button
            type="button"
            onClick={handleAddPhoto}
            disabled={isPending || !url.trim()}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
              border: 'none',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              alignSelf: 'flex-start',
              fontSize: '0.875rem',
            }}
          >
            {isPending ? 'Adding…' : 'Add Photo'}
          </button>
        </div>
      )}

      {/* Photo grid */}
      {photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', border: '2px dashed var(--border-color)', borderRadius: '12px' }}>
          No photos yet. Add your first one above.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
          {photos.map(photo => (
            <div key={photo.id} style={{
              borderRadius: '10px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)',
              position: 'relative',
              background: 'var(--bg-color)',
            }}>
              <div style={{ aspectRatio: '1', position: 'relative' }}>
                <Image src={photo.url} alt={photo.title || 'Photo'} fill style={{ objectFit: 'cover' }} sizes="140px" />
              </div>
              {photo.title && (
                <div style={{ padding: '0.3rem 0.4rem', fontSize: '0.7rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {photo.title}
                </div>
              )}
              {/* Action buttons overlay */}
              <div style={{
                position: 'absolute',
                top: '0.3rem',
                right: '0.3rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
              }}>
                <button
                  type="button"
                  onClick={() => handleSetCover(photo.url)}
                  title={`Set ${photo.title || 'photo'} as album cover`}
                  aria-label={`Set ${photo.title || 'photo'} as album cover`}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '6px',
                    background: 'rgba(0,0,0,0.65)',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(photo.id)}
                  title={`Delete ${photo.title || 'photo'}`}
                  aria-label={`Delete ${photo.title || 'photo'}`}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '6px',
                    background: 'rgba(239,68,68,0.8)',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
