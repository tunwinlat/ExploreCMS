import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deleteTag, updateTag } from './tagActions'
import { verifySession } from '@/lib/auth'

// We need to define mockTagDb so we can check it
const mockTagDb = {
  findFirst: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/bunnyDb', () => ({
  getPostDb: vi.fn().mockResolvedValue({
    tag: {
      findFirst: (...args: any[]) => mockTagDb.findFirst(...args),
      update: (...args: any[]) => mockTagDb.update(...args),
      delete: (...args: any[]) => mockTagDb.delete(...args),
    }
  })
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

describe('tagActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {}) // Suppress expected console.error
  })

  describe('deleteTag', () => {
    it('throws unauthorized error if session is null', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce(null)

      const result = await deleteTag('tag-1')
      expect(result).toEqual({ error: 'Unauthorized' })
      expect(mockTagDb.delete).not.toHaveBeenCalled()
    })

    it('successfully deletes a tag when authorized as ADMIN', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce({ id: 'admin-1', role: 'ADMIN' })
      mockTagDb.delete.mockResolvedValueOnce({ id: 'tag-1', name: 'Test Tag', slug: 'test-tag' } as any)

      const result = await deleteTag('tag-1')

      expect(result).toEqual({ success: true })
      expect(mockTagDb.delete).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
      })
    })

    it('throws generic error if deletion fails and logs the error', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce({ id: 'admin-1', role: 'ADMIN' })
      const dbError = new Error('Database error')
      mockTagDb.delete.mockRejectedValueOnce(dbError)

      const result = await deleteTag('tag-1')
      expect(result).toEqual({ error: 'Failed to delete tag' })
    })
  })

  describe('updateTag', () => {
    it('returns unauthorized error if session is invalid', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce(null)

      const result = await updateTag('tag-1', 'New Name')

      expect(result).toEqual({ error: 'Unauthorized' })
      expect(mockTagDb.update).not.toHaveBeenCalled()
    })

    it('returns error if tag with the same name already exists', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce({ id: 'user-1', role: 'ADMIN' })
      mockTagDb.findFirst.mockResolvedValueOnce({ id: 'tag-2', name: 'New Name', slug: 'new-name' } as any)

      const result = await updateTag('tag-1', 'New Name')

      expect(result).toEqual({ error: 'A tag with this name already exists' })
      expect(mockTagDb.update).not.toHaveBeenCalled()
    })

    it('successfully updates a tag when authorized', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce({ id: 'user-1', role: 'ADMIN' })
      mockTagDb.findFirst.mockResolvedValueOnce(null)
      mockTagDb.update.mockResolvedValueOnce({ id: 'tag-1', name: 'New Name', slug: 'new-name' } as any)

      const result = await updateTag('tag-1', 'New Name!')

      expect(result).toEqual({ success: true })
      expect(mockTagDb.update).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
        data: { name: 'New Name!', slug: 'new-name' }
      })
    })

    it('returns generic error if update fails', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce({ id: 'user-1', role: 'ADMIN' })
      mockTagDb.findFirst.mockResolvedValueOnce(null)
      mockTagDb.update.mockRejectedValueOnce(new Error('Database error'))

      const result = await updateTag('tag-1', 'New Name')

      expect(result).toEqual({ error: 'Failed to update tag' })
    })
  })
})
