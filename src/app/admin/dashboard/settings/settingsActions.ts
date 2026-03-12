/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function updateSiteSettings(title: string, faviconUrl: string | null, headerTitle: string, headerDescription: string, theme: string, footerText: string) {
  const payload = await verifySession()
  if (!payload || payload.role !== 'OWNER') {
    throw new Error('Unauthorized')
  }

  try {
    await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      update: { title, faviconUrl, headerTitle, headerDescription, theme, footerText },
      create: { id: 'singleton', title, faviconUrl, headerTitle, headerDescription, theme, footerText }
    })
    
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to update site settings' }
  }
}
