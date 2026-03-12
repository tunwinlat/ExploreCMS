/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface PopupToastProps {
  title: string
  content: string
  displayMode: string
}

const STORAGE_KEY = 'explorecms_popup_dismissed'

export function PopupToast({ title, content, displayMode }: PopupToastProps) {
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (displayMode === 'once') {
      const dismissed = localStorage.getItem(STORAGE_KEY)
      if (dismissed) return
    }
    const timer = setTimeout(() => setVisible(true), 500)
    return () => clearTimeout(timer)
  }, [displayMode, mounted])

  const handleDismiss = () => {
    setClosing(true)
    if (displayMode === 'once') {
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
    }
    setTimeout(() => setVisible(false), 300)
  }

  if (!mounted || !visible) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={handleDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          opacity: closing ? 0 : 1,
          transition: 'opacity 0.3s ease'
        }}
      />

      {/* Popup */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Popup message'}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: closing
            ? 'translate(-50%, -50%) scale(0.95)'
            : 'translate(-50%, -50%) scale(1)',
          background: 'var(--bg-color)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg, 16px)',
          padding: '2rem',
          maxWidth: '500px',
          width: '90vw',
          maxHeight: '80vh',
          overflowY: 'auto',
          zIndex: 10001,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          opacity: closing ? 0 : 1,
          transition: 'opacity 0.3s ease, transform 0.3s ease'
        }}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          aria-label="Close popup"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: '1.25rem',
            padding: '0.25rem',
            lineHeight: 1,
            borderRadius: '4px'
          }}
        >
          ✕
        </button>

        {title && (
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            marginBottom: '1rem',
            paddingRight: '2rem'
          }}>
            {title}
          </h2>
        )}

        <div
          className="tiptap"
          dangerouslySetInnerHTML={{ __html: content }}
          style={{ fontSize: '0.95rem', lineHeight: 1.6 }}
        />

        <button
          onClick={handleDismiss}
          className="btn btn-primary"
          style={{
            marginTop: '1.5rem',
            width: '100%',
            padding: '0.625rem',
            fontSize: '0.95rem'
          }}
        >
          Got it
        </button>
      </div>
    </>,
    document.body
  )
}
