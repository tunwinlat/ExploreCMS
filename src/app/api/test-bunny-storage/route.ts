/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const session = await verifySession()
    if (session?.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { region, storageZoneName, apiKey, cdnUrl } = await req.json()

    if (!region || !storageZoneName || !apiKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Test connection by listing files
    const baseUrl = region && region !== 'de' 
      ? `${region}.storage.bunnycdn.com`
      : 'storage.bunnycdn.com'
    
    const listUrl = `https://${baseUrl}/${storageZoneName}/`
    
    console.log('Testing Bunny Storage connection to:', listUrl)

    const response = await fetch(listUrl, {
      method: 'GET',
      headers: {
        'AccessKey': apiKey,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Bunny Storage test failed:', response.status, error)
      return NextResponse.json({ 
        error: `Connection failed: ${response.status}`, 
        details: error 
      }, { status: 500 })
    }

    const files = await response.json()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Connection successful',
      fileCount: Array.isArray(files) ? files.length : 0,
      baseUrl
    })

  } catch (error: any) {
    console.error('Test Bunny Storage Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to test connection' 
    }, { status: 500 })
  }
}
