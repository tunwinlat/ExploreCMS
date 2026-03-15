/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { prisma } from './db'

/**
 * Returns the Prisma client for database operations.
 * 
 * NOTE: This function previously handled switching between local SQLite and 
 * remote Bunny.net LibSQL databases. Now that DATABASE_URL is required via
 * environment variables, this simply returns the main prisma client.
 * 
 * Kept for backward compatibility - all database operations use the same
 * configured database (local file for development, LibSQL for production).
 */
export async function getPostDb() {
  return prisma
}

/**
 * @deprecated Use the main prisma export from '@/lib/db' directly instead.
 * This function is kept for backward compatibility.
 */
export { prisma }
