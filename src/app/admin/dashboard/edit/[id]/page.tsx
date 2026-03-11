import { prisma } from '@/lib/db'
import PostEditor from '../../PostEditor'
import { notFound } from 'next/navigation'

export const metadata = { title: "Edit Post | ExploreCMS" }

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await prisma.post.findUnique({
    where: { id },
    include: { tags: { select: { name: true, slug: true } } }
  })

  const availableTags = await prisma.tag.findMany({ 
    select: { name: true, slug: true }, 
    orderBy: { name: 'asc' } 
  })

  if (!post) notFound()

  return <PostEditor post={post} availableTags={availableTags} />
}
