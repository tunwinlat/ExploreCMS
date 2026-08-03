/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useTransition } from 'react'
import { updateSiteProfile, type SiteProfileInput } from './siteProfileActions'

type SectionKey =
  | 'links' | 'experience' | 'education' | 'skills' | 'certifications' | 'languages' | 'interests'

interface FieldDef {
  name: string
  label: string
  type?: 'text' | 'textarea' | 'checkbox'
  placeholder?: string
  fullWidth?: boolean
}

interface SectionDef {
  key: SectionKey
  title: string
  description: string
  addLabel: string
  fields: FieldDef[]
}

const SECTIONS: SectionDef[] = [
  {
    key: 'links',
    title: 'Links',
    description: 'Social profiles, portfolio sites, GitHub, LinkedIn — anywhere reviewers can find you.',
    addLabel: 'Add link',
    fields: [
      { name: 'label', label: 'Label', placeholder: 'GitHub' },
      { name: 'url', label: 'URL', placeholder: 'https://github.com/you' },
    ],
  },
  {
    key: 'experience',
    title: 'Work Experience',
    description: 'Roles in reverse-chronological order. Use the arrows to reorder.',
    addLabel: 'Add role',
    fields: [
      { name: 'title', label: 'Job title', placeholder: 'Tier 2 Operations Technician' },
      { name: 'company', label: 'Company', placeholder: 'Acme Corp' },
      { name: 'location', label: 'Location', placeholder: 'Vancouver, BC' },
      { name: 'startDate', label: 'Start', placeholder: 'Jan 2023' },
      { name: 'endDate', label: 'End', placeholder: 'Dec 2024 (ignored if current)' },
      { name: 'current', label: 'I currently work here', type: 'checkbox' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'What you did, achieved, owned…', fullWidth: true },
    ],
  },
  {
    key: 'education',
    title: 'Education',
    description: 'Degrees, diplomas and relevant schooling.',
    addLabel: 'Add education',
    fields: [
      { name: 'school', label: 'School', placeholder: 'University of…' },
      { name: 'degree', label: 'Degree', placeholder: 'B.Sc.' },
      { name: 'field', label: 'Field of study', placeholder: 'Computer Science' },
      { name: 'startDate', label: 'Start', placeholder: '2018' },
      { name: 'endDate', label: 'End', placeholder: '2022' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Honours, coursework, activities…', fullWidth: true },
    ],
  },
  {
    key: 'skills',
    title: 'Skills',
    description: 'Grouped by category on the public page (e.g. "Networking", "Cloud", "Soft skills").',
    addLabel: 'Add skill',
    fields: [
      { name: 'name', label: 'Skill', placeholder: 'Intune' },
      { name: 'category', label: 'Category', placeholder: 'Endpoint Management' },
    ],
  },
  {
    key: 'certifications',
    title: 'Certifications',
    description: 'Certs with issuer and date. Link to the credential URL if you have one.',
    addLabel: 'Add certification',
    fields: [
      { name: 'name', label: 'Name', placeholder: 'AZ-104: Azure Administrator' },
      { name: 'issuer', label: 'Issuer', placeholder: 'Microsoft' },
      { name: 'date', label: 'Date', placeholder: 'Mar 2024' },
      { name: 'url', label: 'Credential URL', placeholder: 'https://…' },
    ],
  },
  {
    key: 'languages',
    title: 'Languages',
    description: 'Spoken languages and proficiency.',
    addLabel: 'Add language',
    fields: [
      { name: 'name', label: 'Language', placeholder: 'Burmese' },
      { name: 'proficiency', label: 'Proficiency', placeholder: 'Native' },
    ],
  },
  {
    key: 'interests',
    title: 'Interests',
    description: 'Hobbies and interests — the human bits.',
    addLabel: 'Add interest',
    fields: [{ name: 'name', label: 'Interest', placeholder: 'Photography' }],
  },
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.55rem 0.75rem',
  borderRadius: '8px',
  border: '1px solid var(--border-color)',
  background: 'var(--bg-secondary, transparent)',
  color: 'var(--text-primary)',
  fontSize: '0.875rem',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '0.3rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const smallButtonStyle: React.CSSProperties = {
  padding: '0.3rem 0.6rem',
  borderRadius: '6px',
  border: '1px solid var(--border-color)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: '0.8rem',
  cursor: 'pointer',
}

type Items = Record<SectionKey, Record<string, unknown>[]>

function emptyItem(def: SectionDef): Record<string, unknown> {
  const item: Record<string, unknown> = {}
  for (const f of def.fields) item[f.name] = f.type === 'checkbox' ? false : ''
  return item
}

export default function SiteProfileForm({ initialProfile }: { initialProfile: Record<string, unknown> | null }) {
  const p = initialProfile || {}
  const str = (key: string) => (typeof p[key] === 'string' ? (p[key] as string) : '')

  const [basics, setBasics] = useState({
    fullName: str('fullName'),
    headline: str('headline'),
    avatarUrl: str('avatarUrl'),
    location: str('location'),
    email: str('email'),
    phone: str('phone'),
    website: str('website'),
    resumeUrl: str('resumeUrl'),
    availability: str('availability'),
    projectsHeading: str('projectsHeading') || 'Projects',
  })
  const [summary, setSummary] = useState(str('summary'))
  const [showProjects, setShowProjects] = useState(p.showProjects !== false)
  const [items, setItems] = useState<Items>(() => {
    const out = {} as Items
    for (const def of SECTIONS) {
      const arr = Array.isArray(p[def.key]) ? (p[def.key] as Record<string, unknown>[]) : []
      out[def.key] = arr.map(item => ({ ...emptyItem(def), ...item }))
    }
    return out
  })

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateItem(section: SectionKey, index: number, field: string, value: unknown) {
    setItems(prev => ({
      ...prev,
      [section]: prev[section].map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }))
  }

  function moveItem(section: SectionKey, index: number, dir: -1 | 1) {
    setItems(prev => {
      const arr = [...prev[section]]
      const target = index + dir
      if (target < 0 || target >= arr.length) return prev
      ;[arr[index], arr[target]] = [arr[target], arr[index]]
      return { ...prev, [section]: arr }
    })
  }

  function save() {
    setMessage(null)
    startTransition(async () => {
      const payload: SiteProfileInput = {
        ...basics,
        summary,
        showProjects,
        ...items,
      } as SiteProfileInput
      const result = await updateSiteProfile(payload)
      if (result?.error) setMessage({ type: 'error', text: result.error })
      else setMessage({ type: 'success', text: 'Profile saved. Changes are live.' })
    })
  }

  function renderField(def: SectionDef, item: Record<string, unknown>, index: number, field: FieldDef) {
    const value = item[field.name]
    const onChange = (v: unknown) => updateItem(def.key, index, field.name, v)
    if (field.type === 'checkbox') {
      return (
        <label key={field.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-primary)', alignSelf: 'end', paddingBottom: '0.55rem' }}>
          <input type="checkbox" checked={value === true} onChange={e => onChange(e.target.checked)} />
          {field.label}
        </label>
      )
    }
    return (
      <div key={field.name} style={field.fullWidth ? { gridColumn: '1 / -1' } : undefined}>
        <label style={labelStyle}>{field.label}</label>
        {field.type === 'textarea' ? (
          <textarea
            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
            value={typeof value === 'string' ? value : ''}
            placeholder={field.placeholder}
            onChange={e => onChange(e.target.value)}
          />
        ) : (
          <input
            style={inputStyle}
            value={typeof value === 'string' ? value : ''}
            placeholder={field.placeholder}
            onChange={e => onChange(e.target.value)}
          />
        )}
      </div>
    )
  }

  function renderSection(def: SectionDef) {
    const arr = items[def.key]
    return (
      <section key={def.key} className="glass" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{def.title}</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{def.description}</p>

        {arr.map((item, index) => (
          <div key={index} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginBottom: '0.6rem' }}>
              <button type="button" style={smallButtonStyle} onClick={() => moveItem(def.key, index, -1)} aria-label="Move up">↑</button>
              <button type="button" style={smallButtonStyle} onClick={() => moveItem(def.key, index, 1)} aria-label="Move down">↓</button>
              <button
                type="button"
                style={{ ...smallButtonStyle, color: 'var(--danger, #e5534b)' }}
                onClick={() => setItems(prev => ({ ...prev, [def.key]: prev[def.key].filter((_, i) => i !== index) }))}
              >
                Remove
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {def.fields.map(field => renderField(def, item, index, field))}
            </div>
          </div>
        ))}

        <button
          type="button"
          style={{ ...smallButtonStyle, padding: '0.5rem 0.9rem' }}
          onClick={() => setItems(prev => ({ ...prev, [def.key]: [...prev[def.key], emptyItem(def)] }))}
        >
          + {def.addLabel}
        </button>
      </section>
    )
  }

  const basicFields: { name: keyof typeof basics; label: string; placeholder?: string; fullWidth?: boolean }[] = [
    { name: 'fullName', label: 'Full name', placeholder: 'Tun Win Lat' },
    { name: 'headline', label: 'Headline', placeholder: 'Tier 2 Operations Technician · Systems Administrator' },
    { name: 'avatarUrl', label: 'Avatar / photo URL', placeholder: 'https://…' },
    { name: 'location', label: 'Location', placeholder: 'Coquitlam, BC, Canada' },
    { name: 'email', label: 'Public contact email', placeholder: 'you@example.com' },
    { name: 'phone', label: 'Phone (optional)', placeholder: '+1 …' },
    { name: 'website', label: 'Personal website', placeholder: 'https://…' },
    { name: 'resumeUrl', label: 'Résumé / CV URL (PDF)', placeholder: 'https://…' },
    { name: 'availability', label: 'Availability note', placeholder: 'Open to new opportunities', fullWidth: true },
  ]

  return (
    <div>
      <section className="glass" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Basics</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          The hero block at the top of your profile page.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {basicFields.map(field => (
            <div key={field.name} style={field.fullWidth ? { gridColumn: '1 / -1' } : undefined}>
              <label style={labelStyle}>{field.label}</label>
              <input
                style={inputStyle}
                value={basics[field.name]}
                placeholder={field.placeholder}
                onChange={e => setBasics(prev => ({ ...prev, [field.name]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label style={labelStyle}>Summary / bio (Markdown or HTML)</label>
          <textarea
            style={{ ...inputStyle, minHeight: '140px', resize: 'vertical' }}
            value={summary}
            placeholder={'A few paragraphs about who you are, what you do, and what you are looking for.'}
            onChange={e => setSummary(e.target.value)}
          />
        </div>
      </section>

      {SECTIONS.map(renderSection)}

      <section className="glass" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Projects showcase</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Show your published projects on the profile page.
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          <input type="checkbox" checked={showProjects} onChange={e => setShowProjects(e.target.checked)} />
          Show projects section
        </label>
        {showProjects && (
          <div style={{ maxWidth: '320px' }}>
            <label style={labelStyle}>Section heading</label>
            <input
              style={inputStyle}
              value={basics.projectsHeading}
              onChange={e => setBasics(prev => ({ ...prev, projectsHeading: e.target.value }))}
            />
          </div>
        )}
      </section>

      {message && (
        <p style={{ marginBottom: '1rem', color: message.type === 'error' ? 'var(--danger, #e5534b)' : 'var(--success, #3fb950)', fontSize: '0.9rem' }}>
          {message.text}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={isPending}
        style={{
          padding: '0.7rem 1.6rem',
          borderRadius: '10px',
          border: 'none',
          background: 'var(--accent, #4f8cff)',
          color: '#fff',
          fontWeight: 700,
          fontSize: '0.95rem',
          cursor: isPending ? 'wait' : 'pointer',
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending ? 'Saving…' : 'Save profile'}
      </button>
    </div>
  )
}
