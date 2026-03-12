/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

type Toast = {
  id: number
  message: string
  type: ToastType
}

type ToastContextType = {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const colors: Record<ToastType, { bg: string; border: string; text: string }> = {
    success: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.3)', text: '#22c55e' },
    error: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', text: '#ef4444' },
    warning: { bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.3)', text: '#eab308' },
    info: { bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.3)', text: '#818cf8' },
  }

  const icons: Record<ToastType, string> = {
    success: '\u2713',
    error: '\u2717',
    warning: '!',
    info: 'i',
  }

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {toasts.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            maxWidth: '420px',
            width: '100%',
          }}
        >
          {toasts.map(t => {
            const c = colors[t.type]
            return (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  borderRadius: 'var(--radius-md)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  animation: 'toastSlideIn 0.3s ease-out',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: c.text,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {icons[t.type]}
                </span>
                <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.4 }}>
                  {t.message}
                </span>
                <button
                  onClick={() => removeToast(t.id)}
                  aria-label="Dismiss notification"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    fontSize: '1rem',
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  \u2715
                </button>
              </div>
            )
          })}
        </div>
      )}
    </ToastContext.Provider>
  )
}
