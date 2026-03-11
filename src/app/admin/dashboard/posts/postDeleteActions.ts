'use server'

import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function deletePostById(id: string) {
  const session = await verifySession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) return { success: false, error: 'Not found' }

    // Only Owner or the Author can delete
    if (session.role !== 'OWNER' && post.authorId !== session.userId) {
      return { success: false, error: 'Permission denied' }
    }

    await prisma.post.delete({ where: { id } })
    
    revalidatePath('/admin/dashboard')
    revalidatePath('/')
    
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error: 'Database error deleting post' }
  }
}
