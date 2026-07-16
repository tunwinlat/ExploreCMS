/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateApiKey, sanitizePermissions } from '@/lib/apiKeys'
import { revalidatePath } from 'next/cache'

async function requireOwner() {
  const session = await verifySession()
  if (!session || session.role !== 'OWNER') return null
  return session
}

/**
 * Create a new API key. Returns the plaintext key exactly once —
 * it is never stored and cannot be recovered later.
 */
export async function createApiKey(
  name: string,
  permissions: string[],
  expiresAt: string | null
): Promise<{ success?: boolean; error?: string; plaintextKey?: string }> {
  const session = await requireOwner()
  if (!session) return { error: 'Unauthorized' }

  const trimmed = name?.trim()
  if (!trimmed || trimmed.length === 0 || trimmed.length > 100) {
    return { error: 'Key name must be between 1 and 100 characters' }
  }

  const cleanPermissions = sanitizePermissions(permissions)
  if (cleanPermissions.length === 0) {
    return { error: 'Select at least one permission' }
  }

  let expires: Date | null = null
  if (expiresAt) {
    const parsed = new Date(expiresAt)
    if (Number.isNaN(parsed.getTime())) return { error: 'Invalid expiration date' }
    if (parsed.getTime() < Date.now()) return { error: 'Expiration date must be in the future' }
    expires = parsed
  }

  try {
    const { plaintext, hash, prefix } = generateApiKey()

    await prisma.apiKey.create({
      data: {
        name: trimmed,
        keyHash: hash,
        prefix,
        permissions: JSON.stringify(cleanPermissions),
        createdById: session.userId as string,
        expiresAt: expires,
      },
    })

    revalidatePath('/admin/dashboard/api-keys')
    return { success: true, plaintextKey: plaintext }
  } catch (error) {
    console.error('Failed to create API key:', error)
    return { error: 'Failed to create API key' }
  }
}

/** Replace the permission set of an existing key. */
export async function updateApiKeyPermissions(
  id: string,
  permissions: string[]
): Promise<{ success?: boolean; error?: string }> {
  const session = await requireOwner()
  if (!session) return { error: 'Unauthorized' }

  const cleanPermissions = sanitizePermissions(permissions)
  if (cleanPermissions.length === 0) {
    return { error: 'Select at least one permission' }
  }

  try {
    await prisma.apiKey.update({
      where: { id },
      data: { permissions: JSON.stringify(cleanPermissions) },
    })
    revalidatePath('/admin/dashboard/api-keys')
    return { success: true }
  } catch {
    return { error: 'Failed to update API key' }
  }
}

/** Rename an existing key. */
export async function renameApiKey(
  id: string,
  name: string
): Promise<{ success?: boolean; error?: string }> {
  const session = await requireOwner()
  if (!session) return { error: 'Unauthorized' }

  const trimmed = name?.trim()
  if (!trimmed || trimmed.length === 0 || trimmed.length > 100) {
    return { error: 'Key name must be between 1 and 100 characters' }
  }

  try {
    await prisma.apiKey.update({ where: { id }, data: { name: trimmed } })
    revalidatePath('/admin/dashboard/api-keys')
    return { success: true }
  } catch {
    return { error: 'Failed to rename API key' }
  }
}

/** Revoke or restore a key. Revoked keys are rejected at authentication time. */
export async function setApiKeyRevoked(
  id: string,
  revoked: boolean
): Promise<{ success?: boolean; error?: string }> {
  const session = await requireOwner()
  if (!session) return { error: 'Unauthorized' }

  try {
    await prisma.apiKey.update({ where: { id }, data: { revoked } })
    revalidatePath('/admin/dashboard/api-keys')
    return { success: true }
  } catch {
    return { error: `Failed to ${revoked ? 'revoke' : 'restore'} API key` }
  }
}

/** Permanently delete a key. */
export async function deleteApiKey(id: string): Promise<{ success?: boolean; error?: string }> {
  const session = await requireOwner()
  if (!session) return { error: 'Unauthorized' }

  try {
    await prisma.apiKey.delete({ where: { id } })
    revalidatePath('/admin/dashboard/api-keys')
    return { success: true }
  } catch {
    return { error: 'Failed to delete API key' }
  }
}
