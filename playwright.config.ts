/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { defineConfig, devices } from '@playwright/test'
import { join } from 'node:path'

// The app's libsql adapter resolves relative `file:` DATABASE_URLs against the
// process cwd, but Prisma's CLI resolves them against prisma/. To make both
// agree we always point at an absolute path (see scripts/ci-smoke-seed.mjs).
const databaseUrl = `file:${join(process.cwd(), 'prisma', 'ci.db')}`

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : [['list']],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Playwright owns the production server lifecycle. The build must already
  // exist and the DB must already be pushed + seeded (see ci.yml).
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: databaseUrl,
      JWT_SECRET: 'ci-build-secret',
      ENCRYPTION_KEY: 'ci-build-secret',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    },
  },
})
