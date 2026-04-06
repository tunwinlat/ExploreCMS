import { describe, it, expect, vi, beforeEach } from 'vitest';
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { loginUser } from './actions';
import { prisma } from '@/lib/db';
import { compare } from 'bcryptjs';
import { createSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  compare: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  createSession: vi.fn(),
}));


vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null)
  }),
}));

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ success: true }),
  getClientIPFromHeaders: vi.fn().mockReturnValue('127.0.0.1'),
  RATE_LIMITS: { auth: {} }
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('loginUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error if username or password is missing', async () => {
    const formData = new FormData();
    formData.append('username', '');
    formData.append('password', '');

    const result = await loginUser(formData);

    expect(result).toEqual({ error: 'Missing credentials.' });
  });

  it('should return error if username is provided but password is missing', async () => {
    const formData = new FormData();
    formData.append('username', 'testuser');

    const result = await loginUser(formData);

    expect(result).toEqual({ error: 'Missing credentials.' });
  });

  it('should return error if password is provided but username is missing', async () => {
    const formData = new FormData();
    formData.append('password', 'password123');

    const result = await loginUser(formData);

    expect(result).toEqual({ error: 'Missing credentials.' });
  });

  it('should return error if user is not found', async () => {
    (prisma.user.findUnique as vi.Mock).mockResolvedValue(null);

    const formData = new FormData();
    formData.append('username', 'testuser');
    formData.append('password', 'password123');

    const result = await loginUser(formData);

    expect(result).toEqual({ error: 'Invalid username or password.' });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { username: 'testuser' },
    });
  });

  it('should return error if password does not match', async () => {
    (prisma.user.findUnique as vi.Mock).mockResolvedValue({
      id: 1,
      username: 'testuser',
      password: 'hashedpassword',
      role: 'ADMIN',
    });
    (compare as vi.Mock).mockResolvedValue(false);

    const formData = new FormData();
    formData.append('username', 'testuser');
    formData.append('password', 'wrongpassword');

    const result = await loginUser(formData);

    expect(result).toEqual({ error: 'Invalid username or password.' });
    expect(compare).toHaveBeenCalledWith('wrongpassword', 'hashedpassword');
  });

  it('should create session and redirect on success', async () => {
    (prisma.user.findUnique as vi.Mock).mockResolvedValue({
      id: 1,
      username: 'testuser',
      password: 'hashedpassword',
      role: 'ADMIN',
    });
    (compare as vi.Mock).mockResolvedValue(true);

    const formData = new FormData();
    formData.append('username', 'testuser');
    formData.append('password', 'correctpassword');

    const result = await loginUser(formData);

    expect(createSession).toHaveBeenCalledWith({
      userId: 1,
      username: 'testuser',
      role: 'ADMIN',
    });
    expect(result).toEqual({ success: true });
  });
});
