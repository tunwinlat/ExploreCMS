/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

import { getPostDb } from '@/lib/bunnyDb';

export async function POST(req: Request) {
  try {
    // Rate limiting
    const clientIP = getClientIP(req)
    const rateLimit = checkRateLimit(clientIP, RATE_LIMITS.tracking)
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'X-RateLimit-Reset': String(rateLimit.resetTime) } }
      )
    }

    const body = await req.json().catch(() => ({}));
    const { slug } = body;

    // Slug is optional - if provided, we track post views
    // If not provided, we only track global site views

    const postDb = await getPostDb();
    
    const cookieStore = await cookies();
    const viewedCookie = cookieStore.get('viewed_pages')?.value;
    
    let viewedPages: string[] = [];
    if (viewedCookie) {
      try {
        const parsed = JSON.parse(viewedCookie);
        viewedPages = Array.isArray(parsed) ? parsed : [];
        // Cap cookie size to prevent unbounded growth
        if (viewedPages.length > 500) {
          viewedPages = viewedPages.slice(-500);
        }
      } catch (_e) {
        // invalid cookie
      }
    }

    const isUniqueGlobal = !viewedPages.includes('global_site');
    const isUniquePost = slug && !viewedPages.includes(`post_${slug}`);

    // Fetch post first if slug provided
    let post = null;
    if (slug) {
      post = await postDb.post.findUnique({
        where: { slug },
        select: { id: true }
      });
    }

    // ⚡ Bolt: Parallelize independent database queries
    const promises: Promise<any>[] = [];

    // Track Global Views
    promises.push(
      prisma.siteAnalytics.upsert({
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
      }).then(() => {
        if (isUniqueGlobal) viewedPages.push('global_site');
      })
    );

    // Track Post Views
    if (post) {
      promises.push(
        postDb.postView.upsert({
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
        }).then(() => {
          if (isUniquePost) viewedPages.push(`post_${slug}`);
        })
      );
    }

    await Promise.all(promises);

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


export const runtime = 'edge';
