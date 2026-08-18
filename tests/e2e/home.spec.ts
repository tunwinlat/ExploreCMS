/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { test, expect } from '@playwright/test'

const POST_TITLE = 'CI E2E Test Post'
const POST_SLUG = 'ci-e2e-test-post'

test('homepage returns 200, renders the site header, and lists the seeded post', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)

  // Site wordmark (SiteSettings.title defaults to "ExploreCMS").
  await expect(page.getByRole('link', { name: 'ExploreCMS' })).toBeVisible()

  // The seeded post is published, so it appears under "Latest Stories".
  await expect(page.getByRole('heading', { name: POST_TITLE })).toBeVisible()
})

test('clicking the seeded post navigates to its detail page', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('heading', { name: POST_TITLE }).click()

  await expect(page).toHaveURL(new RegExp(`/post/${POST_SLUG}$`))
  await expect(page.getByRole('heading', { level: 1, name: POST_TITLE })).toBeVisible()
})
