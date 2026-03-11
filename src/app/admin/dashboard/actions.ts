/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { destroySession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function logout() {
  await destroySession()
  redirect('/admin/login')
}
