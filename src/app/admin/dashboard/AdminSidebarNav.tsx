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
          borderRadius: 'var(--radius-md)', 
          background: isActive ? 'var(--border-color)' : 'transparent', 
          fontWeight: isActive ? 600 : 500, 
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontSize: '0.9rem',
          transition: 'all var(--transition-fast)'
        }}
      >
        {label}
      </Link>
    )
  }

  const navSection = (title: string) => (
    <div style={{ 
      marginTop: '0.75rem', 
      marginBottom: '0.25rem', 
      paddingLeft: '0.5rem', 
      fontSize: '0.75rem', 
      fontWeight: 700, 
      color: 'var(--text-secondary)', 
      textTransform: 'uppercase', 
      letterSpacing: '0.5px',
      opacity: 0.7
    }}>
      {title}
    </div>
  )

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
      {navItem('/admin/dashboard', 'Dashboard')}
      
      {navSection('Content')}
      {navItem('/admin/dashboard/posts/drafts', 'Drafts')}
      {navItem('/admin/dashboard/posts/published', 'Published')}
      {navItem('/admin/dashboard/new', 'New Post')}
      
      {navSection('Account')}
      {navItem('/admin/dashboard/profile', 'My Profile')}
      
      {role === 'OWNER' && (
        <>
          {navSection('Management')}
          {navItem('/admin/dashboard/users', 'Manage Users')}
          {navItem('/admin/dashboard/tags', 'Manage Tags')}
          {navItem('/admin/dashboard/navigation', 'Nav Builder')}
          {navItem('/admin/dashboard/settings', 'Site Settings')}
        </>
      )}
    </nav>
  )
}
