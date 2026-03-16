/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import { syncGitHubProject } from './github/githubActions'
import { useToast } from '@/components/admin/Toast'
import { useRouter } from 'next/navigation'

interface SyncButtonProps {
  projectId: string
}

export default function SyncButton({ projectId }: SyncButtonProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleSync = async () => {
    setLoading(true)
    toast('Syncing from GitHub...', 'info')
    
    const result = await syncGitHubProject(projectId)
    
    if (result.error) {
      toast('Sync failed: ' + result.error, 'error')
    } else {
      toast('Project synced successfully!', 'success')
      router.refresh()
    }
    
    setLoading(false)
  }

  return (
    <button
      onClick={handleSync}
      disabled={loading}
      title="Sync from GitHub"
      style={{
        padding: '0.4rem 0.6rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        fontSize: '0.8rem',
        fontWeight: 500,
        color: 'var(--text-secondary)',
        background: 'transparent',
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? (
        <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
        </svg>
      )}
      {loading ? 'Syncing...' : 'Sync'}
    </button>
  )
}
