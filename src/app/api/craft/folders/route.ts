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

  // Use provided token, or fetch from database if loading folders for existing config
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

  try {
    const client = new CraftClient(serverUrl, tokenToUse)
    const folders = await client.getFolders()
    return NextResponse.json({ folders })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export const runtime = 'edge';
