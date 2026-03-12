import { GET } from './route';
import { getPostDb } from '@/lib/bunnyDb';

// Mock the database dependency
jest.mock('@/lib/bunnyDb', () => ({
  getPostDb: jest.fn(),
}));

describe('GET /api/posts', () => {
  const mockFindMany = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getPostDb as jest.Mock).mockResolvedValue({
      post: {
        findMany: mockFindMany,
      },
    });
  });

  const createMockRequest = (url: string) => {
    return new Request(url);
  };

  it('should return posts and a nextCursor when there are more posts than the limit', async () => {
    // 9 is the limit, so we return 10 posts to indicate more are available
    const mockPosts = Array.from({ length: 10 }, (_, i) => ({
      id: `post-${i + 1}`,
      title: `Post ${i + 1}`,
    }));

    mockFindMany.mockResolvedValue(mockPosts);

    const req = createMockRequest('http://localhost:3000/api/posts');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Should return 9 posts (limit)
    expect(data.posts).toHaveLength(9);
    expect(data.posts[0].id).toBe('post-1');
    expect(data.posts[8].id).toBe('post-9');
    // nextCursor should be the ID of the 10th post
    expect(data.nextCursor).toBe('post-10');

    // Check arguments strictly matching what is sent
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { published: true },
      take: 10, // limit + 1
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { username: true, firstName: true }
        },
        tags: true,
        views: true
      }
    }));

    // Explicitly verify cursor is NOT part of the object if we didn't pass one,
    // or if it was passed as undefined. The code actually passes: `cursor: undefined`.
    // We expect it to be `undefined`.
    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.cursor).toBeUndefined();
  });

  it('should return posts and undefined nextCursor when there are no more posts', async () => {
    const mockPosts = Array.from({ length: 5 }, (_, i) => ({
      id: `post-${i + 1}`,
      title: `Post ${i + 1}`,
    }));

    mockFindMany.mockResolvedValue(mockPosts);

    const req = createMockRequest('http://localhost:3000/api/posts?cursor=some-cursor-id');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.posts).toHaveLength(5);
    expect(data.nextCursor).toBeUndefined();

    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 10,
      cursor: { id: 'some-cursor-id' },
    }));
  });

  it('should return an empty array and undefined nextCursor when database is empty', async () => {
    mockFindMany.mockResolvedValue([]);

    const req = createMockRequest('http://localhost:3000/api/posts');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.posts).toEqual([]);
    expect(data.nextCursor).toBeUndefined();
  });

  it('should return a 500 error response if the database query fails', async () => {
    mockFindMany.mockRejectedValue(new Error('Database connection failed'));

    // Suppress console.error for this test to avoid noisy output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const req = createMockRequest('http://localhost:3000/api/posts');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to load posts');

    consoleSpy.mockRestore();
  });
});
