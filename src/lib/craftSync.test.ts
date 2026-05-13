import { describe, it, expect, vi } from 'vitest'

// Mocking everything needed before importing craftSync
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: () => {},
    set: () => {},
    delete: () => {},
  }),
}))

vi.mock('uuid', () => ({
  v4: () => 'test-uuid',
}))

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn()
}))

// Mock @prisma/client
vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    user = { findFirst: async () => ({ id: 'owner-id' }) }
    siteSettings = { findUnique: async () => ({ bunnyStorageEnabled: false }), update: async () => ({}) }
    post = {
        findMany: async () => [],
        delete: async () => ({}),
        deleteMany: async () => ({ count: 0 }),
        findFirst: async () => null,
        update: async () => ({}),
        create: async () => ({}),
        findUnique: async () => null
    }
    $queryRaw = async () => []
  }
}))

vi.mock('@prisma/adapter-libsql', () => ({
  PrismaLibSQL: class {}
}))

// We'll import these after mocks are set up
import { craftImportSync } from './craftSync'
import { getPostDb } from './bunnyDb'
import { CraftClient } from './craft'

describe('craftImportSync performance optimization', () => {
  it('verifies batch deletes in fullSync mode', async () => {
    const mockPostDb = await getPostDb()
    const mockCraftClient = new CraftClient('url', 'token')

    // 1. Setup Craft documents (empty, so all linked posts should be deleted)
    mockCraftClient.getDocuments = async () => []

    // 2. Setup linked posts in DB
    const linkedPosts = [
      { id: 'post-1', craftDocumentId: 'doc-1', title: 'Post 1' },
      { id: 'post-2', craftDocumentId: 'doc-2', title: 'Post 2' },
      { id: 'post-3', craftDocumentId: 'doc-3', title: 'Post 3' },
    ]
    mockPostDb.post.findMany = async () => linkedPosts

    const deleteSpy = vi.spyOn(mockPostDb.post as any, 'delete')
    const deleteManySpy = vi.spyOn(mockPostDb.post as any, 'deleteMany').mockImplementation(async () => ({ count: 3 }))

    // 3. Run craftImportSync in fullSync mode
    const result = await craftImportSync(mockCraftClient, 'folder-id', false, true)

    // 4. Verify results
    expect(result.deleted).toBe(3)

    // Verify that the iterative delete is NOT called
    expect(deleteSpy).toHaveBeenCalledTimes(0)

    // Verify that deleteMany IS called once with correct IDs
    expect(deleteManySpy).toHaveBeenCalledTimes(1)
    expect(deleteManySpy).toHaveBeenCalledWith({
      where: { id: { in: ['post-1', 'post-2', 'post-3'] } }
    })
  })
})
