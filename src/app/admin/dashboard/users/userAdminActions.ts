/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function updateUserRole(userId: string, newRole: string) {
  const payload = await verifySession()
  if (!payload || (payload.role !== 'OWNER' && payload.role !== 'ADMIN')) {
    throw new Error('Unauthorized')
  }

  // Find the target user to perform authorization checks
  const targetUser = await prisma.user.findUnique({ where: { id: userId } })
  if (!targetUser) throw new Error('User not found')

  // Prevent anyone from granting the OWNER role (since there's only one OWNER)
  if (newRole === 'OWNER') {
    throw new Error('Unauthorized: There can only be one OWNER.')
  }

  // Prevent modifying the existing OWNER's role
  if (targetUser.role === 'OWNER') {
    throw new Error('Unauthorized: Cannot modify the OWNER.')
  }

  // ADMINs cannot modify other ADMINs
  if (payload.role === 'ADMIN' && targetUser.role === 'ADMIN') {
    throw new Error('Unauthorized: Only an OWNER can modify an ADMIN.')
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
  if (!payload || (payload.role !== 'OWNER' && payload.role !== 'ADMIN')) {
    throw new Error('Unauthorized')
  }

  // Find the target user to perform authorization checks
  const targetUser = await prisma.user.findUnique({ where: { id: userId } })
  if (!targetUser) throw new Error('User not found')

  // No one can delete the OWNER
  if (targetUser.role === 'OWNER') {
    throw new Error('Unauthorized: Cannot delete the OWNER.')
  }

  // ADMINs cannot delete other ADMINs
  if (payload.role === 'ADMIN' && targetUser.role === 'ADMIN') {
    throw new Error('Unauthorized: Only an OWNER can delete an ADMIN.')
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
