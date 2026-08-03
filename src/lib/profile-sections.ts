/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Typed helpers for the JSON-array sections stored on the Profile singleton.
 * Shared by the public page, admin actions and the /api/v1/profile endpoint.
 */

export interface ProfileLink { label: string; url: string }
export interface ProfileExperience {
  title: string
  company: string
  location: string
  startDate: string
  endDate: string
  current: boolean
  description: string
}
export interface ProfileEducation {
  school: string
  degree: string
  field: string
  startDate: string
  endDate: string
  description: string
}
export interface ProfileSkill { name: string; category: string }
export interface ProfileCertification { name: string; issuer: string; date: string; url: string }
export interface ProfileLanguage { name: string; proficiency: string }
export interface ProfileInterest { name: string }

export interface ParsedProfileSections {
  links: ProfileLink[]
  experience: ProfileExperience[]
  education: ProfileEducation[]
  skills: ProfileSkill[]
  certifications: ProfileCertification[]
  languages: ProfileLanguage[]
  interests: ProfileInterest[]
}

const STRING_FIELDS: Record<string, readonly string[]> = {
  links: ['label', 'url'],
  experience: ['title', 'company', 'location', 'startDate', 'endDate', 'description'],
  education: ['school', 'degree', 'field', 'startDate', 'endDate', 'description'],
  skills: ['name', 'category'],
  certifications: ['name', 'issuer', 'date', 'url'],
  languages: ['name', 'proficiency'],
  interests: ['name'],
}

function toStr(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

function parseArray(raw: string | null | undefined): unknown[] {
  try {
    const parsed: unknown = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function normalizeItem(section: keyof typeof STRING_FIELDS, item: unknown): Record<string, unknown> | null {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) return null
  const src = item as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const field of STRING_FIELDS[section]) out[field] = toStr(src[field])
  if (section === 'experience') out.current = src.current === true || src.current === 'true'
  return out
}

export function parseProfileSections(profile: {
  links?: string | null
  experience?: string | null
  education?: string | null
  skills?: string | null
  certifications?: string | null
  languages?: string | null
  interests?: string | null
} | null): ParsedProfileSections {
  const p = profile || {}
  const section = (key: keyof ParsedProfileSections) =>
    parseArray(p[key])
      .map(item => normalizeItem(key, item))
      .filter((item): item is Record<string, unknown> => item !== null)

  return {
    links: section('links') as unknown as ProfileLink[],
    experience: section('experience') as unknown as ProfileExperience[],
    education: section('education') as unknown as ProfileEducation[],
    skills: section('skills') as unknown as ProfileSkill[],
    certifications: section('certifications') as unknown as ProfileCertification[],
    languages: section('languages') as unknown as ProfileLanguage[],
    interests: section('interests') as unknown as ProfileInterest[],
  }
}

/**
 * Validate one section value coming from API/admin input.
 * Returns the normalized array on success, or { error }.
 */
export function validateProfileSection(
  section: keyof ParsedProfileSections,
  value: unknown
): { data?: Record<string, unknown>[]; error?: string } {
  if (!Array.isArray(value)) return { error: `${section} must be an array` }
  if (value.length > 100) return { error: `${section} must have 100 items or fewer` }
  const out: Record<string, unknown>[] = []
  for (const item of value) {
    const normalized = normalizeItem(section, item)
    if (!normalized) return { error: `${section} items must be objects` }
    for (const field of STRING_FIELDS[section]) {
      if ((normalized[field] as string).length > 5000) {
        return { error: `${section}.${field} is too long (max 5000 characters)` }
      }
    }
    out.push(normalized)
  }
  return { data: out }
}
