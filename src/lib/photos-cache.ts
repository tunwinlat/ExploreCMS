/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db';

/**
 * ⚡ Bolt: Cache albums list database query to avoid hitting DB on every request.
 */
export const getCachedAlbums = unstable_cache(
  async () => {
    if (!process.env.DATABASE_URL) return [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const albums = await (prisma as any).photoAlbum.findMany({
        where: { published: true },
        orderBy: [{ featured: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
        include: { _count: { select: { photos: true } } },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return albums.map((a: any) => ({
        ...a,
        createdAt: typeof a.createdAt === 'string' ? a.createdAt : (a.createdAt ? a.createdAt.toISOString() : null),
        updatedAt: typeof a.updatedAt === 'string' ? a.updatedAt : (a.updatedAt ? a.updatedAt.toISOString() : null),
      }));
    } catch { return []; }
  },
  ['albums-listing'],
  { revalidate: 60, tags: ['albums'] }
);
