/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect } from 'vitest'
import { isPrimaryPost } from './translationUtils'

describe('isPrimaryPost', () => {
  it('should return true if translationGroupId is undefined', () => {
    const post = { id: 'post-1' }
    expect(isPrimaryPost(post)).toBe(true)
  })

  it('should return true if translationGroupId is null', () => {
    const post = { id: 'post-1', translationGroupId: null }
    expect(isPrimaryPost(post)).toBe(true)
  })

  it('should return true if translationGroupId is equal to id', () => {
    const post = { id: 'post-1', translationGroupId: 'post-1' }
    expect(isPrimaryPost(post)).toBe(true)
  })

  it('should return false if translationGroupId is different from id', () => {
    const post = { id: 'post-2', translationGroupId: 'post-1' }
    expect(isPrimaryPost(post)).toBe(false)
  })
})
