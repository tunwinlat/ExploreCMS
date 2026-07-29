/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextResponse } from 'next/server'
import { requireApiPermission } from '@/lib/apiAuth'
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE,
  isValidImageSignature,
  storeImage,
} from '@/lib/upload'

// POST /api/v1/media — upload an image (requires media:create)
// multipart/form-data with a single "file" field; returns { url } for
// embedding in post content. Storage backend matches the admin upload
// endpoint (Bunny Storage when enabled, local public/uploads otherwise).
export async function POST(request: Request) {
  const auth = await requireApiPermission(request, 'media:create')
  if (auth.error) return auth.error

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Enforce file size limit
    if (file.size > MAX_IMAGE_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10 MB.' }, { status: 413 })
    }

    // Validate file type against an explicit allowlist of safe image types
    const mimeType = file.type.toLowerCase()
    if (!Object.prototype.hasOwnProperty.call(ALLOWED_IMAGE_MIME_TYPES, mimeType)) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 415 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Prevent MIME spoofing by verifying magic bytes
    if (!isValidImageSignature(buffer, mimeType)) {
      return NextResponse.json({ error: 'File content does not match the provided image type.' }, { status: 415 })
    }

    const url = await storeImage(buffer, mimeType)
    return NextResponse.json({ url }, { status: 201 })
  } catch (error) {
    console.error('[API v1] Failed to upload media:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
