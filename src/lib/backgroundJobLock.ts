/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'

export interface BackgroundJobLease {
  name: string
  ownerToken: string
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

/**
 * Acquire a database-backed lease. Unlike a module-level flag, this is shared
 * by every serverless instance connected to the same database.
 */
export async function acquireBackgroundJobLease(
  name: string,
  durationMs: number
): Promise<BackgroundJobLease | null> {
  const now = new Date()
  const ownerToken = randomUUID()
  const leaseUntil = new Date(now.getTime() + durationMs)
  const lease = { name, ownerToken }

  try {
    await prisma.backgroundJobLock.create({
      data: { name, ownerToken, leaseUntil },
    })
    return lease
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error
  }

  const claimed = await prisma.backgroundJobLock.updateMany({
    where: { name, leaseUntil: { lt: now } },
    data: { ownerToken, leaseUntil },
  })

  return claimed.count === 1 ? lease : null
}

/** Extend a lease only while it is still owned by this caller. */
export async function renewBackgroundJobLease(
  lease: BackgroundJobLease,
  durationMs: number
): Promise<boolean> {
  const renewed = await prisma.backgroundJobLock.updateMany({
    where: { name: lease.name, ownerToken: lease.ownerToken },
    data: { leaseUntil: new Date(Date.now() + durationMs) },
  })

  return renewed.count === 1
}

/** Release only the lease owned by this caller; an expired successor is safe. */
export async function releaseBackgroundJobLease(lease: BackgroundJobLease): Promise<void> {
  await prisma.backgroundJobLock.deleteMany({
    where: { name: lease.name, ownerToken: lease.ownerToken },
  })
}
