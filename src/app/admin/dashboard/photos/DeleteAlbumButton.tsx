/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import { deleteAlbum } from './photoActions'
import ConfirmDialog from '@/components/admin/ConfirmDialog'

interface DeleteAlbumButtonProps {
  albumId: string
  albumTitle: string
}

export default function DeleteAlbumButton({ albumId, albumTitle }: DeleteAlbumButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await deleteAlbum(albumId)
    } finally {
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        style={{
          padding: '0.4rem 0.75rem',
          borderRadius: '8px',
          border: '1px solid color-mix(in srgb, #ef4444 30%, transparent)',
          fontSize: '0.78rem',
          fontWeight: 500,
          color: '#ef4444',
          background: 'transparent',
          cursor: 'pointer',
        }}
      >
        Delete
      </button>

      <ConfirmDialog
        open={showConfirm}
        title="Delete Album"
        message={`Are you sure you want to delete the album "${albumTitle}" and all its photos? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
        loading={isDeleting}
      />
    </>
  )
}
