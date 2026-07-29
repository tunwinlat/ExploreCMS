/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PopupToast } from '@/components/PopupToast'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('PopupToast', () => {
  it('shows the every-visit popup only once during a browsing session', () => {
    const props = {
      title: 'Welcome',
      content: '<p>Latest announcement</p>',
      displayMode: 'always',
    }

    const firstRender = render(<PopupToast {...props} />)
    act(() => vi.advanceTimersByTime(500))

    expect(screen.getByRole('dialog', { name: 'Welcome' })).toBeTruthy()

    firstRender.unmount()
    render(<PopupToast {...props} />)
    act(() => vi.advanceTimersByTime(500))

    expect(screen.queryByRole('dialog', { name: 'Welcome' })).toBeNull()
  })

  it('shows the every-visit popup again in a new browsing session', () => {
    const props = {
      title: 'Welcome',
      content: '<p>Latest announcement</p>',
      displayMode: 'always',
    }

    const firstRender = render(<PopupToast {...props} />)
    act(() => vi.advanceTimersByTime(500))
    firstRender.unmount()

    sessionStorage.clear()
    render(<PopupToast {...props} />)
    act(() => vi.advanceTimersByTime(500))

    expect(screen.getByRole('dialog', { name: 'Welcome' })).toBeTruthy()
  })
})
