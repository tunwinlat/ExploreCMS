/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db';

/**
 * ⚡ Bolt: Cache projects list database query to avoid hitting DB on every request.
 */
export const getCachedProjects = unstable_cache(
  async () => {
    if (!process.env.DATABASE_URL) return [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const projects = await (prisma as any).project.findMany({
        where: { published: true },
        orderBy: [{ featured: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return projects.map((p: any) => ({
        ...p,
        createdAt: typeof p.createdAt === 'string' ? p.createdAt : (p.createdAt ? p.createdAt.toISOString() : null),
        updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : (p.updatedAt ? p.updatedAt.toISOString() : null),
        techTags: (() => { try { return JSON.parse(p.techTags || '[]') } catch { return [] } })(),
      }));
    } catch { return []; }
  },
  ['projects-listing'],
  { revalidate: 60, tags: ['projects'] }
);
