/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { savePost, deletePost } from './postActions'
import { unlinkCraftPost } from './integrations/craftActions'
import Link from 'next/link'
import TipTapEditor from '@/components/editor/TipTapEditor'
import TagSelector from '@/components/editor/TagSelector'
import { Post } from '@prisma/client'
import { useToast } from '@/components/admin/Toast'
import ConfirmDialog from '@/components/admin/ConfirmDialog'

type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function PostEditor({
  post,
  availableTags = [],
  readOnly = false,
  craftPostId,
}: {
  post?: Post & {
    tags?: {name: string, slug: string}[]
    isFeatured?: boolean
  }
  availableTags?: {name: string, slug: string}[]
  readOnly?: boolean
  craftPostId?: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState(post?.content || '')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [unlinkLoading, setUnlinkLoading] = useState(false)
  const initialTags = post?.tags?.map(t => t.name) || []

  const formRef = useRef<HTMLFormElement>(null)
  const { toast } = useToast()

  const handleUnlink = useCallback(async () => {
    if (!craftPostId) return
    setUnlinkLoading(true)
    const res = await unlinkCraftPost(craftPostId)
    if (res.success) {
      toast('Post unlinked from Craft. Reloading...', 'success')
      setTimeout(() => window.location.reload(), 1000)
    } else {
      toast(res.error || 'Failed to unlink.', 'error')
      setUnlinkLoading(false)
    }
  }, [craftPostId, toast])

  // Background Auto-Save (Debounced 5 seconds after typing stops)
  useEffect(() => {
    if (readOnly) return // Don't autosave read-only Craft posts
    const timer = setTimeout(async () => {
      if (!formRef.current || !post?.id) return

      const formData = new FormData(formRef.current)
      formData.set('content', content)
      formData.set('published', post.published ? 'true' : 'false')

      if (formData.get('isFeatured') === null && typeof post.isFeatured === 'boolean') {
        formData.set('isFeatured', post.isFeatured ? 'true' : 'false')
      }
      
      const currentLanguage = (post as any)?.language;
      if (!formData.get('language') && currentLanguage) {
        formData.set('language', currentLanguage)
      }

      setAutosaveStatus('saving')
      try {
        const res = await savePost(formData, { redirect: false })
        if (res?.error) {
          setAutosaveStatus('error')
        } else {
          setAutosaveStatus('saved')
          setTimeout(() => setAutosaveStatus('idle'), 3000)
        }
      } catch {
        setAutosaveStatus('error')
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [content])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set('content', content)

    const action = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value')
    if (action === 'publish') {
      formData.set('published', 'true')
    } else if (action === 'draft') {
      formData.set('published', 'false')
    } else if (action === 'unpublish') {
      formData.set('published', 'false')
    }

    try {
      const res = await savePost(formData, { redirect: action === 'publish' })
      if (res?.error) {
        setError(res.error)
        toast(res.error, 'error')
      } else {
        const msg = action === 'publish' ? 'Post published!' : action === 'unpublish' ? 'Post unpublished.' : 'Draft saved.'
        toast(msg, 'success')
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
        setError(err.message)
        toast(err.message, 'error')
      } else if (!(err instanceof Error)) {
        setError('An unexpected error occurred.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = useCallback(async () => {
    if (!post?.id) return
    setDeleteLoading(true)
    try {
      await deletePost(post.id)
      toast('Post deleted.', 'success')
    } catch {
      toast('Failed to delete post.', 'error')
      setDeleteLoading(false)
      setShowDeleteDialog(false)
    }
  }, [post?.id, toast])

  const renderAutosaveIndicator = () => {
    if (autosaveStatus === 'idle') return null
    const statusMap = {
      saving: { className: 'autosave-indicator autosave-indicator--saving', label: 'Saving...' },
      saved: { className: 'autosave-indicator autosave-indicator--saved', label: 'All changes saved' },
      error: { className: 'autosave-indicator autosave-indicator--error', label: 'Auto-save failed' },
    }
    const s = statusMap[autosaveStatus]
    return (
      <span className={s.className} aria-live="polite">
        {autosaveStatus === 'saving' && <span className="autosave-spinner" />}
        {autosaveStatus === 'saved' && <span style={{ fontSize: '0.9rem' }}>{'\u2713'}</span>}
        {autosaveStatus === 'error' && <span style={{ fontSize: '0.9rem' }}>{'\u2717'}</span>}
        {s.label}
      </span>
    )
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <form ref={formRef} onSubmit={readOnly ? (e) => e.preventDefault() : handleSubmit} className="fade-in-up glass" style={{ display: 'flex', flexDirection: 'column', padding: '2rem' }}>
        {post && <input type="hidden" name="id" value={post.id} />}

        {readOnly && (
          <div style={{
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid #6366f1',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}>
            <div>
              <strong style={{ color: '#6366f1', fontSize: '0.9rem' }}>Synced from Craft.do</strong>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                This post is managed by Craft. Editing is disabled. Unlink to enable editing (sync will stop for this post).
              </p>
            </div>
            <button
              type="button"
              onClick={handleUnlink}
              disabled={unlinkLoading}
              className="btn"
              style={{ background: '#6366f1', color: 'white', border: 'none', whiteSpace: 'nowrap' }}
            >
              {unlinkLoading ? 'Unlinking...' : 'Unlink from Craft'}
            </button>
          </div>
        )}

        <div className="editor-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/admin/dashboard" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }} aria-label="Back to dashboard">
              {'\u2190'} Back
            </Link>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>
              {post?.title ? post.title : post?.published ? 'Editing Published Post' : 'New Post'}
            </h1>
            {!readOnly && renderAutosaveIndicator()}
          </div>
          {!readOnly && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="btn"
                style={{ background: showAdvanced ? 'var(--border-color)' : 'transparent', border: '1px solid var(--border-color)' }}
                aria-expanded={showAdvanced}
                aria-controls="advanced-settings"
              >
                Settings
              </button>

              <button
                type="submit"
                name="action"
                value={post?.published ? 'unpublish' : 'draft'}
                disabled={loading}
                className="btn"
                style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: 'none' }}
              >
                {loading ? 'Saving...' : post?.published ? 'Unpublish' : 'Save Draft'}
              </button>
              <button
                type="submit"
                name="action"
                value="publish"
                disabled={loading}
                className="btn btn-primary"
                style={{ background: '#10b981', color: 'white' }}
              >
                {loading ? 'Publishing...' : 'Publish'}
              </button>
              {post && (
                <button
                  type="button"
                  onClick={() => setShowDeleteDialog(true)}
                  className="btn"
                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none' }}
                  aria-label="Delete this post"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div role="alert" style={{ color: '#ef4444', marginBottom: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
          <input
            type="text"
            name="title"
            placeholder="Start with a brilliant title..."
            required
            defaultValue={post?.title}
            readOnly={readOnly}
            aria-label="Post title"
            style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              padding: '0.5rem 0',
              outline: 'none',
              letterSpacing: '-0.5px',
              opacity: readOnly ? 0.7 : 1,
            }}
          />

          {showAdvanced && !readOnly && (
            <div id="advanced-settings" className="fade-in-up" style={{
              background: 'var(--bg-color-secondary)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', letterSpacing: '0.02em', fontWeight: 500 }}>Advanced Settings</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="slug-input" style={{ fontWeight: 500, fontSize: '0.875rem' }}>Custom URL Slug</label>
                <input
                  id="slug-input"
                  type="text"
                  name="slug"
                  placeholder="Leave blank to auto-generate from title"
                  defaultValue={post?.slug}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="language-input" style={{ fontWeight: 500, fontSize: '0.875rem' }}>Language</label>
                <input
                  id="language-input"
                  type="text"
                  name="language"
                  placeholder="e.g., en, es, fr"
                  defaultValue={(post as any)?.language || 'en'}
                  className="input-field"
                  pattern="[a-zA-Z]{2}(-[a-zA-Z]{2})?"
                  title="ISO 639-1 Language Code (e.g., en, es, fr, zh-CN)"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>Post Tags</label>
                <TagSelector availableTags={availableTags} initialTags={initialTags} />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                <input type="checkbox" name="isFeatured" value="true" defaultChecked={post?.isFeatured} style={{ transform: 'scale(1.2)' }} />
                Mark as Featured Post
              </label>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Featured posts appear prominently on the homepage. The post must be published to be visible.
              </p>
            </div>
          )}

          <TipTapEditor
            initialContent={post?.content || ''}
            onChange={readOnly ? () => {} : setContent}
            editable={!readOnly}
          />
        </div>
      </form>

      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete this post?"
        message="This action cannot be undone. The post and all its associated data will be permanently removed."
        confirmLabel="Delete permanently"
        cancelLabel="Keep post"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  )
}
