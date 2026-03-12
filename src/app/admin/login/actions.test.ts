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

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  createSession: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('loginUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

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
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      username: 'testuser',
      password: 'hashedpassword',
      role: 'ADMIN',
    });
    (compare as jest.Mock).mockResolvedValue(false);

    const formData = new FormData();
    formData.append('username', 'testuser');
    formData.append('password', 'wrongpassword');

    const result = await loginUser(formData);

    expect(result).toEqual({ error: 'Invalid username or password.' });
    expect(compare).toHaveBeenCalledWith('wrongpassword', 'hashedpassword');
  });

  it('should create session and redirect on success', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      username: 'testuser',
      password: 'hashedpassword',
      role: 'ADMIN',
    });
    (compare as jest.Mock).mockResolvedValue(true);

    const formData = new FormData();
    formData.append('username', 'testuser');
    formData.append('password', 'correctpassword');

    await loginUser(formData);

    expect(createSession).toHaveBeenCalledWith({
      userId: 1,
      username: 'testuser',
      role: 'ADMIN',
    });
    expect(redirect).toHaveBeenCalledWith('/admin/dashboard');
  });
});
