import { describe, it, expect } from 'vitest'
import { parseDDL } from './schemaSyncer'

describe('parseDDL', () => {
  it('should return empty arrays for empty DDL string', () => {
    const result = parseDDL('')
    expect(result.tables).toEqual([])
    expect(result.indexes).toEqual([])
  })

  it('should parse a basic CREATE TABLE statement', () => {
    const ddl = `
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
    `

    const result = parseDDL(ddl)
    expect(result.tables).toHaveLength(1)
    expect(result.tables[0].name).toBe('User')
    expect(result.tables[0].columns).toEqual([
      {
        name: 'id',
        type: 'TEXT',
        notNull: true,
        defaultValue: null,
        primaryKey: true,
      },
      {
        name: 'email',
        type: 'TEXT',
        notNull: true,
        defaultValue: null,
        primaryKey: false,
      },
      {
        name: 'name',
        type: 'TEXT',
        notNull: false,
        defaultValue: null,
        primaryKey: false,
      },
      {
        name: 'createdAt',
        type: 'DATETIME',
        notNull: true,
        defaultValue: 'CURRENT_TIMESTAMP',
        primaryKey: false,
      },
    ])
    expect(result.tables[0].createStatement).toBe(
      `CREATE TABLE IF NOT EXISTS "User" (\n    "id" TEXT NOT NULL PRIMARY KEY,\n    "email" TEXT NOT NULL,\n    "name" TEXT,\n    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP\n);`
    )
    expect(result.indexes).toHaveLength(0)
  })

  it('should parse a CREATE TABLE statement skipping constraints and foreign keys', () => {
    const ddl = `
CREATE TABLE "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
    `

    const result = parseDDL(ddl)
    expect(result.tables).toHaveLength(1)
    expect(result.tables[0].name).toBe('Post')
    expect(result.tables[0].columns).toEqual([
      {
        name: 'id',
        type: 'TEXT',
        notNull: true,
        defaultValue: null,
        primaryKey: true,
      },
      {
        name: 'authorId',
        type: 'TEXT',
        notNull: true,
        defaultValue: null,
        primaryKey: false,
      },
      {
        name: 'content',
        type: 'TEXT',
        notNull: true,
        defaultValue: null,
        primaryKey: false,
      },
    ])
  })

  it('should parse DEFAULT values correctly and remove trailing commas', () => {
    const ddl = `
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'active',
    "count" INTEGER DEFAULT 0
);
    `

    const result = parseDDL(ddl)
    expect(result.tables).toHaveLength(1)
    expect(result.tables[0].columns).toEqual([
      {
        name: 'id',
        type: 'TEXT',
        notNull: true,
        defaultValue: null,
        primaryKey: true,
      },
      {
        name: 'status',
        type: 'TEXT',
        notNull: true,
        defaultValue: "'active'",
        primaryKey: false,
      },
      {
        name: 'count',
        type: 'INTEGER',
        notNull: false,
        defaultValue: '0',
        primaryKey: false,
      },
    ])
  })

  it('should extract indexes and add IF NOT EXISTS to the creation statements', () => {
    const ddl = `
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");
    `

    const result = parseDDL(ddl)
    expect(result.tables).toHaveLength(0)
    expect(result.indexes).toHaveLength(2)

    expect(result.indexes[0].name).toBe('User_email_key')
    expect(result.indexes[0].createStatement).toBe(
      'CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");'
    )

    expect(result.indexes[1].name).toBe('Post_authorId_idx')
    expect(result.indexes[1].createStatement).toBe(
      'CREATE INDEX IF NOT EXISTS "Post_authorId_idx" ON "Post"("authorId");'
    )
  })

  it('should correctly handle multiple tables and indexes', () => {
    const ddl = `
CREATE TABLE "A" (
    "id" TEXT NOT NULL PRIMARY KEY
);

CREATE TABLE "B" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "a_id" TEXT NOT NULL
);

CREATE UNIQUE INDEX "A_id_key" ON "A"("id");
CREATE INDEX "B_a_id_idx" ON "B"("a_id");
    `

    const result = parseDDL(ddl)
    expect(result.tables).toHaveLength(2)
    expect(result.tables[0].name).toBe('A')
    expect(result.tables[1].name).toBe('B')

    expect(result.indexes).toHaveLength(2)
    expect(result.indexes[0].name).toBe('A_id_key')
    expect(result.indexes[1].name).toBe('B_a_id_idx')
  })
})
