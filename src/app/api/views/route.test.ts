/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { prisma } from '@/lib/db';

// Mock Next.js NextResponse
vi.mock('next/server', () => {
  return {
    NextResponse: {
      json: vi.fn((body, init) => {
        const res = { body, ...init } as Record<string, unknown>;
        res.cookies = {
          set: vi.fn(),
        };
        return res;
      }),
    },
  };
});

// Mock cookies
const mockCookiesGet = vi.fn();
vi.mock('next/headers', () => {
  return {
    cookies: vi.fn(() => Promise.resolve({
      get: mockCookiesGet,
    })),
  };
});

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    siteAnalytics: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('@/lib/bunnyDb', () => ({
  getPostDb: vi.fn().mockResolvedValue({
    post: {
      findUnique: vi.fn(),
    },
    postView: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  })
}));

import { getPostDb } from '@/lib/bunnyDb';

describe('POST /api/views', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: Record<string, unknown>) => {
    return new Request('http://localhost:3000/api/views', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  it('returns success and tracks global view when slug is not provided', async () => {
    const req = new Request('http://localhost:3000/api/views', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    mockCookiesGet.mockReturnValue(undefined);

    const res = await POST(req);

    expect(res.body).toEqual({ success: true });
    expect(prisma.siteAnalytics.upsert).toHaveBeenCalled();
  });

  it('tracks post view and global view for first time visitor to a post', async () => {
    const slug = 'test-post';
    const req = createRequest({ slug });
    mockCookiesGet.mockReturnValue({ value: JSON.stringify(['global_site']) });

    const mockPostDb = await getPostDb();
    (mockPostDb.post.findUnique as import("vitest").Mock).mockResolvedValue({ id: 'post-1' });

    const res = await POST(req);

    expect(res.body).toEqual({ success: true });

    // Global shouldn't be unique
    expect(prisma.siteAnalytics.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { totalViews: { increment: 1 } },
    }));

    // Post should be unique
    expect(mockPostDb.post.findUnique).toHaveBeenCalledWith({ where: { slug } });
    expect(mockPostDb.postView.upsert).toHaveBeenCalledWith({
      where: { postId: 'post-1' },
      update: {
        totalViews: { increment: 1 },
        uniqueViews: { increment: 1 }
      },
      create: {
        postId: 'post-1',
        totalViews: 1,
        uniqueViews: 1,
      }
    });

    expect(res.cookies.set).toHaveBeenCalledWith(expect.objectContaining({
      name: 'viewed_pages',
      value: JSON.stringify(['global_site', `post_${slug}`]),
    }));
  });

  it('tracks post view for returning visitor to a post (not unique)', async () => {
    const slug = 'test-post';
    const req = createRequest({ slug });
    mockCookiesGet.mockReturnValue({ value: JSON.stringify(['global_site', `post_${slug}`]) });

    const mockPostDb = await getPostDb();
    (mockPostDb.post.findUnique as import("vitest").Mock).mockResolvedValue({ id: 'post-1' });

    const res = await POST(req);

    expect(res.body).toEqual({ success: true });

    // Post should not be unique
    expect(mockPostDb.postView.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { totalViews: { increment: 1 } },
    }));

    expect(res.cookies.set).not.toHaveBeenCalled();
  });

  it('handles post view when post is not found', async () => {
    const slug = 'test-post';
    const req = createRequest({ slug });
    mockCookiesGet.mockReturnValue(undefined);

    const mockPostDb = await getPostDb();
    (mockPostDb.post.findUnique as import("vitest").Mock).mockResolvedValue(null);

    const res = await POST(req);

    expect(res.body).toEqual({ success: true });

    // Global should be unique
    expect(prisma.siteAnalytics.upsert).toHaveBeenCalled();

    // Post should be searched but upsert should not be called
    expect(mockPostDb.post.findUnique).toHaveBeenCalledWith({ where: { slug } });
    expect(mockPostDb.postView.upsert).not.toHaveBeenCalled();

    expect(res.cookies.set).toHaveBeenCalledWith(expect.objectContaining({
      name: 'viewed_pages',
      value: JSON.stringify(['global_site']),
    }));
  });

  it('handles database error gracefully', async () => {
    const slug = 'test-post';
    const req = createRequest({ slug });
    mockCookiesGet.mockReturnValue(undefined);

    (prisma.siteAnalytics.upsert as import("vitest").Mock).mockRejectedValue(new Error('DB Error'));

    const res = await POST(req);

    expect(res.body).toEqual({ success: false });
    expect(res.status).toBe(500);
  });
});
