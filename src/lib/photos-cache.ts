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
      const albums = await prisma.photoAlbum.findMany({
        where: { published: true },
        orderBy: [{ featured: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
        include: { _count: { select: { photos: true } } },
      });
      return albums.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }));
    } catch { return []; }
  },
  ['albums-listing'],
  { revalidate: 60, tags: ['albums'] }
);
