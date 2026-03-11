'use client'

import { useEffect } from 'react'

export function ViewTracker({ slug }: { slug?: string }) {
  useEffect(() => {
    const track = async () => {
      try {
        await fetch('/api/views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slug ? { slug } : {}),
        })
      } catch (error) {
        console.error('Failed to track view', error)
      }
    }
    
    // Slight delay to ensure it doesn't block main thread paint
    const timer = setTimeout(() => track(), 1000)
    return () => clearTimeout(timer)
  }, [slug])

  return null
}
