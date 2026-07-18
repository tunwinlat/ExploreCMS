/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/db'
import {
  acquireBackgroundJobLease,
  releaseBackgroundJobLease,
  renewBackgroundJobLease,
} from './backgroundJobLock'

vi.mock('@/lib/db', () => ({
  prisma: {
    backgroundJobLock: {
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

const mockCreate = prisma.backgroundJobLock.create as unknown as ReturnType<typeof vi.fn>
const mockUpdateMany = prisma.backgroundJobLock.updateMany as unknown as ReturnType<typeof vi.fn>
const mockDeleteMany = prisma.backgroundJobLock.deleteMany as unknown as ReturnType<typeof vi.fn>

describe('background job leases', () => {
  beforeEach(() => vi.clearAllMocks())

  it('acquires a new lease in the shared database', async () => {
    mockCreate.mockResolvedValue({})

    const lease = await acquireBackgroundJobLease('craft-sync', 60_000)

    expect(lease).toEqual({ name: 'craft-sync', ownerToken: expect.any(String) })
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        name: 'craft-sync',
        ownerToken: lease!.ownerToken,
        leaseUntil: expect.any(Date),
      },
    })
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it('does not acquire a lease held by another instance', async () => {
    mockCreate.mockRejectedValue({ code: 'P2002' })
    mockUpdateMany.mockResolvedValue({ count: 0 })

    const lease = await acquireBackgroundJobLease('craft-sync', 60_000)

    expect(lease).toBeNull()
    expect(mockUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { name: 'craft-sync', leaseUntil: { lt: expect.any(Date) } },
    }))
  })

  it('atomically takes over an expired lease', async () => {
    mockCreate.mockRejectedValue({ code: 'P2002' })
    mockUpdateMany.mockResolvedValue({ count: 1 })

    const lease = await acquireBackgroundJobLease('craft-sync', 60_000)

    expect(lease).not.toBeNull()
  })

  it('only releases a lease with the matching owner token', async () => {
    mockDeleteMany.mockResolvedValue({ count: 1 })
    const lease = { name: 'craft-sync', ownerToken: 'owner-1' }

    await releaseBackgroundJobLease(lease)

    expect(mockDeleteMany).toHaveBeenCalledWith({ where: lease })
  })

  it('renews only a lease with the matching owner token', async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 })
    const lease = { name: 'craft-sync', ownerToken: 'owner-1' }

    const renewed = await renewBackgroundJobLease(lease, 60_000)

    expect(renewed).toBe(true)
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: lease,
      data: { leaseUntil: expect.any(Date) },
    })
  })
})
