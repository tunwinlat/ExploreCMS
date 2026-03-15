/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import { unlinkCraftPost } from '../../integrations/craftActions'
import { useToast } from '@/components/admin/Toast'

export function UnlinkCraftButton({ id, title }: { id: string; title: string }) {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { toast } = useToast()

  const handleUnlink = async () => {
    setLoading(true)
    const res = await unlinkCraftPost(id)
    if (res.success) {
      toast(`"${title}" unlinked from Craft. Editing is now enabled.`, 'success')
      setShowConfirm(false)
      window.location.reload()
    } else {
      toast(res.error || 'Failed to unlink.', 'error')
    }
    setLoading(false)
  }

  if (showConfirm) {
    return (
      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
        <button
          onClick={handleUnlink}
          disabled={loading}
          style={{
            background: '#6366f1',
            color: 'white',
            border: 'none',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          {loading ? '...' : 'Confirm'}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          style={{
            background: 'transparent',
            color: 'var(--text-secondary)',
            border: 'none',
            padding: '0.25rem 0.5rem',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      style={{
        background: 'transparent',
        color: '#6366f1',
        border: 'none',
        padding: 0,
        fontSize: '0.9rem',
        fontWeight: 500,
        cursor: 'pointer',
      }}
    >
      Unlink
    </button>
  )
}
