'use server'

import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/auth'
import { redirect } from 'next/navigation'

function generateSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

export async function savePost(formData: FormData, options: { redirect?: boolean } = { redirect: true }) {
  const session = await verifySession()
  if (!session) throw new Error('Unauthorized')

  const id = formData.get('id') as string | null
  const title = formData.get('title') as string
  const slugInput = formData.get('slug') as string | null
  const content = formData.get('content') as string
  const published = formData.get('published') === 'true'
  const isFeatured = formData.get('isFeatured') === 'true'
  const tagsString = formData.get('tags') as string || ''

  if (!title || !content) return { error: 'Title and content are required' }

  // Process Tags
  const tagNames = tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0)
  const tagUpdates = tagNames.map(name => ({
    where: { name },
    create: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }
  }))

  let slug = slugInput ? generateSlug(slugInput) : generateSlug(title)

  if (id) {
    // If slug changed, verify uniqueness
    const existing = await prisma.post.findFirst({ where: { slug, id: { not: id } } })
    if (existing) slug = `${slug}-${Date.now()}`

    await prisma.post.update({
      where: { id },
      data: { 
        title, slug, content, published, isFeatured,
        tags: {
          set: [], // Clear old tags
          connectOrCreate: tagUpdates
        }
      }
    })
  } else {
    // Generate unique slug
    let existing = await prisma.post.findUnique({ where: { slug } })
    if (existing) slug = `${slug}-${Date.now()}`

    await prisma.post.create({
      data: {
        title,
        slug,
        content,
        published,
        isFeatured,
        authorId: session.userId as string,
        tags: {
          connectOrCreate: tagUpdates
        }
      }
    })
  }

  if (options.redirect) {
    redirect('/admin/dashboard')
  }

  return { success: true }
}

export async function deletePost(id: string) {
  const session = await verifySession()
  if (!session) throw new Error('Unauthorized')

  await prisma.post.delete({ where: { id } })
  redirect('/admin/dashboard')
}
