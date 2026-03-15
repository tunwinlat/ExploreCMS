/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { CraftClient } from '@/lib/craft'

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session || session.role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { serverUrl, apiToken } = await req.json()
  if (!serverUrl || !apiToken) {
    return NextResponse.json({ error: 'Server URL and API token are required' }, { status: 400 })
  }

  const client = new CraftClient(serverUrl, apiToken)
  const result = await client.testConnection()
  return NextResponse.json(result)
}
