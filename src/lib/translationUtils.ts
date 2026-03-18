/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * A post is "primary" (the canonical entry in a translation group) when:
 *   - it has no translationGroupId  (standalone post, not part of any group), OR
 *   - its translationGroupId equals its own id  (it IS the base post of the group).
 *
 * Translation variants have a translationGroupId that points to the base post's id,
 * so their id !== translationGroupId.
 *
 * Only primary posts should appear in public feeds.
 */
export function isPrimaryPost(post: { id: string; translationGroupId?: string | null }): boolean {
  return !post.translationGroupId || post.translationGroupId === post.id
}
