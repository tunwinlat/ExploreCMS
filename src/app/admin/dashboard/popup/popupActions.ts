/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getPopupConfig() {
  const config = await prisma.popupConfig.findUnique({
    where: { id: 'singleton' }
  })
  return config
}

export async function togglePopupEnabled(enabled: boolean) {
  const payload = await verifySession()
  if (!payload || payload.role !== 'OWNER') {
    throw new Error('Unauthorized')
  }

  try {
    await prisma.popupConfig.upsert({
      where: { id: 'singleton' },
      update: { enabled },
      create: { id: 'singleton', enabled }
    })
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Error toggling popup:', error)
    return { error: 'Failed to toggle popup' }
  }
}

export async function updatePopupConfig(
  enabled: boolean,
  title: string,
  content: string,
  displayMode: string
) {
  const payload = await verifySession()
  if (!payload || payload.role !== 'OWNER') {
    throw new Error('Unauthorized')
  }

  if (title && title.length > 500) {
    return { error: 'Title must be 500 characters or fewer' }
  }
  if (content && content.length > 10000) {
    return { error: 'Content must be 10,000 characters or fewer' }
  }
  const validModes = ['toast', 'modal', 'banner']
  if (displayMode && !validModes.includes(displayMode)) {
    return { error: 'Invalid display mode' }
  }

  try {
    await prisma.popupConfig.upsert({
      where: { id: 'singleton' },
      update: { enabled, title, content, displayMode },
      create: { id: 'singleton', enabled, title, content, displayMode }
    })
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Error updating popup config:', error)
    return { error: 'Failed to update popup configuration' }
  }
}
