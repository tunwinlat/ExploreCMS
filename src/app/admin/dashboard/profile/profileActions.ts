/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

export async function updateUserProfile(formData: FormData) {
  const session = await verifySession()
  if (!session) return { error: 'Unauthorized' }

  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const password = formData.get('password') as string

  try {
    const updateData: any = {
      firstName: firstName || null,
      lastName: lastName || null,
    }

    if (password) {
      if (password.length < 8) {
        return { error: 'Password must be at least 8 characters' }
      }
      const hashedPassword = await bcrypt.hash(password, 10)
      updateData.password = hashedPassword
    }

    await prisma.user.update({
      where: { id: (session as { userId: string }).userId },
      data: updateData
    })
    revalidatePath('/admin/dashboard/profile')
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Error updating profile:', error)
    return { error: 'Failed to update profile' }
  }
}
