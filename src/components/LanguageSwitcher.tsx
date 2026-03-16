'use client'

import { useState } from 'react'
import Link from 'next/link'
import iso6391 from 'iso-639-1'

type Translation = {
  language: string
  slug: string
}

export function LanguageSwitcher({ 
  currentLanguage, 
  translations 
}: { 
  currentLanguage: string
  translations: Translation[] 
}) {
  const [isOpen, setIsOpen] = useState(false)

  if (!translations || translations.length === 0) {
    return null
  }

  // Include current language in the list, then sort
  const allLanguages = [
    { language: currentLanguage, slug: '#', isCurrent: true },
    ...translations.map(t => ({ ...t, isCurrent: false }))
  ].sort((a, b) => a.language.localeCompare(b.language))

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'var(--bg-color)',
          color: 'var(--text-secondary)',
          padding: '0.4rem 0.8rem',
          borderRadius: '20px',
          fontSize: '0.85rem',
          transition: 'all 0.2s ease',
          border: '1px solid var(--border-color)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
        aria-expanded={isOpen}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 8 6 6" />
          <path d="m4 14 6-6 2-3" />
          <path d="M2 5h12" />
          <path d="M7 2h1" />
          <path d="m22 22-5-10-5 10" />
          <path d="M14 18h6" />
        </svg>
        Available in multiple languages
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
          <div style={{
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
              
              if (lang.isCurrent) {
                return (
                  <div 
                    key={lang.language}
                    style={{
                      padding: '0.75rem 1rem',
                      display: 'block',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      background: 'rgba(99, 102, 241, 0.1)',
                      borderLeft: '2px solid #6366f1',
                    }}
                  >
                    {langName}
                  </div>
                )
              }
              
              return (
                <Link 
                  key={lang.language}
                  href={`/post/${lang.slug}`}
                  style={{
                    padding: '0.75rem 1rem',
                    display: 'block',
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    borderLeft: '2px solid transparent',
                  }}
                  className="lang-select-item"
                >
                  {langName}
                </Link>
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
      `}} />
    </div>
  )
}
