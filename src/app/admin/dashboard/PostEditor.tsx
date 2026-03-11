/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { savePost, deletePost } from './postActions'
import Link from 'next/link'
import TipTapEditor from '@/components/editor/TipTapEditor'
import TagSelector from '@/components/editor/TagSelector'
import { Post } from '@prisma/client'

export default function PostEditor({ 
  post, 
  availableTags = [] 
}: { 
  post?: Post & { 
    tags?: {name: string, slug: string}[]
    isFeatured?: boolean 
  }
  availableTags?: {name: string, slug: string}[] 
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState(post?.content || '')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const initialTags = post?.tags?.map(t => t.name) || []

  const formRef = useRef<HTMLFormElement>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Background Auto-Save (Debounced 5 seconds after typing stops)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!formRef.current || !post?.id) return
      
      const formData = new FormData(formRef.current)
      formData.set('content', content)
      // Background saves should strictly preserve the CURRENT publish state, ensuring we don't accidentally
      // force a post to go live via autosave, nor accidentally un-publish a live post.
      formData.set('published', post.published ? 'true' : 'false')
      
      try {
        const res = await savePost(formData, { redirect: false })
        if (res?.success) setLastSaved(new Date())
      } catch (err) {
        // silent fail on autosave
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [content]) // triggers 5s after every tip-tap edit

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    formData.set('content', content)
    
    // Explicit override based on which button was clicked
    const action = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value')
    if (action === 'publish') {
      formData.set('published', 'true')
    } else if (action === 'draft') {
      formData.set('published', 'false')
    }

    try {
      const res = await savePost(formData, { redirect: action === 'publish' })
      if (res?.error) setError(res.error)
      else setLastSaved(new Date())
    } catch (err: unknown) {
      if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
        setError(err.message)
      } else if (!(err instanceof Error)) {
        setError('An unexpected error occurred.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <form ref={formRef} onSubmit={handleSubmit} className="fade-in-up glass" style={{ display: 'flex', flexDirection: 'column', padding: '2rem' }}>
      {post && <input type="hidden" name="id" value={post.id} />}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/admin/dashboard" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>← Back</Link>
          <h1 className="heading-xl" style={{ fontSize: '1.5rem', margin: 0 }}>
            {post?.published ? 'Editing Published Post' : 'Editing Draft'}
          </h1>
          {lastSaved && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              (Autosaved at {lastSaved.toLocaleTimeString()})
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            type="button" 
            onClick={() => setShowAdvanced(!showAdvanced)} 
            className="btn" 
            style={{ background: showAdvanced ? 'var(--border-color)' : 'transparent', border: '1px solid var(--border-color)' }}
          >
            ⚙️ Advanced
          </button>
          
          <button type="submit" name="action" value="draft" disabled={loading} className="btn" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: 'none' }}>
            {loading ? 'Saving...' : 'Save Draft'}
          </button>
          <button type="submit" name="action" value="publish" disabled={loading} className="btn btn-primary" style={{ background: '#10b981', color: 'white' }}>
            {loading ? 'Publishing...' : 'Publish'}
          </button>
          {post && (
            <button 
              type="button" 
              onClick={async () => {
                if(confirm('Are you sure you want to delete this?')) {
                  await deletePost(post.id)
                }
              }} 
              className="btn" 
              style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none' }}
            >
              Trash
            </button>
          )}
        </div>
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
        <input 
          type="text" 
          name="title" 
          placeholder="Start with a brilliant title..." 
          required 
          defaultValue={post?.title}
          style={{ 
            fontSize: '1.75rem', 
            fontWeight: 800, 
            background: 'transparent', 
            border: 'none', 
            color: 'var(--text-primary)', 
            padding: '0.5rem 0',
            outline: 'none',
            letterSpacing: '-0.5px'
          }}
        />

        {showAdvanced && (
          <div className="fade-in-up" style={{ 
            background: 'var(--bg-color-secondary)', 
            padding: '1.5rem', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Advanced Settings</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Custom URL Slug</label>
              <input 
                type="text" 
                name="slug" 
                placeholder="Leave blank to auto-generate from title" 
                defaultValue={post?.slug}
                className="input-field"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Post Tags</label>
              <TagSelector availableTags={availableTags} initialTags={initialTags} />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              <input type="checkbox" name="isFeatured" value="true" defaultChecked={post?.isFeatured} style={{ transform: 'scale(1.2)' }} />
              ⭐ Mark as Featured Post
            </label>
          </div>
        )}
        
        <TipTapEditor 
          initialContent={post?.content || ''} 
          onChange={setContent} 
        />
      </div>
    </form>
    </div>
  )
}
