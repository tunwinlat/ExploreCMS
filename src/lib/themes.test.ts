import { describe, it, expect } from 'vitest'
import { getThemeConfig, THEMES } from './themes'

describe('getThemeConfig', () => {
  it('should return the correct theme configuration for an existing theme', () => {
    const defaultTheme = getThemeConfig('default')
    expect(defaultTheme).toBeDefined()
    expect(defaultTheme.id).toBe('default')
    expect(defaultTheme.name).toBe('Default (Inter)')

    const oceanTheme = getThemeConfig('ocean')
    expect(oceanTheme).toBeDefined()
    expect(oceanTheme.id).toBe('ocean')
    expect(oceanTheme.name).toBe('Ocean Depth')
  })

  it('should return the fallback (minimal/default) theme configuration for a non-existent theme', () => {
    const fallbackTheme = getThemeConfig('non-existent-theme-xyz')
    expect(fallbackTheme).toBeDefined()
    expect(fallbackTheme.id).toBe(THEMES[0].id)
    expect(fallbackTheme.name).toBe(THEMES[0].name)
  })

  it('should fall back to default theme if theme id is empty string', () => {
    const emptyThemeIdResult = getThemeConfig('')
    expect(emptyThemeIdResult).toBeDefined()
    expect(emptyThemeIdResult.id).toBe(THEMES[0].id)
  })
})
