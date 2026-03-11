import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { slug } = body;
    
    const cookieStore = await cookies();
    const viewedCookie = cookieStore.get('viewed_pages')?.value;
    
    let viewedPages: string[] = [];
    if (viewedCookie) {
      try {
        viewedPages = JSON.parse(viewedCookie);
      } catch (e) {
        // invalid cookie
      }
    }

    const isUniqueGlobal = !viewedPages.includes('global_site');
    const isUniquePost = slug && !viewedPages.includes(`post_${slug}`);

    // Track Global Views
    await prisma.siteAnalytics.upsert({
      where: { id: 'singleton' },
      update: {
        totalViews: { increment: 1 },
        ...(isUniqueGlobal ? { uniqueViews: { increment: 1 } } : {})
      },
      create: {
        id: 'singleton',
        totalViews: 1,
        uniqueViews: 1,
      }
    });

    if (isUniqueGlobal) viewedPages.push('global_site');

    // Track Post Views
    if (slug) {
      const post = await prisma.post.findUnique({ where: { slug } });
      if (post) {
        await prisma.postView.upsert({
          where: { postId: post.id },
          update: {
            totalViews: { increment: 1 },
            ...(isUniquePost ? { uniqueViews: { increment: 1 } } : {})
          },
          create: {
            postId: post.id,
            totalViews: 1,
            uniqueViews: 1,
          }
        });
        if (isUniquePost) viewedPages.push(`post_${slug}`);
      }
    }

    const res = NextResponse.json({ success: true });
    
    if (isUniqueGlobal || isUniquePost) {
      // Set the cookie for 30 days
      res.cookies.set({
        name: 'viewed_pages',
        value: JSON.stringify(viewedPages),
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: true,
        sameSite: 'lax',
      });
    }

    return res;
  } catch (error) {
    console.error('View tracking error', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
