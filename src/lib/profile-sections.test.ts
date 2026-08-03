/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect } from 'vitest'
import { parseProfileSections, validateProfileSection } from './profile-sections'

describe('parseProfileSections', () => {
  it('returns empty arrays for a null profile', () => {
    const sections = parseProfileSections(null)
    for (const value of Object.values(sections)) {
      expect(value).toEqual([])
    }
  })

  it('tolerates invalid JSON', () => {
    const sections = parseProfileSections({ skills: '{broken' })
    expect(sections.skills).toEqual([])
  })

  it('drops non-object items and coerces fields to strings', () => {
    const sections = parseProfileSections({
      links: JSON.stringify([
        { label: 'GitHub', url: 'https://github.com/x' },
        'junk',
        { label: 42 },
        null,
      ]),
    })
    expect(sections.links).toEqual([
      { label: 'GitHub', url: 'https://github.com/x' },
      { label: '42', url: '' },
    ])
  })

  it('normalises the experience current flag', () => {
    const sections = parseProfileSections({
      experience: JSON.stringify([
        { title: 'A', current: true },
        { title: 'B', current: 'true' },
        { title: 'C' },
      ]),
    })
    expect(sections.experience.map(j => j.current)).toEqual([true, true, false])
  })
})

describe('validateProfileSection', () => {
  it('rejects non-arrays', () => {
    expect(validateProfileSection('skills', 'x').error).toMatch(/must be an array/)
  })

  it('rejects non-object items', () => {
    expect(validateProfileSection('links', [1]).error).toMatch(/must be objects/)
  })

  it('normalises valid input', () => {
    const result = validateProfileSection('languages', [{ name: 'Burmese', proficiency: 'Native', extra: 'dropped' }])
    expect(result.error).toBeUndefined()
    expect(result.data).toEqual([{ name: 'Burmese', proficiency: 'Native' }])
  })
})
