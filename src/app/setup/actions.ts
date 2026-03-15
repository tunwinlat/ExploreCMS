/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { prisma } from '@/lib/db'
import { hash } from 'bcryptjs'
import { createSession } from '@/lib/auth'

export async function setupAdmin(formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username || !password || password.length < 8) {
    return { error: 'Invalid username or password (min 8 chars)' }
  }

  const existingOwner = await prisma.user.findFirst({
    where: { role: 'OWNER' }
  })

  if (existingOwner) {
    return { error: 'Instance already set up' }
  }

  const hashedPassword = await hash(password, 10)

  const user = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      role: 'OWNER'
    }
  })

  await createSession({ userId: user.id, username: user.username, role: user.role })

  return { success: true }
}
