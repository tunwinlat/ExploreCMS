import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')
  const limit = 10 // Fixed payload size

  try {
    const posts = await prisma.post.findMany({
      where: { published: true },
      take: limit + 1, // Fetch one extra to check if there's a next page
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { username: true, firstName: true }
        },
        tags: true,
        views: true
      }
    })

    let nextCursor: typeof cursor | undefined = undefined;
    if (posts.length > limit) {
      const nextItem = posts.pop() // Remove the extra item
      nextCursor = nextItem!.id
    }

    return NextResponse.json({
      posts,
      nextCursor
    })
  } catch (error) {
    console.error("Pagination API Error:", error)
    return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 })
  }
}
