/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db';

function parseTechTags(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === 'string')
      : [];
  } catch {
    return [];
  }
}

/**
 * ⚡ Bolt: Cache projects list database query to avoid hitting DB on every request.
 */
export const getCachedProjects = unstable_cache(
  async () => {
    if (!process.env.DATABASE_URL) return [];
    try {
      const projects = await prisma.project.findMany({
        where: { published: true },
        orderBy: [{ featured: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
      });
      return projects.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        techTags: parseTechTags(p.techTags),
      }));
    } catch { return []; }
  },
  ['projects-listing'],
  { revalidate: 60, tags: ['projects'] }
);
