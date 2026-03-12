/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { GET } from './route';
import { getPostDb } from '@/lib/bunnyDb';
import { vi } from 'vitest';

// Mock the database dependency
vi.mock('@/lib/bunnyDb', () => ({
  getPostDb: vi.fn(),
}));

describe('GET /api/featured', () => {
  const mockFindMany = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (getPostDb as any).mockResolvedValue({
      post: {
        findMany: mockFindMany,
      },
    });
  });

  const createMockRequest = (url: string) => {
    return new Request(url);
  };

  it('should return only featured posts when they exist', async () => {
    const mockPosts = Array.from({ length: 3 }, (_, i) => ({
      id: `post-${i + 1}`,
      title: `Featured ${i + 1}`,
    }));

    mockFindMany.mockResolvedValue(mockPosts);

    const req = createMockRequest('http://localhost:3000/api/featured');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.posts).toEqual(mockPosts);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { published: true, isFeatured: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: expect.any(Object),
    }));
  });

  it('should respect the limit query parameter and cap it at 10', async () => {
    mockFindMany.mockResolvedValue([]);

    const req = createMockRequest('http://localhost:3000/api/featured?limit=20');
    await GET(req);

    // limit should be clamped to 10
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 10,
    }));
  });

  it('should return an empty array when no featured posts are present', async () => {
    mockFindMany.mockResolvedValue([]);

    const req = createMockRequest('http://localhost:3000/api/featured');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.posts).toEqual([]);
  });

  it('should return a 500 error response if the database query fails', async () => {
    mockFindMany.mockRejectedValue(new Error('Database error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const req = createMockRequest('http://localhost:3000/api/featured');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to load featured posts');

    consoleSpy.mockRestore();
  });
});
