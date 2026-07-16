/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Permission model for the /api/v1 REST API.
 *
 * Permissions use a "resource:action" format (e.g. "posts:create").
 * Supported wildcards: "posts:*" (all actions on a resource) and "*" (full access).
 *
 * This module is dependency-free so it can be imported from both
 * server code and client components.
 */

export const API_RESOURCES = ['posts', 'projects', 'gallery'] as const
export const API_ACTIONS = ['read', 'create', 'update', 'delete'] as const

export type ApiResource = (typeof API_RESOURCES)[number]
export type ApiAction = (typeof API_ACTIONS)[number]

/** Every concrete (non-wildcard) permission that can be granted. */
export const ALL_PERMISSIONS: string[] = API_RESOURCES.flatMap(resource =>
  API_ACTIONS.map(action => `${resource}:${action}`)
)

/**
 * Check whether a set of granted permissions satisfies a required permission.
 * Supports exact matches, per-resource wildcards ("posts:*") and a global
 * wildcard ("*").
 */
export function hasPermission(granted: string[], required: string): boolean {
  if (granted.includes('*')) return true
  if (granted.includes(required)) return true
  const [resource] = required.split(':')
  return granted.includes(`${resource}:*`)
}

/**
 * Validate a list of permissions coming from user input.
 * Returns only the entries that are valid permissions (incl. wildcards).
 */
export function sanitizePermissions(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const valid = new Set([...ALL_PERMISSIONS, '*', ...API_RESOURCES.map(r => `${r}:*`)])
  return [...new Set(input.filter((p): p is string => typeof p === 'string' && valid.has(p)))]
}
