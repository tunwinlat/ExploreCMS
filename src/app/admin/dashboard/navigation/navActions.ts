/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function updateNavigationConfig(navigationConfig: string) {
  const payload = await verifySession()
  if (!payload || payload.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  try {
    await prisma.siteSettings.upsert({
      where: { id: 'default' },
      update: { navigationConfig },
      create: {
        id: 'default',
        title: 'ExploreCMS',
        navigationConfig
      }
    })
    revalidatePath('/')
    revalidatePath('/admin/dashboard/navigation')
    return { success: true }
  } catch (error) {
    console.error('Error updating navigation:', error)
    throw new Error('Failed to update navigation')
  }
}
