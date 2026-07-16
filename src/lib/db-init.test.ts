/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { Client } from '@libsql/client'

// Mock createClient so runSchemaMigrations (which only runs for remote
// libsql:// URLs) executes against a real temporary file database instead.
vi.mock('@libsql/client', async importOriginal => {
  const original = await importOriginal<typeof import('@libsql/client')>()
  return { ...original, createClient: vi.fn() }
})

import { createClient } from '@libsql/client'
import { runSchemaMigrations } from './db-init'

const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>

type CreateClient = typeof import('@libsql/client').createClient

describe('runSchemaMigrations (production auto-migration)', () => {
  let dir: string
  let db: Client
  let realCreateClient: CreateClient
  const OLD_ENV = process.env

  beforeEach(async () => {
    vi.clearAllMocks()
    // vi.importActual bypasses the module mock so we get the real driver
    realCreateClient = (await vi.importActual<typeof import('@libsql/client')>('@libsql/client')).createClient
    dir = mkdtempSync(join(tmpdir(), 'ecms-dbinit-'))
    db = realCreateClient({ url: `file:${join(dir, 'test.db')}` })
    mockCreateClient.mockReturnValue(db)
    process.env = { ...OLD_ENV, DATABASE_URL: 'libsql://fake.turso.io' }
  })

  afterEach(() => {
    process.env = OLD_ENV
    db.close()
    rmSync(dir, { recursive: true, force: true })
  })

  const tableExists = async (name: string): Promise<boolean> => {
    const r = await db.execute({
      sql: "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      args: [name],
    })
    return r.rows.length > 0
  }

  const columnExists = async (table: string, column: string): Promise<boolean> => {
    const r = await db.execute(`PRAGMA table_info("${table}")`)
    return r.rows.some(row => (row as unknown as { name: string }).name === column)
  }

  it('does nothing when DATABASE_URL is not set', async () => {
    delete process.env.DATABASE_URL
    await runSchemaMigrations()
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it('skips local file: databases (handled by prisma CLI in dev)', async () => {
    process.env.DATABASE_URL = 'file:./dev.db'
    await runSchemaMigrations()
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it('applies migrations including the ApiKey table on an old database', async () => {
    // Simulate a pre-existing production DB: base tables only, no ApiKey
    await db.execute(`CREATE TABLE "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "username" TEXT NOT NULL,
      "password" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'COLLABORATOR',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`)
    await db.execute(`CREATE TABLE "SiteSettings" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
      "title" TEXT NOT NULL DEFAULT 'ExploreCMS',
      "updatedAt" DATETIME NOT NULL
    )`)
    await db.execute(`CREATE TABLE "Post" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      "authorId" TEXT NOT NULL
    )`)

    await runSchemaMigrations()

    expect(await tableExists('ApiKey')).toBe(true)
    expect(await columnExists('SiteSettings', 'dynamicPattern')).toBe(true)
    expect(await columnExists('Post', 'contentFormat')).toBe(true)
    expect(await tableExists('Project')).toBe(true)
    expect(await tableExists('PhotoAlbum')).toBe(true)
  })

  it('does not short-circuit when the DB has the newest column but lacks ApiKey', async () => {
    // Regression guard: the fast-path probe must check the NEWEST migration
    // artifact. Simulate a DB that has dynamicPattern (old probe) but no ApiKey.
    await db.execute(`CREATE TABLE "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "username" TEXT NOT NULL,
      "password" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'COLLABORATOR',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`)
    await db.execute(`CREATE TABLE "SiteSettings" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
      "dynamicPattern" BOOLEAN NOT NULL DEFAULT true,
      "updatedAt" DATETIME NOT NULL
    )`)

    await runSchemaMigrations()

    expect(await tableExists('ApiKey')).toBe(true)
  })

  it('is idempotent — running twice succeeds and preserves data', async () => {
    await db.execute(`CREATE TABLE "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "username" TEXT NOT NULL,
      "password" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'COLLABORATOR',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`)

    await runSchemaMigrations()
    await db.execute({
      sql: `INSERT INTO "User" (id, username, password, role, createdAt, updatedAt)
            VALUES ('u1', 'owner', 'x', 'OWNER', '2026-01-01', '2026-01-01')`,
      args: [],
    })
    await db.execute({
      sql: `INSERT INTO "ApiKey" (id, name, keyHash, prefix, permissions, createdById, createdAt, updatedAt)
            VALUES ('k1', 'test', 'hash', 'ecms_test', '["*"]', 'u1', '2026-01-01', '2026-01-01')`,
      args: [],
    })

    // Second run must not fail or wipe data
    await runSchemaMigrations()

    const r = await db.execute({ sql: 'SELECT COUNT(*) c FROM "ApiKey"', args: [] })
    expect(Number(r.rows[0].c)).toBe(1)
  })

  it('returns early when the schema is already up to date', async () => {
    await db.execute(`CREATE TABLE "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "username" TEXT NOT NULL,
      "password" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'COLLABORATOR',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`)
    await runSchemaMigrations()
    expect(await tableExists('ApiKey')).toBe(true)

    // Track subsequent statements: the fast path should run exactly one probe
    // query and no DDL.
    const statements: string[] = []
    const spy = vi.spyOn(db, 'execute').mockImplementation(async (stmt) => {
      statements.push(typeof stmt === 'string' ? stmt : stmt.sql)
      return { columns: [], columnTypes: [], rows: [], rowsAffected: 0, lastInsertRowid: undefined, toJSON: () => ({}) }
    })

    await runSchemaMigrations()

    expect(statements).toHaveLength(1)
    expect(statements[0]).toContain('ApiKey')
    spy.mockRestore()
  })
})
