/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Modal({ children }: { children: React.ReactNode }) {
  const overlay = useRef<HTMLDivElement>(null)
  const wrapper = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const onDismiss = useCallback(() => {
    router.back()
  }, [router])

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlay.current || e.target === wrapper.current) {
        if (onDismiss) onDismiss()
      }
    },
    [onDismiss, overlay, wrapper]
  )

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    },
    [onDismiss]
  )

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden' // Prevent background scrolling
    
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = 'auto'
    }
  }, [onKeyDown])

  return (
    <div
      ref={overlay}
      style={{
        position: 'fixed',
        zIndex: 100,
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        margin: '0 auto',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        overflowY: 'auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '2rem 1rem'
      }}
      onClick={onClick}
    >
      <div 
        ref={wrapper}
        style={{
          width: '100%',
          maxWidth: '900px',
          animation: 'slide-up 0.3s ease-out forwards',
          margin: '0 auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', width: '100%' }}>
           <button 
             onClick={onDismiss}
             style={{
               background: 'var(--bg-color)',
               border: '1px solid var(--border-color)',
               color: 'var(--text-primary)',
               borderRadius: '50%',
               width: '40px',
               height: '40px',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               cursor: 'pointer',
               fontSize: '1.2rem',
               boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
             }}
           >
             ✕
           </button>
        </div>
        
        {/* The child will be the specific Page Content injected by the Intercepting Route */}
        {children}
      </div>
    </div>
  )
}
