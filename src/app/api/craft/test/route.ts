/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { CraftClient } from '@/lib/craft'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session || session.role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { serverUrl, apiToken } = await req.json()
  if (!serverUrl) {
    return NextResponse.json({ error: 'Server URL is required' }, { status: 400 })
  }

  // Use provided token, or fetch from database if testing existing config
  let tokenToUse = apiToken
  if (!tokenToUse) {
    const settings = await (prisma as any).siteSettings.findUnique({
      where: { id: 'singleton' },
      select: { craftApiToken: true }
    })
    if (settings?.craftApiToken) {
      tokenToUse = decrypt(settings.craftApiToken)
    }
  }

  if (!tokenToUse) {
    return NextResponse.json({ error: 'API token is required' }, { status: 400 })
  }

  const client = new CraftClient(serverUrl, tokenToUse)
  const result = await client.testConnection(true) // Check write access on explicit test
  return NextResponse.json(result)
}

export const runtime = 'edge';
