/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { deleteAlbum } from './photoActions'

interface DeleteAlbumButtonProps {
  albumId: string
  albumTitle: string
}

export default function DeleteAlbumButton({ albumId, albumTitle }: DeleteAlbumButtonProps) {
  const handleDelete = async () => {
    if (!confirm(`Delete album "${albumTitle}" and all its photos?`)) return
    await deleteAlbum(albumId)
  }

  return (
    <button
      onClick={handleDelete}
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
  )
}
