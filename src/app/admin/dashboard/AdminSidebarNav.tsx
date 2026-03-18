/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavGroupProps {
  title: string
  children: React.ReactNode
  isActive: boolean
}

function NavGroup({ title, children, isActive }: NavGroupProps) {
  const [isOpen, setIsOpen] = useState(isActive)

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          padding: '0.5rem 0.75rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.7rem',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          opacity: 0.8,
          transition: 'all var(--transition-fast)',
          borderRadius: '8px',
        }}
        className="nav-group-btn"
        aria-expanded={isOpen}
      >
        <span>{title}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease-in-out'
          }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <style>{`
        .nav-group-btn:hover {
          background: var(--bg-color-secondary);
          opacity: 1 !important;
        }
        .nav-group-content {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.3s ease-in-out;
        }
        .nav-group-content.open {
          grid-template-rows: 1fr;
        }
        .nav-group-inner {
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          padding-top: 0.25rem;
        }
      `}</style>

      <div className={`nav-group-content ${isOpen ? 'open' : ''}`}>
        <div className="nav-group-inner">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function AdminSidebarNav({ role }: { role: string }) {
  const pathname = usePathname()

  const navItem = (href: string, label: string) => {
    const isActive = href === '/admin/dashboard'
      ? pathname === href
      : pathname.startsWith(href)

    return (
      <Link
        href={href}
        prefetch={false}
        style={{
          padding: '0.5rem 0.75rem',
          borderRadius: '8px',
          background: isActive ? 'var(--border-color)' : 'transparent',
          fontWeight: isActive ? 500 : 400,
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontSize: '0.875rem',
          transition: 'all var(--transition-fast)',
        }}
      >
        {label}
      </Link>
    )
  }

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', flex: 1 }}>
      {navItem('/admin/dashboard', 'Dashboard')}

      <NavGroup
        title="Blog"
        isActive={pathname.startsWith('/admin/dashboard/posts') || pathname === '/admin/dashboard/new'}
      >
        {navItem('/admin/dashboard/posts/drafts', 'Drafts')}
        {navItem('/admin/dashboard/posts/published', 'Published')}
        {navItem('/admin/dashboard/new', 'New Post')}
      </NavGroup>

      <NavGroup
        title="Projects"
        isActive={pathname.startsWith('/admin/dashboard/projects')}
      >
        {navItem('/admin/dashboard/projects', 'All Projects')}
        {navItem('/admin/dashboard/projects/new', 'New Project')}
      </NavGroup>

      <NavGroup
        title="Photos"
        isActive={pathname.startsWith('/admin/dashboard/photos')}
      >
        {navItem('/admin/dashboard/photos', 'Albums')}
        {navItem('/admin/dashboard/photos/new-album', 'New Album')}
      </NavGroup>

      <NavGroup
        title="Account"
        isActive={pathname.startsWith('/admin/dashboard/profile')}
      >
        {navItem('/admin/dashboard/profile', 'My Profile')}
      </NavGroup>

      {role === 'OWNER' && (
        <NavGroup
          title="Management"
          isActive={
            pathname.startsWith('/admin/dashboard/users') ||
            pathname.startsWith('/admin/dashboard/tags') ||
            pathname.startsWith('/admin/dashboard/navigation') ||
            pathname.startsWith('/admin/dashboard/popup') ||
            pathname.startsWith('/admin/dashboard/components') ||
            pathname.startsWith('/admin/dashboard/integrations') ||
            pathname.startsWith('/admin/dashboard/settings')
          }
        >
          {navItem('/admin/dashboard/users', 'Manage Users')}
          {navItem('/admin/dashboard/tags', 'Manage Tags')}
          {navItem('/admin/dashboard/navigation', 'Nav Builder')}
          {navItem('/admin/dashboard/popup', 'Popup Toast')}
          {navItem('/admin/dashboard/components', 'Components')}
          {navItem('/admin/dashboard/integrations', 'Integrations')}
          {navItem('/admin/dashboard/settings', 'Site Settings')}
        </NavGroup>
      )}
    </nav>
  )
}
