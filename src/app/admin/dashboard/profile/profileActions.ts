'use server'

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function updateUserProfile(formData: FormData) {
  const session = await verifySession()
  if (!session) return { error: 'Unauthorized' }

  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string

  try {
    await prisma.user.update({
      where: { id: (session as { userId: string }).userId },
      data: {
        firstName: firstName || null,
        lastName: lastName || null,
      }
    })
    revalidatePath('/admin/dashboard/profile')
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Error updating profile:', error)
    return { error: 'Failed to update profile' }
  }
}
