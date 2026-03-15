/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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

  const navSection = (title: string) => (
    <div style={{
      marginTop: '1.25rem',
      marginBottom: '0.375rem',
      paddingLeft: '0.75rem',
      fontSize: '0.7rem',
      fontWeight: 500,
      color: 'var(--text-secondary)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      opacity: 0.6,
    }}>
      {title}
    </div>
  )

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', flex: 1 }}>
      {navItem('/admin/dashboard', 'Dashboard')}

      {navSection('Blog')}
      {navItem('/admin/dashboard/posts/drafts', 'Drafts')}
      {navItem('/admin/dashboard/posts/published', 'Published')}
      {navItem('/admin/dashboard/new', 'New Post')}

      {navSection('Projects')}
      {navItem('/admin/dashboard/projects', 'All Projects')}
      {navItem('/admin/dashboard/projects/new', 'New Project')}

      {navSection('Photos')}
      {navItem('/admin/dashboard/photos', 'Albums')}
      {navItem('/admin/dashboard/photos/new-album', 'New Album')}

      {navSection('Account')}
      {navItem('/admin/dashboard/profile', 'My Profile')}

      {role === 'OWNER' && (
        <>
          {navSection('Management')}
          {navItem('/admin/dashboard/users', 'Manage Users')}
          {navItem('/admin/dashboard/tags', 'Manage Tags')}
          {navItem('/admin/dashboard/navigation', 'Nav Builder')}
          {navItem('/admin/dashboard/popup', 'Popup Toast')}
          {navItem('/admin/dashboard/components', 'Components')}
          {navItem('/admin/dashboard/settings', 'Site Settings')}
        </>
      )}
    </nav>
  )
}
