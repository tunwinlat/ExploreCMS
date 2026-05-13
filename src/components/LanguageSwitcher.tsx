/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import iso6391 from 'iso-639-1'

type Translation = {
  language: string
  slug: string
}

export function LanguageSwitcher({ 
  currentLanguage, 
  translations,
  compact = false
}: { 
  currentLanguage: string
  translations: Translation[]
  compact?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  const router = useRouter()

  if (!translations || translations.length === 0) {
    return null
  }

  // Include current language in the list, then sort
  const allLanguages = [
    { language: currentLanguage, slug: '#', isCurrent: true },
    ...translations.map(t => ({ ...t, isCurrent: false }))
  ].sort((a, b) => a.language.localeCompare(b.language))

  const handleLanguageClick = (slug: string, language: string) => {
    if (slug === '#') return
    
    setNavigatingTo(language)
    setIsOpen(false)
    
    // Use startTransition for smoother UI updates
    startTransition(() => {
      router.push(`/post/${slug}`)
    })
  }

  // Prefetch on hover
  const handleMouseEnter = (slug: string) => {
    if (slug !== '#') {
      router.prefetch(`/post/${slug}`)
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        style={{
          background: compact ? 'transparent' : 'var(--bg-color)',
          color: 'var(--text-secondary)',
          padding: compact ? '0.5rem' : '0.4rem 0.8rem',
          borderRadius: compact ? '50%' : '20px',
          fontSize: '0.85rem',
          transition: 'all 0.2s ease',
          border: '1px solid var(--border-color)',
          cursor: isPending ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          opacity: isPending ? 0.7 : 1,
          width: compact ? '36px' : 'auto',
          height: compact ? '36px' : 'auto',
          justifyContent: 'center'
        }}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={isOpen ? "language-switcher-menu" : undefined}
        aria-label={compact ? 'Switch language' : 'Available in multiple languages'}
        title={compact ? 'Switch language' : 'Available in multiple languages'}
      >
        {isPending ? (
          <span 
            className="spinner"
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid var(--border-color)',
              borderTopColor: 'var(--text-primary)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}
          />
        ) : (
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
            <path d="M2 12h20"/>
          </svg>
        )}
        {!compact && (isPending ? 'Switching...' : 'Available in multiple languages')}
      </button>

      {isOpen && (
        <>
          <div 
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 9
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            id="language-switcher-menu"
            role="menu"
            style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-color-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            minWidth: '150px',
            zIndex: 10,
            overflow: 'hidden'
          }}>
            {allLanguages.map((lang) => {
              const langName = iso6391.getNativeName(lang.language) || lang.language.toUpperCase()
              const isNavigating = navigatingTo === lang.language && isPending
              
              if (lang.isCurrent) {
                return (
                  <div 
                    key={lang.language}
                    role="menuitem"
                    style={{
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      background: 'rgba(99, 102, 241, 0.1)',
                      borderLeft: '2px solid #6366f1',
                    }}
                  >
                    <span>{langName}</span>
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                )
              }
              
              return (
                <button
                  key={lang.language}
                  role="menuitem"
                  onClick={() => handleLanguageClick(lang.slug, lang.language)}
                  onMouseEnter={() => handleMouseEnter(lang.slug)}
                  disabled={isPending}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    border: 'none',
                    borderLeft: '2px solid transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem',
                    textAlign: 'left',
                    cursor: isPending ? 'wait' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: isNavigating ? 0.6 : 1
                  }}
                  className="lang-select-item"
                >
                  <span>{langName}</span>
                  {isNavigating && (
                    <span 
                      className="spinner"
                      style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid var(--border-color)',
                        borderTopColor: 'var(--text-primary)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        .lang-select-item:hover {
          background: var(--bg-color);
          color: var(--text-primary) !important;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  )
}
