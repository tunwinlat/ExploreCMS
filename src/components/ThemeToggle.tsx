'use client'

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <button suppressHydrationWarning className="btn glass" style={{ padding: '0.5rem', width: '40px', height: '40px' }}></button>
  }

  return (
    <button
      suppressHydrationWarning
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="btn glass"
      style={{ padding: '0.5rem', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? '🌞' : '🌙'}
    </button>
  )
}
