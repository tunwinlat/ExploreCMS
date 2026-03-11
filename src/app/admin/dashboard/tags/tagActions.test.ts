import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deleteTag, updateTag } from './tagActions'
import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  verifySession: vi.fn(),
}))

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
  })

  describe('deleteTag', () => {
    it('throws unauthorized error if session is null', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce(null)

      await expect(deleteTag('tag-1')).rejects.toThrow('Unauthorized')
      expect(prisma.tag.delete).not.toHaveBeenCalled()
    })

    it('throws unauthorized error if role is not ADMIN', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce({ id: 'user-1', role: 'USER' })

      await expect(deleteTag('tag-1')).rejects.toThrow('Unauthorized')
      expect(prisma.tag.delete).not.toHaveBeenCalled()
    })

    it('successfully deletes a tag when authorized as ADMIN', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce({ id: 'admin-1', role: 'ADMIN' })
      vi.mocked(prisma.tag.delete).mockResolvedValueOnce({ id: 'tag-1', name: 'Test Tag', slug: 'test-tag' })

      const result = await deleteTag('tag-1')

      expect(result).toEqual({ success: true })
      expect(prisma.tag.delete).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
      })
      expect(revalidatePath).toHaveBeenCalledWith('/admin/dashboard/tags')
      expect(revalidatePath).toHaveBeenCalledTimes(1)
    })

    it('throws generic error if deletion fails and logs the error', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce({ id: 'admin-1', role: 'ADMIN' })
      const dbError = new Error('Database error')
      vi.mocked(prisma.tag.delete).mockRejectedValueOnce(dbError)

      await expect(deleteTag('tag-1')).rejects.toThrow('Failed to delete tag')
      expect(console.error).toHaveBeenCalledWith('Error deleting tag:', dbError)
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
      vi.mocked(verifySession).mockResolvedValueOnce({ id: 'user-1', role: 'ADMIN' })
      vi.mocked(prisma.tag.findFirst).mockResolvedValueOnce({ id: 'tag-2', name: 'New Name', slug: 'new-name' })

      const result = await updateTag('tag-1', 'New Name')

      expect(result).toEqual({ error: 'A tag with this name already exists' })
      expect(prisma.tag.update).not.toHaveBeenCalled()
    })

    it('successfully updates a tag when authorized', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce({ id: 'user-1', role: 'ADMIN' })
      vi.mocked(prisma.tag.findFirst).mockResolvedValueOnce(null)
      vi.mocked(prisma.tag.update).mockResolvedValueOnce({ id: 'tag-1', name: 'New Name', slug: 'new-name' })

      const result = await updateTag('tag-1', 'New Name!')

      expect(result).toEqual({ success: true })
      expect(prisma.tag.update).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
        data: { name: 'New Name!', slug: 'new-name' }
      })
      expect(revalidatePath).toHaveBeenCalledWith('/admin/dashboard/tags')
      expect(revalidatePath).toHaveBeenCalledWith('/')
    })

    it('returns generic error if update fails', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce({ id: 'user-1', role: 'ADMIN' })
      vi.mocked(prisma.tag.findFirst).mockResolvedValueOnce(null)
      vi.mocked(prisma.tag.update).mockRejectedValueOnce(new Error('Database error'))

      const result = await updateTag('tag-1', 'New Name')

      expect(result).toEqual({ error: 'Failed to update tag' })
    })
  })
})
