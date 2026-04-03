/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { savePost } from './postActions'
import { getPostDb } from '@/lib/bunnyDb'
import { vi } from 'vitest'

vi.mock('@/lib/bunnyDb', () => ({
  getPostDb: vi.fn(),
}))

// stub verifySession so we don't need real auth
vi.mock('@/lib/auth', () => ({
  verifySession: vi.fn().mockResolvedValue({ userId: 'user-1' })
}))

// stub revalidatePath/redirect since we don't run in Next environment
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))
vi.mock('next/server', () => ({
  after: vi.fn((cb) => cb()),
}))
vi.mock('@/lib/craftSync', () => ({
  pushPostToCraft: vi.fn(),
  getCraftSyncMode: vi.fn().mockResolvedValue('read-only'),
  deletePostFromCraft: vi.fn()
}))

describe('savePost action', () => {
  let mockUpdate: ReturnType<typeof vi.fn>
  let mockCreate: ReturnType<typeof vi.fn>
  let mockPostDb: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate = vi.fn()
    mockCreate = vi.fn()
    mockPostDb = {
      post: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: mockUpdate,
        create: mockCreate.mockResolvedValue({ id: 'new-id' }),
      },
    };
    (getPostDb as any).mockImplementation(async () => mockPostDb);
  })

  function makeFormData(fields: Record<string, string|null>) {
    const fd = new FormData()
    Object.entries(fields).forEach(([k,v]) => {
      if (v !== null) fd.set(k, v)
    })
    return fd
  }

  it('updates existing post and preserves isFeatured when absent from form', async () => {
    // mock fetch for existing flag
    const { getPostDb } = await import('@/lib/bunnyDb')
    const postDb = await getPostDb()
    ;(postDb.post.findUnique as any).mockResolvedValue({ isFeatured: true })

    const data = makeFormData({
      id: 'p1',
      title: 'Test',
      slug: 'test',
      content: 'hello',
      published: 'true',
      language: 'en',
      // no isFeatured entry
      tags: ''
    })

    await savePost(data, { redirect: false })

    expect(postDb.post.findUnique).toHaveBeenCalledWith({ where: { id: 'p1' }, select: { isFeatured: true } })
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'p1' },
      data: expect.objectContaining({ isFeatured: true })
    }))
  })

  it('allows explicitly turning featured off', async () => {
    const data = makeFormData({
      id: 'p2',
      title: 'Another',
      slug: 'another',
      content: 'bye',
      published: 'false',
      isFeatured: 'false',
      language: 'en',
      tags: ''
    })

    await savePost(data, { redirect: false })
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ isFeatured: false })
    }))
  })

  it('creates new posts with provided featured flag', async () => {
    const data = makeFormData({
      title: 'New post',
      slug: '',
      content: 'ok',
      published: 'true',
      isFeatured: 'true',
      language: 'en',
      tags: ''
    })
    await savePost(data, { redirect: false })
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ isFeatured: true })
    }))
  })
})
