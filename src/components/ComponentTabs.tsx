/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentId, ComponentMeta } from '@/lib/components-config'

// SVG icons per component
function BlogIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  )
}

function ProjectsIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="6" height="6" rx="1"/>
      <rect x="16" y="3" width="6" height="6" rx="1"/>
      <rect x="2" y="15" width="6" height="6" rx="1"/>
      <path d="M22 15H16a1 1 0 0 0-1 1v1"/>
      <path d="M19 18v3"/>
      <path d="M9 6h6"/>
      <path d="M9 18h3"/>
    </svg>
  )
}

function PhotosIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function getIcon(id: ComponentId) {
  if (id === 'blog') return <BlogIcon />
  if (id === 'projects') return <ProjectsIcon />
  return <PhotosIcon />
}

interface ComponentTabsProps {
  enabledComponents: ComponentMeta[]
  defaultComponent: ComponentId
}

export function ComponentTabs({ enabledComponents, defaultComponent }: ComponentTabsProps) {
  const pathname = usePathname()

  function isActive(comp: ComponentMeta): boolean {
    if (pathname === '/') return comp.id === defaultComponent
    return pathname === comp.path || pathname.startsWith(comp.path + '/')
  }

  return (
    <div className="component-tabs-scroll">
    <div className="component-tabs" style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      padding: '0.25rem',
      background: 'var(--bg-color-secondary, rgba(0,0,0,0.05))',
      borderRadius: '14px',
      border: '1px solid var(--border-color)',
      minWidth: 'max-content',
    }}>
      {enabledComponents.map(comp => {
        const active = isActive(comp)
        return (
          <Link
            key={comp.id}
            href={comp.id === defaultComponent ? '/' : comp.path}
            prefetch={true}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 1rem',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: active ? 600 : 400,
              color: active ? 'var(--accent-color)' : 'var(--text-secondary)',
              background: active
                ? 'linear-gradient(135deg, color-mix(in srgb, var(--accent-color) 12%, transparent), color-mix(in srgb, var(--accent-hover) 8%, transparent))'
                : 'transparent',
              border: active ? '1px solid color-mix(in srgb, var(--accent-color) 25%, transparent)' : '1px solid transparent',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              textDecoration: 'none',
            }}
          >
            <span style={{ opacity: active ? 1 : 0.6 }}>{getIcon(comp.id)}</span>
            {comp.label}
          </Link>
        )
      })}
    </div>
    </div>
  )
}
