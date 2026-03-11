'use server'

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function updateSiteSettings(title: string, faviconUrl: string | null, headerTitle: string, headerDescription: string, theme: string) {
  const session = await verifySession()
  if (!session || session.role !== 'OWNER') return { error: 'Unauthorized' }

  try {
    await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      update: { title, faviconUrl, headerTitle, headerDescription, theme },
      create: { id: 'singleton', title, faviconUrl, headerTitle, headerDescription, theme }
    })
    
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to update site settings' }
  }
}
