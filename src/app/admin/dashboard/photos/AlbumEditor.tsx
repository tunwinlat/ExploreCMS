/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useTransition } from 'react'
import { saveAlbum } from './photoActions'
import Image from 'next/image'

interface AlbumData {
  id?: string
  title?: string
  slug?: string
  description?: string
  coverImage?: string | null
  featured?: boolean
  published?: boolean
  order?: number
}

export default function AlbumEditor({ initialData }: { initialData?: AlbumData }) {
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(initialData?.title || '')
  const [slug, setSlug] = useState(initialData?.slug || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || '')
  const [featured, setFeatured] = useState(initialData?.featured || false)
  const [orderVal, setOrderVal] = useState(initialData?.order ?? 0)

  function autoSlug(t: string) {
    return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
  }

  function handleTitleChange(v: string) {
    setTitle(v)
    if (!initialData?.id) setSlug(autoSlug(v))
  }

  function handleSubmit(published: boolean) {
    startTransition(async () => {
      const fd = new FormData()
      if (initialData?.id) fd.append('id', initialData.id)
      fd.append('title', title)
      fd.append('slug', slug)
      fd.append('description', description)
      fd.append('coverImage', coverImage)
      fd.append('featured', featured.toString())
      fd.append('published', published.toString())
      fd.append('order', orderVal.toString())
      await saveAlbum(fd)
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.875rem',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-color)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '0.4rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  }

  const sectionStyle: React.CSSProperties = {
    padding: '1.5rem',
    borderRadius: '14px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-color-secondary, rgba(0,0,0,0.02))',
    marginBottom: '1.25rem',
  }

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={sectionStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Album Title *</label>
            <input value={title} onChange={e => handleTitleChange(e.target.value)} style={inputStyle} placeholder="Summer 2025" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Slug</label>
              <input value={slug} onChange={e => setSlug(e.target.value)} style={inputStyle} placeholder="summer-2025" />
            </div>
            <div>
              <label style={labelStyle}>Sort Order</label>
              <input type="number" value={orderVal} onChange={e => setOrderVal(parseInt(e.target.value) || 0)} style={inputStyle} min={0} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ ...inputStyle, height: '100px', resize: 'vertical' }}
              placeholder="A short description of this album..."
            />
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 1rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Cover Image
        </h3>
        <input value={coverImage} onChange={e => setCoverImage(e.target.value)} style={inputStyle} placeholder="https://... (paste image URL)" />
        {coverImage && (
          <div style={{ marginTop: '0.75rem', borderRadius: '10px', overflow: 'hidden', aspectRatio: '4/3', position: 'relative' }}>
            <Image src={coverImage} alt="Cover preview" fill style={{ objectFit: 'cover' }} sizes="680px" />
          </div>
        )}
      </div>

      <div style={{ ...sectionStyle, display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
          <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
          Featured Album
        </label>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={isPending || !title.trim()}
          style={{
            padding: '0.7rem 1.5rem',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Save as Draft
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={isPending || !title.trim()}
          style={{
            padding: '0.7rem 1.75rem',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
            border: 'none',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? 'Saving…' : initialData?.id ? 'Update' : 'Create Album'}
        </button>
      </div>
    </div>
  )
}
