/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { syncGitHubProject } from './github/githubActions'

interface SyncButtonProps {
  projectId: string
}

export default function SyncButton({ projectId }: SyncButtonProps) {
  const handleSync = async () => {
    const result = await syncGitHubProject(projectId)
    if (result.error) {
      alert('Sync failed: ' + result.error)
    } else {
      window.location.reload()
    }
  }

  return (
    <button
      onClick={handleSync}
      title="Sync from GitHub"
      style={{
        padding: '0.4rem 0.6rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        fontSize: '0.8rem',
        fontWeight: 500,
        color: 'var(--text-secondary)',
        background: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
      </svg>
      Sync
    </button>
  )
}
