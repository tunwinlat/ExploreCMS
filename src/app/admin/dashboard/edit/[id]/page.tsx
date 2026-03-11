import { prisma } from '@/lib/db'
import { getPostDb } from '@/lib/bunnyDb'
import PostEditor from '../../PostEditor'
import { notFound } from 'next/navigation'

export const metadata = { title: "Edit Post | ExploreCMS" }

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postDb = await getPostDb();
  
  const post = await postDb.post.findUnique({
    where: { id },
    include: { tags: { select: { name: true, slug: true } } }
  })

  // Tags remain on local DB to avoid complex M-M syncing across entirely separate providers, 
  // though for a fully detached setup, we would query postDb.tag here. 
  // Let's actually pull Tags from Edge DB too since we synced the schemas!
  const availableTags = await postDb.tag.findMany({ 
    select: { name: true, slug: true }, 
    orderBy: { name: 'asc' } 
  })

  if (!post) notFound()

  return <PostEditor post={post} availableTags={availableTags} />
}
