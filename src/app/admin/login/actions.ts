/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { prisma } from '@/lib/db'
import { compare } from 'bcryptjs'
import { createSession } from '@/lib/auth'

export async function loginUser(formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username || !password) {
    return { error: 'Missing credentials.' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username }
    })

    if (!user) {
      return { error: 'Invalid username or password.' }
    }

    const matches = await compare(password, user.password)

    if (!matches) {
      return { error: 'Invalid username or password.' }
    }

    await createSession({ userId: user.id, username: user.username, role: user.role })

    return { success: true }
  } catch {
    return { error: 'Unable to sign in. Please try again.' }
  }
}
