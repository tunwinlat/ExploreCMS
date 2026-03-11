import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'

export const metadata = { title: "Creating Draft | ExploreCMS" }

export default async function NewPostPage() {
  const session = await verifySession()
  if (!session) redirect('/admin/login')

  const draft = await prisma.post.create({
    data: {
      title: '',
      slug: `draft-${randomUUID()}`,
      content: '',
      published: false,
      isFeatured: false,
      authorId: session.userId as string,
    }
  })

  redirect(`/admin/dashboard/edit/${draft.id}`)
}
