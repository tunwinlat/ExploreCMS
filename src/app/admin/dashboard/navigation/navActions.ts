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
  if (!payload || payload.role !== 'OWNER') {
    throw new Error('Unauthorized')
  }

  // Validate JSON format and enforce size limit
  try {
    JSON.parse(navigationConfig)
  } catch {
    throw new Error('Invalid navigation configuration: must be valid JSON')
  }
  if (navigationConfig.length > 50000) {
    throw new Error('Navigation configuration is too large')
  }

  try {
    await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      update: { navigationConfig },
      create: {
        id: 'singleton',
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
