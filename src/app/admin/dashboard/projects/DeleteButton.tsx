/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import { deleteProject } from './projectActions'
import ConfirmDialog from '@/components/admin/ConfirmDialog'

interface DeleteButtonProps {
  projectId: string
  projectTitle: string
}

export default function DeleteButton({ projectId, projectTitle }: DeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = () => setIsOpen(true)

  const confirmDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteProject(projectId)
    } finally {
      setIsDeleting(false)
      setIsOpen(false)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Delete project ${projectTitle}`}
        disabled={isDeleting}
        onClick={handleDelete}
        style={{
          padding: '0.4rem 0.875rem',
          borderRadius: '8px',
          border: '1px solid color-mix(in srgb, #ef4444 30%, transparent)',
          fontSize: '0.8rem',
          fontWeight: 500,
          color: '#ef4444',
          background: 'transparent',
          cursor: isDeleting ? 'not-allowed' : 'pointer',
          opacity: isDeleting ? 0.7 : 1,
        }}
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>

      <ConfirmDialog
        open={isOpen}
        title="Delete project?"
        message={`Are you sure you want to permanently delete "${projectTitle}"? This cannot be undone.`}
        confirmLabel="Delete project"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setIsOpen(false)}
        loading={isDeleting}
      />
    </>
  )
}
