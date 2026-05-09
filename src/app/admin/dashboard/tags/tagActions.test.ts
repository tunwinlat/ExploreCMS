/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deleteTag, updateTag } from './tagActions'
import { verifySession } from '@/lib/auth'
import { getPostDb } from '@/lib/bunnyDb'
import { revalidatePath } from 'next/cache'

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))
// Mock dependencies
vi.mock('@/lib/auth', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/bunnyDb', () => ({
  getPostDb: vi.fn(),
}))

describe('tagActions', () => {
  let mockPostDb: any

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {}) // Suppress expected console.error
    mockPostDb = {
      tag: {
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      }
    }
    vi.mocked(getPostDb as any).mockResolvedValue(mockPostDb)
  })
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {}) // Suppress expected console.error
  })

  describe('deleteTag', () => {
    it('throws unauthorized error if session is null', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce(null)

      const result = await deleteTag('tag-1')
      expect(result).toEqual({ error: 'Unauthorized' })
      expect(mockPostDb.tag.delete).not.toHaveBeenCalled()
    })

    it('successfully deletes a tag when authorized as ADMIN', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce({ id: 'admin-1', role: 'ADMIN' })
      mockPostDb.tag.delete.mockResolvedValueOnce({ id: 'tag-1', name: 'Test Tag', slug: 'test-tag' })

      const result = await deleteTag('tag-1')

      expect(result).toEqual({ success: true })
      expect(mockPostDb.tag.delete).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
      })
      expect(revalidatePath).toHaveBeenCalledWith('/admin/dashboard/tags')
    })

    it('throws generic error if deletion fails', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce({ id: 'admin-1', role: 'ADMIN' })
      const dbError = new Error('Database error')
      mockPostDb.tag.delete.mockRejectedValueOnce(dbError)

      const result = await deleteTag('tag-1')
      expect(result).toEqual({ error: 'Failed to delete tag' })
    })
  })

  describe('updateTag', () => {
    it('returns unauthorized error if session is invalid', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce(null)

      const result = await updateTag('tag-1', 'New Name')

      expect(result).toEqual({ error: 'Unauthorized' })
      expect(mockPostDb.tag.update).not.toHaveBeenCalled()
    })

    it('returns error if tag with the same name already exists', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce({ id: 'user-1', role: 'ADMIN' })
      mockPostDb.tag.findFirst.mockResolvedValueOnce({ id: 'tag-2', name: 'New Name', slug: 'new-name' })

      const result = await updateTag('tag-1', 'New Name')

      expect(result).toEqual({ error: 'A tag with this name already exists' })
      expect(mockPostDb.tag.update).not.toHaveBeenCalled()
    })

    it('successfully updates a tag when authorized', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce({ id: 'user-1', role: 'ADMIN' })
      mockPostDb.tag.findFirst.mockResolvedValueOnce(null)
      mockPostDb.tag.update.mockResolvedValueOnce({ id: 'tag-1', name: 'New Name', slug: 'new-name' })

      const result = await updateTag('tag-1', 'New Name!')

      expect(result).toEqual({ success: true })
      expect(mockPostDb.tag.update).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
        data: { name: 'New Name!', slug: 'new-name' }
      })
      expect(revalidatePath).toHaveBeenCalledWith('/admin/dashboard/tags')
      expect(revalidatePath).toHaveBeenCalledWith('/')
    })

    it('returns generic error if update fails', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce({ id: 'user-1', role: 'ADMIN' })
      mockPostDb.tag.findFirst.mockResolvedValueOnce(null)
      mockPostDb.tag.update.mockRejectedValueOnce(new Error('Database error'))

      const result = await updateTag('tag-1', 'New Name')

      expect(result).toEqual({ error: 'Failed to update tag' })
    })
  })
})
