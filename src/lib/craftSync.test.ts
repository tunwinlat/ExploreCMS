/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect, vi } from 'vitest'

const { mockAcquireLease, mockReleaseLease } = vi.hoisted(() => ({
  mockAcquireLease: vi.fn(),
  mockReleaseLease: vi.fn(),
}))

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

vi.mock('@/lib/backgroundJobLock', () => ({
  acquireBackgroundJobLease: mockAcquireLease,
  releaseBackgroundJobLease: mockReleaseLease,
  renewBackgroundJobLease: vi.fn(),
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
import { craftImportSync, runCraftSync } from './craftSync'
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

    deleteSpy.mockRestore()
    deleteManySpy.mockRestore()
  })

  it('does not import an already-linked exact title collision as a live duplicate', async () => {
    const mockPostDb = await getPostDb()
    const mockCraftClient = new CraftClient('url', 'token')
    mockCraftClient.getDocuments = async () => [{
      id: 'duplicate-doc',
      title: 'Same Post',
      lastModifiedAt: '2026-07-17T15:18:00.000Z',
    }]
    mockCraftClient.getDocumentMarkdown = async () => '# Same content'

    mockPostDb.post.findFirst = async () => null
    mockPostDb.post.findUnique = async () => ({
      id: 'original-post',
      title: '  SAME   POST ',
      slug: 'same-post',
      language: 'en',
      craftDocumentId: 'original-doc',
      craftUnlinked: false,
    }) as any
    const createSpy = vi.spyOn(mockPostDb.post as any, 'create')

    const result = await craftImportSync(mockCraftClient, 'folder-id')

    expect(result.imported).toBe(0)
    expect(result.errors).toEqual([
      'Skipped duplicate Craft document "Same Post" (duplicate-doc)',
    ])
    expect(createSpy).not.toHaveBeenCalled()
    createSpy.mockRestore()
  })

  it('reconciles an unlinked API post with its first matching Craft document', async () => {
    const mockPostDb = await getPostDb()
    const mockCraftClient = new CraftClient('url', 'token')
    mockCraftClient.getDocuments = async () => [{
      id: 'first-craft-doc',
      title: 'API Post',
      lastModifiedAt: '2026-07-17T15:17:00.000Z',
    }]
    mockCraftClient.getDocumentMarkdown = async () => '# API content'

    mockPostDb.post.findFirst = async () => null
    mockPostDb.post.findUnique = async () => ({
      id: 'api-post',
      title: 'API Post',
      slug: 'api-post',
      language: 'en',
      craftDocumentId: null,
      craftUnlinked: false,
    }) as any
    const updateSpy = vi.spyOn(mockPostDb.post as any, 'update').mockResolvedValue({})
    const createSpy = vi.spyOn(mockPostDb.post as any, 'create')

    const result = await craftImportSync(mockCraftClient, 'folder-id')

    expect(result.updated).toBe(1)
    expect(result.imported).toBe(0)
    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: 'api-post' },
      data: {
        content: '# API content',
        contentFormat: 'markdown',
        craftDocumentId: 'first-craft-doc',
        craftLastModifiedAt: '2026-07-17T15:17:00.000Z',
      },
    })
    expect(createSpy).not.toHaveBeenCalled()
    updateSpy.mockRestore()
    createSpy.mockRestore()
  })
})

describe('runCraftSync distributed lease', () => {
  it('does not start a manual sync while another instance owns the lease', async () => {
    mockAcquireLease.mockResolvedValueOnce(null)

    const result = await runCraftSync({ manual: true })

    expect(result.errors).toEqual(['Sync already in progress'])
    expect(mockReleaseLease).not.toHaveBeenCalled()
  })

  it('releases the lease when Craft sync is disabled', async () => {
    const lease = { name: 'craft-sync', ownerToken: 'owner-1' }
    mockAcquireLease.mockResolvedValueOnce(lease)
    mockReleaseLease.mockResolvedValueOnce(undefined)

    const result = await runCraftSync({ manual: true })

    expect(result.errors).toEqual([])
    expect(mockReleaseLease).toHaveBeenCalledWith(lease)
  })
})
