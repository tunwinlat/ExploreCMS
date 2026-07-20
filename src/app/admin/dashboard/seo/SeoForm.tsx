/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import { updateSeoSettings } from './seoActions'
import { ExpandableSection } from '../settings/SettingsForm'
import { useToast } from '@/components/admin/Toast'

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        width: '52px',
        height: '28px',
        borderRadius: '14px',
        border: 'none',
        background: checked ? 'var(--accent-color)' : 'var(--border-color)',
        cursor: 'pointer',
        transition: 'background var(--transition-fast)',
        flexShrink: 0
      }}
      aria-checked={checked}
      role="switch"
    >
      <span style={{
        position: 'absolute',
        top: '3px',
        left: checked ? '27px' : '3px',
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        background: 'white',
        transition: 'left var(--transition-fast)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }} />
    </button>
  )
}

export default function SeoForm({ initialSettings }: { initialSettings: any }) {
  const [seoSiteUrl, setSeoSiteUrl] = useState(initialSettings?.seoSiteUrl || '')
  const [seoDescription, setSeoDescription] = useState(initialSettings?.seoDescription || '')
  const [seoOgImageUrl, setSeoOgImageUrl] = useState(initialSettings?.seoOgImageUrl || '')
  const [seoTwitterHandle, setSeoTwitterHandle] = useState(initialSettings?.seoTwitterHandle || '')
  const [seoRobotsIndex, setSeoRobotsIndex] = useState(initialSettings?.seoRobotsIndex ?? true)
  const [seoGoogleVerification, setSeoGoogleVerification] = useState(initialSettings?.seoGoogleVerification || '')
  const [seoBingVerification, setSeoBingVerification] = useState(initialSettings?.seoBingVerification || '')
  const [seoLlmsTxtEnabled, setSeoLlmsTxtEnabled] = useState(initialSettings?.seoLlmsTxtEnabled ?? true)

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        setSeoOgImageUrl(data.url)
        toast('Share image uploaded.', 'success')
      } else {
        toast('Failed to upload share image.', 'error')
      }
    } catch {
      toast('An error occurred during upload.', 'error')
    }
    setUploading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const res = await updateSeoSettings({
      seoSiteUrl,
      seoDescription,
      seoOgImageUrl,
      seoTwitterHandle,
      seoRobotsIndex,
      seoGoogleVerification,
      seoBingVerification,
      seoLlmsTxtEnabled,
    })
    if (res.success) {
      toast('SEO settings saved! Reloading...', 'success')
      setTimeout(() => window.location.reload(), 1000)
    } else {
      toast(res.error || 'Failed to update SEO settings.', 'error')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      <ExpandableSection title="General" icon="🔍" defaultExpanded={true}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label htmlFor="seoSiteUrl" style={{ fontWeight: 400 }}>Site URL</label>
            <input
              id="seoSiteUrl"
              type="text"
              value={seoSiteUrl}
              onChange={(e) => setSeoSiteUrl(e.target.value)}
              placeholder="https://example.com"
              className="input-field"
            />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              The canonical public URL of your site. Required for the sitemap, canonical links, og:url and /llms.txt.
            </p>
          </div>

          <div>
            <label htmlFor="seoDescription" style={{ fontWeight: 400 }}>Default Meta Description</label>
            <textarea
              id="seoDescription"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="A short summary of your site shown in search results..."
              rows={3}
              className="input-field"
              style={{ resize: 'vertical' }}
            />
            <p style={{ color: seoDescription.length > 160 ? 'var(--accent-color)' : 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              {seoDescription.length}/160 characters. Used site-wide when a page has no description of its own. Falls back to the header description when empty.
            </p>
          </div>
        </div>
      </ExpandableSection>

      <ExpandableSection title="Social Sharing" icon="🔗">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ fontWeight: 400 }}>Default Share Image (Open Graph)</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
              {seoOgImageUrl && (
                <img src={seoOgImageUrl} alt="Share image preview" style={{ width: '120px', height: '63px', objectFit: 'cover', borderRadius: '8px', background: 'var(--bg-color)', padding: '2px' }} />
              )}
              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                  id="og-image-upload"
                />
                <label
                  htmlFor="og-image-upload"
                  className="btn"
                  style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'inline-block', fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                >
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </label>
              </div>
            </div>
            <input
              type="text"
              value={seoOgImageUrl}
              onChange={(e) => setSeoOgImageUrl(e.target.value)}
              placeholder="https://... or /uploads/..."
              className="input-field"
              style={{ marginTop: '0.5rem' }}
            />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Recommended size 1200×630. Shown when a page has no image of its own; a branded card is auto-generated when this is empty.
            </p>
          </div>

          <div>
            <label htmlFor="seoTwitterHandle" style={{ fontWeight: 400 }}>Twitter / X Handle</label>
            <input
              id="seoTwitterHandle"
              type="text"
              value={seoTwitterHandle}
              onChange={(e) => setSeoTwitterHandle(e.target.value)}
              placeholder="@yoursite"
              className="input-field"
            />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Set as twitter:site on every page.
            </p>
          </div>
        </div>
      </ExpandableSection>

      <ExpandableSection title="Indexing & Verification" icon="📈">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <label style={{ fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Allow Search Engine Indexing</label>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                When off, every page is served with noindex and robots.txt blocks all crawlers.
              </p>
            </div>
            <Toggle checked={seoRobotsIndex} onChange={setSeoRobotsIndex} />
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <label htmlFor="seoGoogleVerification" style={{ fontWeight: 400 }}>Google Search Console Verification</label>
            <input
              id="seoGoogleVerification"
              type="text"
              value={seoGoogleVerification}
              onChange={(e) => setSeoGoogleVerification(e.target.value)}
              placeholder="Verification token (content attribute)"
              className="input-field"
            />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              From Search Console → Settings → Ownership verification → HTML tag. Paste only the token, not the full meta tag.
            </p>
          </div>

          <div>
            <label htmlFor="seoBingVerification" style={{ fontWeight: 400 }}>Bing Webmaster Verification</label>
            <input
              id="seoBingVerification"
              type="text"
              value={seoBingVerification}
              onChange={(e) => setSeoBingVerification(e.target.value)}
              placeholder="msvalidate.01 token"
              className="input-field"
            />
          </div>
        </div>
      </ExpandableSection>

      <ExpandableSection title="AI Search" icon="🤖">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <label style={{ fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Serve /llms.txt</label>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              A Markdown map of your content for AI assistants (llmstxt.org convention). Requires a Site URL.
              {' '}<a href="/llms.txt" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-color)' }}>Preview</a>
            </p>
          </div>
          <Toggle checked={seoLlmsTxtEnabled} onChange={setSeoLlmsTxtEnabled} />
        </div>
      </ExpandableSection>

      <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '0.5rem', padding: '0.75rem', fontSize: '1rem' }}>
        {loading ? 'Saving...' : 'Save SEO Settings'}
      </button>
    </form>
  )
}
