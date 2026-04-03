/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deleteTag, updateTag } from './tagActions'
import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getPostDb } from '@/lib/bunnyDb'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  verifySession: vi.fn(),
}))

const mockTagDb = {
  findFirst: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/lib/bunnyDb', () => {
  return {
    getPostDb: vi.fn().mockImplementation(async () => ({
      tag: mockTagDb
    })),
  }
})

vi.mock('@/lib/db', () => ({
  prisma: {
    tag: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

describe('tagActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {}) // Suppress expected console.error
    mockTagDb.findFirst.mockReset();
    mockTagDb.update.mockReset();
    mockTagDb.delete.mockReset();
  })

  describe('deleteTag', () => {
    it('throws unauthorized error if session is null', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce(null)

      const result = await deleteTag('tag-1')
      expect(result).toEqual({ error: 'Unauthorized' })
      expect(prisma.tag.delete).not.toHaveBeenCalled()
    })

    it('successfully deletes a tag when authorized', async () => {
      vi.mocked(verifySession).mockResolvedValue({ id: 'admin-1', role: 'ADMIN' })
      mockTagDb.delete.mockResolvedValueOnce({ id: 'tag-1', name: 'Test Tag', slug: 'test-tag' });

      const result = await deleteTag('tag-1')

      expect(result).toEqual({ success: true })
      expect(mockTagDb.delete).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
      })
      expect(revalidatePath).toHaveBeenCalledWith('/admin/dashboard/tags')
      expect(revalidatePath).toHaveBeenCalledWith('/')
    })

    it('throws generic error if deletion fails', async () => {
      vi.mocked(verifySession).mockResolvedValue({ id: 'admin-1', role: 'ADMIN' })
      const dbError = new Error('Database error')
      mockTagDb.delete.mockRejectedValueOnce(dbError);

      const result = await deleteTag('tag-1')
      expect(result).toEqual({ error: 'Failed to delete tag' })
    })
  })

  describe('updateTag', () => {
    it('returns unauthorized error if session is invalid', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce(null)

      const result = await updateTag('tag-1', 'New Name')

      expect(result).toEqual({ error: 'Unauthorized' })
      expect(prisma.tag.update).not.toHaveBeenCalled()
    })

    it('returns error if tag with the same name already exists', async () => {
      vi.mocked(verifySession).mockResolvedValue({ id: 'user-1', role: 'ADMIN' })
      mockTagDb.findFirst.mockResolvedValueOnce({ id: 'tag-2', name: 'New Name', slug: 'new-name' });

      const result = await updateTag('tag-1', 'New Name')

      expect(result).toEqual({ error: 'A tag with this name already exists' })
      expect(mockTagDb.update).not.toHaveBeenCalled()
    })

    it('successfully updates a tag when authorized', async () => {
      vi.mocked(verifySession).mockResolvedValue({ id: 'user-1', role: 'ADMIN' })
      mockTagDb.findFirst.mockResolvedValueOnce(null);
      mockTagDb.update.mockResolvedValueOnce({ id: 'tag-1', name: 'New Name', slug: 'new-name' });

      const result = await updateTag('tag-1', 'New Name!')

      expect(result).toEqual({ success: true })
      expect(mockTagDb.update).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
        data: { name: 'New Name!', slug: 'new-name' }
      })
      expect(revalidatePath).toHaveBeenCalledWith('/admin/dashboard/tags')
      expect(revalidatePath).toHaveBeenCalledWith('/')
    })

    it('returns generic error if update fails', async () => {
      vi.mocked(verifySession).mockResolvedValue({ id: 'user-1', role: 'ADMIN' })
      const dbError = new Error('Database error')
      mockTagDb.findFirst.mockResolvedValueOnce(null);
      mockTagDb.update.mockRejectedValueOnce(dbError);

      const result = await updateTag('tag-1', 'New Name')

      expect(result).toEqual({ error: 'Failed to update tag' })
    })
  })
})
