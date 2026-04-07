/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useTransition } from 'react'
import { saveProject, addProjectImage, deleteProjectImage } from './projectActions'
import { useToast } from '@/components/admin/Toast'
import dynamic from 'next/dynamic'
import Image from 'next/image'

const TipTapEditor = dynamic(() => import('@/components/editor/TipTapEditor'), { ssr: false })

interface ProjectImage {
  id: string
  url: string
  caption: string
  order: number
}

interface ProjectData {
  id?: string
  title?: string
  slug?: string
  tagline?: string
  content?: string
  coverImage?: string | null
  status?: string
  featured?: boolean
  published?: boolean
  githubUrl?: string | null
  liveUrl?: string | null
  techTags?: string[]
  order?: number
  images?: ProjectImage[]
}

const TECH_SUGGESTIONS = [
  'React', 'Next.js', 'TypeScript', 'JavaScript', 'Node.js', 'Python',
  'Go', 'Rust', 'PostgreSQL', 'SQLite', 'MongoDB', 'Redis', 'Docker',
  'Kubernetes', 'AWS', 'Vercel', 'Tailwind CSS', 'GraphQL', 'REST API',
  'Prisma', 'Three.js', 'Svelte', 'Vue', 'Angular', 'Bun', 'Deno',
]

export default function ProjectEditor({ initialData }: { initialData?: ProjectData }) {
  const { toast: showToast } = useToast()
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState(initialData?.title || '')
  const [slug, setSlug] = useState(initialData?.slug || '')
  const [tagline, setTagline] = useState(initialData?.tagline || '')
  const [content, setContent] = useState(initialData?.content || '')
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || '')
  const [status, setStatus] = useState(initialData?.status || 'completed')
  const [featured, setFeatured] = useState(initialData?.featured || false)
  const [published, setPublished] = useState(initialData?.published || false)
  const [githubUrl, setGithubUrl] = useState(initialData?.githubUrl || '')
  const [liveUrl, setLiveUrl] = useState(initialData?.liveUrl || '')
  const [techTags, setTechTags] = useState<string[]>(initialData?.techTags || [])
  const [techInput, setTechInput] = useState('')
  const [orderVal, setOrderVal] = useState(initialData?.order ?? 0)
  const [images, setImages] = useState<ProjectImage[]>(initialData?.images || [])
  const [imageUrl, setImageUrl] = useState('')
  const [imageCaption, setImageCaption] = useState('')
  const [addingImage, setAddingImage] = useState(false)

  function autoSlug(t: string) {
    return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
  }

  function handleTitleChange(v: string) {
    setTitle(v)
    if (!initialData?.id) setSlug(autoSlug(v))
  }

  function addTechTag(tag: string) {
    const trimmed = tag.trim()
    if (trimmed && !techTags.includes(trimmed)) {
      setTechTags([...techTags, trimmed])
    }
    setTechInput('')
  }

  function removeTechTag(tag: string) {
    setTechTags(techTags.filter(t => t !== tag))
  }

  async function handleAddImage() {
    if (!initialData?.id || !imageUrl.trim()) return
    setAddingImage(true)
    const result = await addProjectImage(initialData.id, imageUrl.trim(), imageCaption.trim())
    setAddingImage(false)
    if (result?.error) {
      showToast(result.error, 'error')
    } else {
      showToast('Image added', 'success')
      setImages([...images, { id: Date.now().toString(), url: imageUrl.trim(), caption: imageCaption.trim(), order: images.length }])
      setImageUrl('')
      setImageCaption('')
    }
  }

  async function handleDeleteImage(imageId: string) {
    const result = await deleteProjectImage(imageId)
    if (result?.error) {
      showToast(result.error, 'error')
    } else {
      setImages(images.filter(i => i.id !== imageId))
      showToast('Image removed', 'success')
    }
  }

  function handleSubmit(publishedValue: boolean) {
    startTransition(async () => {
      const fd = new FormData()
      if (initialData?.id) fd.append('id', initialData.id)
      fd.append('title', title)
      fd.append('slug', slug)
      fd.append('tagline', tagline)
      fd.append('content', content)
      fd.append('coverImage', coverImage)
      fd.append('status', status)
      fd.append('featured', featured.toString())
      fd.append('published', publishedValue.toString())
      fd.append('githubUrl', githubUrl)
      fd.append('liveUrl', liveUrl)
      fd.append('techTags', JSON.stringify(techTags))
      fd.append('order', orderVal.toString())

      const result = await saveProject(fd)
      if (result?.error) showToast(result.error, 'error')
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
    <div style={{ maxWidth: '780px' }}>
      {/* Core info */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 1.25rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Core Info
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Title *</label>
            <input value={title} onChange={e => handleTitleChange(e.target.value)} style={inputStyle} placeholder="My Awesome Project" />
          </div>
          <div>
            <label style={labelStyle}>Tagline</label>
            <input value={tagline} onChange={e => setTagline(e.target.value)} style={inputStyle} placeholder="One-line summary of what this project does" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Slug</label>
              <input value={slug} onChange={e => setSlug(e.target.value)} style={inputStyle} placeholder="my-project" />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Links */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 1.25rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Links
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>GitHub URL</label>
            <input value={githubUrl} onChange={e => setGithubUrl(e.target.value)} style={inputStyle} placeholder="https://github.com/user/repo" type="url" />
          </div>
          <div>
            <label style={labelStyle}>Live URL</label>
            <input value={liveUrl} onChange={e => setLiveUrl(e.target.value)} style={inputStyle} placeholder="https://myproject.com" type="url" />
          </div>
        </div>
      </div>

      {/* Cover image */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 1.25rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Cover Image
        </h3>
        <input value={coverImage} onChange={e => setCoverImage(e.target.value)} style={inputStyle} placeholder="https://... (paste an image URL)" />
        {coverImage && (
          <div style={{ marginTop: '0.75rem', borderRadius: '10px', overflow: 'hidden', aspectRatio: '16/7', position: 'relative' }}>
            <Image src={coverImage} alt="Cover preview" fill style={{ objectFit: 'cover' }} sizes="780px" />
          </div>
        )}
      </div>

      {/* Tech stack */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 1.25rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Tech Stack
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {techTags.map(tag => (
            <span key={tag} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.65rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 500,
              background: 'color-mix(in srgb, var(--accent-color) 12%, transparent)',
              color: 'var(--accent-color)',
              border: '1px solid color-mix(in srgb, var(--accent-color) 25%, transparent)',
            }}>
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag} tag`}
                title="Remove tag"
                onClick={() => removeTechTag(tag)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1, opacity: 0.7 }}
              ><span aria-hidden="true">×</span></button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            value={techInput}
            onChange={e => setTechInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTechTag(techInput) } }}
            style={{ ...inputStyle }}
            placeholder="Add a technology and press Enter"
            list="tech-suggestions"
          />
          <datalist id="tech-suggestions">
            {TECH_SUGGESTIONS.map(t => <option key={t} value={t} />)}
          </datalist>
          <button
            type="button"
            onClick={() => addTechTag(techInput)}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '0.875rem',
            }}
          >Add</button>
        </div>
      </div>

      {/* Rich content */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 1.25rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Description
        </h3>
        <TipTapEditor initialContent={content} onChange={setContent} />
      </div>

      {/* Image gallery (only for existing projects) */}
      {initialData?.id && (
        <div style={sectionStyle}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 1.25rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Gallery Images
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', marginBottom: '1rem', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} style={inputStyle} placeholder="Image URL" />
              <input value={imageCaption} onChange={e => setImageCaption(e.target.value)} style={inputStyle} placeholder="Caption (optional)" />
            </div>
            <button
              type="button"
              onClick={handleAddImage}
              disabled={addingImage || !imageUrl.trim()}
              aria-busy={addingImage}
              style={{
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                background: 'color-mix(in srgb, var(--accent-color) 15%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent-color) 30%, transparent)',
                color: 'var(--accent-color)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                alignSelf: 'stretch',
              }}
            >
              {addingImage ? 'Adding...' : 'Add'}
            </button>
          </div>

          {images.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
              {images.map(img => (
                <div key={img.id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <div style={{ aspectRatio: '4/3', position: 'relative' }}>
                    <Image src={img.url} alt={img.caption || 'Image'} fill style={{ objectFit: 'cover' }} sizes="160px" />
                  </div>
                  {img.caption && (
                    <div style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)' }}>
                      {img.caption}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(img.id)}
                    aria-label={`Delete ${img.caption || 'image'}`}
                    title={`Delete ${img.caption || 'image'}`}
                    style={{
                      position: 'absolute',
                      top: '0.35rem',
                      right: '0.35rem',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.7)',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                    }}
                  ><span aria-hidden="true">×</span></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings & publish */}
      <div style={{ ...sectionStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>Sort Order</label>
          <input type="number" value={orderVal} onChange={e => setOrderVal(parseInt(e.target.value) || 0)} style={inputStyle} min={0} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
            <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
            Featured
          </label>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
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
          {isPending ? 'Saving…' : published ? 'Update' : 'Publish'}
        </button>
      </div>
    </div>
  )
}
