/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { test, expect } from '@playwright/test'

// The fresh CI database has all public components enabled (by the smoke seed)
// but no profile/projects/photos content yet, so each route renders its empty
// state plus the site header. These assertions prove the routes load without a
// Next.js error overlay — if a render threw, the expected element would be absent.
test('/profile loads and renders its empty state', async ({ page }) => {
  const response = await page.goto('/profile')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('link', { name: 'ExploreCMS' })).toBeVisible()
  await expect(page.getByText('This profile is being put together. Check back soon.')).toBeVisible()
})

test('/projects loads and renders its hero and empty state', async ({ page }) => {
  const response = await page.goto('/projects')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'Built with Purpose' })).toBeVisible()
  await expect(page.getByText('No projects published yet. Check back soon.')).toBeVisible()
})

test('/photos loads and renders its hero and empty state', async ({ page }) => {
  const response = await page.goto('/photos')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'Moments Captured' })).toBeVisible()
  await expect(page.getByText('No albums published yet. Check back soon.')).toBeVisible()
})
