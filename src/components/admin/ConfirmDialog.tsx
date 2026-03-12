/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useEffect, useRef } from 'react'

type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      cancelRef.current?.focus()
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  const confirmColors = {
    danger: { bg: '#ef4444', hover: '#dc2626' },
    warning: { bg: '#eab308', hover: '#ca8a04' },
    default: { bg: 'var(--accent-color)', hover: 'var(--accent-hover)' },
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        padding: '1rem',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <div
        style={{
          background: 'var(--bg-color-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.3)',
          animation: 'dialogScaleIn 0.2s ease-out',
        }}
      >
        <h3
          id="confirm-dialog-title"
          style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            marginBottom: '0.75rem',
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h3>
        <p
          id="confirm-dialog-message"
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.95rem',
            lineHeight: 1.5,
            marginBottom: '1.5rem',
          }}
        >
          {message}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            className="btn"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '0.6rem 1.2rem',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn"
            style={{
              background: confirmColors[variant].bg,
              color: '#fff',
              border: 'none',
              padding: '0.6rem 1.2rem',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
