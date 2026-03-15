/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useTransition } from 'react'
import { updateComponentConfig } from './componentActions'
import { COMPONENTS, type ComponentId } from '@/lib/components-config'
import { useToast } from '@/components/admin/Toast'

const COMPONENT_ICONS: Record<ComponentId, React.ReactNode> = {
  blog: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  ),
  projects: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="6" height="6" rx="1"/>
      <rect x="16" y="3" width="6" height="6" rx="1"/>
      <rect x="2" y="15" width="6" height="6" rx="1"/>
      <path d="M22 15H16a1 1 0 0 0-1 1v1"/>
      <path d="M19 18v3"/>
      <path d="M9 6h6"/>
      <path d="M9 18h3"/>
    </svg>
  ),
  photos: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  ),
}

interface ComponentsFormProps {
  initialEnabled: ComponentId[]
  initialDefault: ComponentId
}

export default function ComponentsForm({ initialEnabled, initialDefault }: ComponentsFormProps) {
  const { toast: showToast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [enabled, setEnabled] = useState<ComponentId[]>(initialEnabled)
  const [defaultComp, setDefaultComp] = useState<ComponentId>(initialDefault)

  function toggleComponent(id: ComponentId) {
    if (enabled.includes(id)) {
      // Disabling — need at least 1 remaining
      const next = enabled.filter(e => e !== id)
      if (next.length === 0) {
        showToast('At least one component must be enabled.', 'error')
        return
      }
      setEnabled(next)
      if (defaultComp === id) setDefaultComp(next[0])
    } else {
      setEnabled([...enabled, id])
    }
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateComponentConfig(enabled, defaultComp)
      if (result?.error) {
        showToast(result.error, 'error')
      } else {
        showToast('Component settings saved!', 'success')
      }
    })
  }

  const isOnlyEnabled = (id: ComponentId) => enabled.includes(id) && enabled.length === 1

  return (
    <div style={{ maxWidth: '680px' }}>
      {/* Info banner */}
      <div style={{
        padding: '1rem 1.25rem',
        borderRadius: '12px',
        background: 'color-mix(in srgb, var(--accent-color) 8%, transparent)',
        border: '1px solid color-mix(in srgb, var(--accent-color) 20%, transparent)',
        marginBottom: '2rem',
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--accent-color)' }}>Tip:</strong> Enable or disable sections of your site. When more than one component is enabled, visitors will see navigation tabs. Disabling a component hides it from the public but preserves all its data.
      </div>

      {/* Components grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        {COMPONENTS.map(comp => {
          const isEnabled = enabled.includes(comp.id)
          const isDefault = defaultComp === comp.id
          const isOnlyOne = isOnlyEnabled(comp.id)

          return (
            <div
              key={comp.id}
              style={{
                padding: '1.25rem',
                borderRadius: '14px',
                border: `1px solid ${isEnabled ? 'color-mix(in srgb, var(--accent-color) 35%, transparent)' : 'var(--border-color)'}`,
                background: isEnabled
                  ? 'color-mix(in srgb, var(--accent-color) 5%, transparent)'
                  : 'var(--bg-color-secondary, rgba(0,0,0,0.02))',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* Icon */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: isEnabled
                    ? 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))'
                    : 'var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isEnabled ? '#fff' : 'var(--text-secondary)',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}>
                  {COMPONENT_ICONS[comp.id]}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {comp.label}
                    </span>
                    {comp.id === 'blog' && (
                      <span style={{
                        padding: '0.1rem 0.5rem',
                        borderRadius: '20px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        background: 'var(--border-color)',
                        color: 'var(--text-secondary)',
                        letterSpacing: '0.04em',
                      }}>DEFAULT</span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {comp.description}
                  </p>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  {/* Set as default (only for enabled components) */}
                  {isEnabled && (
                    <button
                      type="button"
                      onClick={() => setDefaultComp(comp.id)}
                      disabled={isDefault}
                      title={isDefault ? 'This is the default' : 'Set as homepage default'}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        border: isDefault
                          ? '1px solid var(--accent-color)'
                          : '1px solid var(--border-color)',
                        background: isDefault
                          ? 'color-mix(in srgb, var(--accent-color) 12%, transparent)'
                          : 'transparent',
                        color: isDefault ? 'var(--accent-color)' : 'var(--text-secondary)',
                        cursor: isDefault ? 'default' : 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      {isDefault ? (
                        <>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                          Default
                        </>
                      ) : 'Set Default'}
                    </button>
                  )}

                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleComponent(comp.id)}
                    disabled={isOnlyOne}
                    title={isOnlyOne ? 'At least one component must be enabled' : isEnabled ? 'Disable component' : 'Enable component'}
                    style={{
                      position: 'relative',
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      border: 'none',
                      background: isEnabled ? 'var(--accent-color)' : 'var(--border-color)',
                      cursor: isOnlyOne ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s',
                      flexShrink: 0,
                      opacity: isOnlyOne ? 0.5 : 1,
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: '3px',
                      left: isEnabled ? '23px' : '3px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Status summary */}
      <div style={{
        padding: '1rem 1.25rem',
        borderRadius: '10px',
        background: 'var(--border-color)',
        marginBottom: '1.5rem',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
      }}>
        <strong style={{ color: 'var(--text-primary)' }}>{enabled.length}</strong> component{enabled.length !== 1 ? 's' : ''} enabled
        {enabled.length > 1 && (
          <> &mdash; <strong style={{ color: 'var(--accent-color)' }}>{COMPONENTS.find(c => c.id === defaultComp)?.label}</strong> is the homepage default</>
        )}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        style={{
          padding: '0.75rem 2rem',
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
        {isPending ? 'Saving…' : 'Save Component Settings'}
      </button>
    </div>
  )
}
