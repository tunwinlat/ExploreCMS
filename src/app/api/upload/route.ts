import { createWriteStream, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const session = await verifySession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Ensure uploads directory exists
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true })
    }

    const fileExtension = file.name.split('.').pop()
    const filename = `${uuidv4()}.${fileExtension}`
    const path = join(uploadDir, filename)

    // Write file
    const stream = createWriteStream(path)
    stream.write(buffer)
    stream.end()

    return NextResponse.json({ url: `/uploads/${filename}` })

  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Error uploading file' }, { status: 500 })
  }
}
