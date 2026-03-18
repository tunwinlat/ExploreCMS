/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { savePost, deletePost } from './postActions'
import { unlinkCraftPost } from './integrations/craftActions'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TipTapEditor from '@/components/editor/TipTapEditor'
import TagSelector from '@/components/editor/TagSelector'
import { Post } from '@prisma/client'
import { useToast } from '@/components/admin/Toast'
import ConfirmDialog from '@/components/admin/ConfirmDialog'

type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// Common languages for the translation picker
const COMMON_LANGUAGES: { code: string; name: string }[] = [
  { code: 'af', name: 'Afrikaans' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'cs', name: 'Czech' },
  { code: 'da', name: 'Danish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'en', name: 'English' },
  { code: 'fi', name: 'Finnish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'el', name: 'Greek' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'id', name: 'Indonesian' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ms', name: 'Malay' },
  { code: 'no', name: 'Norwegian' },
  { code: 'fa', name: 'Persian' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian' },
  { code: 'es', name: 'Spanish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'th', name: 'Thai' },
  { code: 'tr', name: 'Turkish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ur', name: 'Urdu' },
  { code: 'vi', name: 'Vietnamese' },
]

export default function PostEditor({
  post,
  availableTags = [],
  readOnly = false,
  craftPostId,
  siblingTranslations = [],
  initialTranslationGroupId,
  parentPostTitle,
  initialLanguage,
}: {
  post?: Post & {
    tags?: {name: string, slug: string}[]
    isFeatured?: boolean
  }
  availableTags?: {name: string, slug: string}[]
  readOnly?: boolean
  craftPostId?: string
  siblingTranslations?: { id: string, language: string, title: string, slug: string }[]
  initialTranslationGroupId?: string
  parentPostTitle?: string
  initialLanguage?: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState(post?.content || '')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [unlinkLoading, setUnlinkLoading] = useState(false)
  const [showAddTranslation, setShowAddTranslation] = useState(false)
  const [selectedLang, setSelectedLang] = useState('')
  const [langFilter, setLangFilter] = useState('')
  const initialTags = post?.tags?.map(t => t.name) || []

  const formRef = useRef<HTMLFormElement>(null)
  const { toast } = useToast()
  const router = useRouter()

  const isTranslationPost = !!(post as any)?.translationGroupId && (post as any)?.translationGroupId !== post?.id
  const currentLanguage: string = (post as any)?.language || initialLanguage || 'en'
  const translationGroupId: string = (post as any)?.translationGroupId || initialTranslationGroupId || ''

  // Languages already used in this translation group (can't add duplicates)
  const usedLanguages = new Set([
    currentLanguage,
    ...siblingTranslations.map(t => t.language),
  ])

  const availableLanguages = COMMON_LANGUAGES.filter(l => !usedLanguages.has(l.code))

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

  const handleAddTranslation = useCallback(() => {
    if (!selectedLang) {
      toast('Please select a language first.', 'error')
      return
    }
    const groupId = translationGroupId || post?.id
    router.push(`/admin/dashboard/new?translationGroupId=${groupId}&lang=${selectedLang}`)
  }, [selectedLang, translationGroupId, post?.id, router, toast])

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
        <input type="hidden" name="translationGroupId" value={translationGroupId} />

        {/* New-translation context banner */}
        {!post && initialTranslationGroupId && (
          <div style={{
            padding: '0.875rem 1.25rem',
            marginBottom: '1.5rem',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid #10b981',
            borderRadius: 'var(--radius-md)',
          }}>
            <strong style={{ color: '#10b981', fontSize: '0.9rem' }}>Adding a Translation</strong>
            {parentPostTitle && (
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                For: <strong style={{ color: 'var(--text-primary)' }}>{parentPostTitle}</strong>
              </p>
            )}
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Set the language below, then write the translated title and content.
            </p>
          </div>
        )}

        {/* Translation variant banner (when editing a non-primary post) */}
        {post && isTranslationPost && (
          <div style={{
            padding: '0.75rem 1.25rem',
            marginBottom: '1.5rem',
            background: 'rgba(99, 102, 241, 0.07)',
            border: '1px solid rgba(99,102,241,0.35)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              This is a <strong style={{ color: '#6366f1' }}>{currentLanguage.toUpperCase()}</strong> translation of a post.
            </span>
            {siblingTranslations.length > 0 && siblingTranslations.map(t => (
              <Link key={t.id} href={`/admin/dashboard/edit/${t.id}`}
                style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                {t.language.toUpperCase()} version
              </Link>
            ))}
          </div>
        )}

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
          {/* Title row with inline language badge */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <input
              type="text"
              name="title"
              placeholder="Start with a brilliant title..."
              required
              defaultValue={post?.title ?? parentPostTitle ?? ''}
              readOnly={readOnly}
              aria-label="Post title"
              style={{
                flex: 1,
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
            {/* Inline language selector — always visible */}
            {!readOnly && (
              <div style={{ flexShrink: 0, paddingTop: '0.6rem' }}>
                <select
                  name="language"
                  defaultValue={currentLanguage}
                  title="Post language"
                  aria-label="Post language"
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    background: 'var(--bg-color-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    padding: '0.3rem 0.5rem',
                    cursor: 'pointer',
                  }}
                >
                  {COMMON_LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.code.toUpperCase()} — {l.name}</option>
                  ))}
                  {/* Fallback option for codes not in our list */}
                  {!COMMON_LANGUAGES.some(l => l.code === currentLanguage) && (
                    <option value={currentLanguage}>{currentLanguage.toUpperCase()}</option>
                  )}
                </select>
              </div>
            )}
            {readOnly && currentLanguage && (
              <span style={{
                flexShrink: 0,
                paddingTop: '0.6rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                background: 'var(--bg-color-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.3rem 0.5rem',
              }}>
                {currentLanguage.toUpperCase()}
              </span>
            )}
          </div>

          {showAdvanced && !readOnly && (
            <div id="advanced-settings" className="fade-in-up" style={{
              background: 'var(--bg-color-secondary)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
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
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Changing the slug will break existing links to this post.
                </p>
              </div>
            </div>
          )}

          <TipTapEditor
            initialContent={post?.content || ''}
            onChange={readOnly ? () => {} : setContent}
            editable={!readOnly}
          />
        </div>

        {/* ── Translations panel — always visible when post exists ── */}
        {post && !readOnly && (
          <div style={{
            marginTop: '2rem',
            padding: '1.25rem 1.5rem',
            background: 'var(--bg-color-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
                  <path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/>
                  <path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>
                </svg>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Translations</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0 0.4rem' }}>
                  {currentLanguage.toUpperCase()} (this post)
                </span>
              </div>

              {!showAddTranslation && (
                <button
                  type="button"
                  onClick={() => setShowAddTranslation(true)}
                  className="btn"
                  style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', border: '1px solid var(--border-color)', background: 'transparent' }}
                >
                  <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> Add Translation
                </button>
              )}
            </div>

            {/* Existing translations */}
            {siblingTranslations.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: showAddTranslation ? '1rem' : 0 }}>
                {siblingTranslations.map(t => (
                  <Link
                    key={t.id}
                    href={`/admin/dashboard/edit/${t.id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.35rem 0.75rem',
                      background: 'var(--bg-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                    }}
                    className="post-tag"
                  >
                    <span style={{ fontWeight: 700, color: 'var(--accent-color)' }}>{t.language.toUpperCase()}</span>
                    {t.title}
                  </Link>
                ))}
              </div>
            ) : (
              !showAddTranslation && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  No translations yet. Readers will only see this post in <strong>{currentLanguage.toUpperCase()}</strong>.
                </p>
              )
            )}

            {/* Inline add-translation form */}
            {showAddTranslation && (
              <div className="fade-in-up" style={{
                padding: '1rem',
                background: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}>
                {/* Filter input */}
                <input
                  type="text"
                  placeholder="Search language..."
                  value={langFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLangFilter(e.target.value)}
                  autoFocus
                  className="input-field"
                  style={{ fontSize: '0.875rem' }}
                  aria-label="Filter languages"
                />

                {/* Scrollable language list */}
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-color-secondary)',
                }}>
                  {availableLanguages
                    .filter(l =>
                      !langFilter ||
                      l.name.toLowerCase().includes(langFilter.toLowerCase()) ||
                      l.code.toLowerCase().includes(langFilter.toLowerCase())
                    )
                    .map(l => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => setSelectedLang(l.code)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          background: selectedLang === l.code ? 'rgba(16,185,129,0.12)' : 'transparent',
                          border: 'none',
                          borderBottom: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          color: selectedLang === l.code ? '#10b981' : 'var(--text-primary)',
                          fontWeight: selectedLang === l.code ? 600 : 400,
                          fontSize: '0.875rem',
                        }}
                      >
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', minWidth: '2.5rem' }}>{l.code.toUpperCase()}</span>
                        {l.name}
                        {selectedLang === l.code && <span style={{ marginLeft: 'auto', fontSize: '0.85rem' }}>✓</span>}
                      </button>
                    ))
                  }
                  {availableLanguages.filter(l =>
                    !langFilter ||
                    l.name.toLowerCase().includes(langFilter.toLowerCase()) ||
                    l.code.toLowerCase().includes(langFilter.toLowerCase())
                  ).length === 0 && (
                    <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      No languages match "{langFilter}"
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleAddTranslation}
                    disabled={!selectedLang}
                    className="btn btn-primary"
                    style={{ background: '#10b981', color: 'white', opacity: selectedLang ? 1 : 0.5 }}
                  >
                    {selectedLang
                      ? `Create ${COMMON_LANGUAGES.find(l => l.code === selectedLang)?.name ?? selectedLang.toUpperCase()} Translation`
                      : 'Select a language above'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddTranslation(false); setSelectedLang(''); setLangFilter('') }}
                    className="btn"
                    style={{ background: 'transparent', border: '1px solid var(--border-color)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tags panel — always visible (moved out of Settings) */}
        {!readOnly && (
          <div style={{
            marginTop: '1rem',
            padding: '1.25rem 1.5rem',
            background: 'var(--bg-color-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Tags &amp; Options</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <input type="checkbox" name="isFeatured" value="true" defaultChecked={post?.isFeatured} style={{ transform: 'scale(1.1)' }} />
                Featured post
              </label>
            </div>
            <TagSelector availableTags={availableTags} initialTags={initialTags} />
          </div>
        )}
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
