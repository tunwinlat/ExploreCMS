/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ComponentId } from '@/lib/components-config'

export async function updateComponentConfig(
  enabledComponents: ComponentId[],
  defaultComponent: ComponentId
) {
  const session = await verifySession()
  if (!session || session.role !== 'OWNER') throw new Error('Unauthorized')

  if (enabledComponents.length === 0) {
    return { error: 'At least one component must be enabled.' }
  }
  if (!enabledComponents.includes(defaultComponent)) {
    return { error: 'Default component must be an enabled component.' }
  }

  try {
    await (prisma as any).siteSettings.upsert({
      where: { id: 'singleton' },
      update: {
        enabledComponents: JSON.stringify(enabledComponents),
        defaultComponent,
      },
      create: {
        id: 'singleton',
        enabledComponents: JSON.stringify(enabledComponents),
        defaultComponent,
      },
    })

    revalidatePath('/', 'layout')
    revalidatePath('/blog')
    revalidatePath('/projects')
    revalidatePath('/photos')
    return { success: true }
  } catch {
    return { error: 'Failed to update component settings.' }
  }
}
