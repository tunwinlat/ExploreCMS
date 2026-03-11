'use server'

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function updateNavigationConfig(navigationConfig: string) {
  const session = await verifySession()
  if (!session || session.role !== 'OWNER') return { error: 'Unauthorized' }

  try {
    // Basic JSON validation before saving
    JSON.parse(navigationConfig)
    
    await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      update: { navigationConfig },
      create: { 
        id: 'singleton', 
        title: 'ExploreCMS',
        navigationConfig 
      }
    })
    
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    return { error: 'Invalid Navigation JSON format' }
  }
}
