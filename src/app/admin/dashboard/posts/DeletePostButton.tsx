/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import { deletePostById } from './postDeleteActions'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/admin/Toast'
import ConfirmDialog from '@/components/admin/ConfirmDialog'

export function DeletePostButton({ id, title }: { id: string; title?: string }) {
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleDelete = async () => {
    setLoading(true)
    const res = await deletePostById(id)
    if (res.success) {
      toast('Post deleted.', 'success')
      router.refresh()
    } else {
      toast(res.error || 'Failed to delete post', 'error')
      setLoading(false)
      setShowDialog(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        disabled={loading}
        aria-label={title ? `Delete "${title}"` : 'Delete post'}
        style={{
          color: '#ef4444',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          fontSize: '0.9rem',
          fontWeight: 500,
          opacity: loading ? 0.5 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        {loading ? 'Deleting...' : 'Delete'}
      </button>

      <ConfirmDialog
        open={showDialog}
        title="Delete this post?"
        message="This action cannot be undone. The post will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={loading}
        onConfirm={handleDelete}
        onCancel={() => setShowDialog(false)}
      />
    </>
  )
}
