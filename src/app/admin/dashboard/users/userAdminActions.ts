/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

const VALID_ROLES = ['OWNER', 'COLLABORATOR'] as const

export async function updateUserRole(userId: string, newRole: string) {
  const payload = await verifySession()
  if (!payload || payload.role !== 'OWNER') {
    throw new Error('Unauthorized')
  }

  if (!VALID_ROLES.includes(newRole as (typeof VALID_ROLES)[number])) {
    throw new Error('Invalid role')
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole }
    })
    revalidatePath('/admin/dashboard/users')
    return { success: true }
  } catch (error) {
    console.error('Error updating user role:', error)
    throw new Error('Failed to update user role')
  }
}

export async function deleteUser(userId: string) {
  const payload = await verifySession()
  if (!payload || payload.role !== 'OWNER') {
    throw new Error('Unauthorized')
  }

  // Prevent self-deletion
  if (userId === payload.userId) {
    throw new Error('Cannot delete your own account')
  }

  // Prevent deleting the last owner
  const userToDelete = await prisma.user.findUnique({ where: { id: userId } })
  if (!userToDelete) throw new Error('User not found')
  if (userToDelete.role === 'OWNER') {
    const ownerCount = await prisma.user.count({ where: { role: 'OWNER' } })
    if (ownerCount <= 1) throw new Error('Cannot delete the last owner')
  }

  try {
    await prisma.user.delete({
      where: { id: userId }
    })
    revalidatePath('/admin/dashboard/users')
    return { success: true }
  } catch (error) {
    console.error('Error deleting user:', error)
    throw new Error('Failed to delete user')
  }
}
