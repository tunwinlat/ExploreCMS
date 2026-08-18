/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { test, expect } from '@playwright/test'

test('/feed.xml returns 200 and a valid RSS document', async ({ request }) => {
  const response = await request.get('/feed.xml')
  expect(response.status()).toBe(200)

  const body = await response.text()
  expect(body).toContain('<rss')
})
