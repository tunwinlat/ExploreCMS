/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import AdminSidebarNav from '@/app/admin/dashboard/AdminSidebarNav'
import LogoutButton from '@/app/admin/dashboard/LogoutButton'
import { ThemeToggle } from '@/components/ThemeToggle'

interface AdminSidebarWrapperProps {
  role: string
  username: string
}

export default function AdminSidebarWrapper({ role, username }: AdminSidebarWrapperProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar on navigation on mobile
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      <style>{`
        .dashboard-sidebar {
          width: 250px;
          min-width: 250px;
          max-width: 250px;
          transition: transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
        }

        .mobile-header {
          display: none;
        }

        .overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.4);
          z-index: 25;
          backdrop-filter: blur(2px);
          opacity: 0;
          transition: opacity 0.3s ease-in-out;
        }

        @media (max-width: 768px) {
          .mobile-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem;
            background: var(--bg-color);
            border-bottom: 1px solid var(--border-color);
            position: sticky;
            top: 0;
            z-index: 20;
          }

          .dashboard-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            width: 280px;
            max-width: 80%;
            background: var(--bg-color);
            z-index: 30;
            border-right: 1px solid var(--border-color);
            overflow-y: auto;
            transform: translateX(-100%);
            box-shadow: none;
          }

          .dashboard-sidebar.open {
            transform: translateX(0);
            box-shadow: 4px 0 24px rgba(0,0,0,0.1);
          }

          .overlay.open {
            display: block;
            opacity: 1;
          }
        }
      `}</style>

      {/* Mobile Header */}
      <div className="mobile-header glass">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={toggleSidebar}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.25rem'
            }}
            aria-label="Toggle navigation"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>ExploreCMS</h1>
        </div>
        <ThemeToggle />
      </div>

      {/* Mobile Overlay */}
      <div className={`overlay ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(false)} aria-hidden="true" />

      {/* Sidebar Content */}
      <aside className={`glass dashboard-sidebar ${isOpen ? 'open' : ''}`} style={{ padding: '2rem 1.25rem', display: 'flex', flexDirection: 'column', borderRadius: 0, borderTop: 0, borderBottom: 0, borderLeft: 0, borderRight: '1px solid var(--border-color)', zIndex: 30 }}>
        {/* Only show on desktop since mobile has the top header */}
        <h2 className="desktop-title" style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '2rem', paddingLeft: '0.5rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>ExploreCMS</h2>

        <style>{`
          @media (max-width: 768px) {
            .desktop-title { display: none; }
          }
        `}</style>

        <AdminSidebarNav role={role} />

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Logged in as <strong style={{color: 'var(--text-primary)'}}>{username}</strong>
            </div>
            {/* ThemeToggle hidden here on mobile since it's in the mobile header */}
            <div className="desktop-theme-toggle">
              <ThemeToggle />
            </div>
            <style>{`
              @media (max-width: 768px) {
                .desktop-theme-toggle { display: none; }
              }
            `}</style>
          </div>
          <LogoutButton />
        </div>
      </aside>
    </>
  )
}
