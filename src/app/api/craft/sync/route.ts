/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { runCraftSync } from '@/lib/craftSync'

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session || session.role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let force = false
  try {
    const body = await req.json()
    force = !!body.force
  } catch {
    // No body or invalid JSON — default to not forcing
  }

  try {
    const result = await runCraftSync({ manual: true, force })
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
