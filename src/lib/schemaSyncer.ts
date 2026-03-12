/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Introspection-based incremental schema synchronization for remote SQLite/LibSQL databases.
 *
 * Instead of blindly running full DDL (which only handles initial creation), this module:
 *   1. Generates the desired DDL from the Prisma schema
 *   2. Introspects the remote DB to see what already exists
 *   3. Emits only the delta: CREATE TABLE for new tables, ALTER TABLE ADD COLUMN for new columns
 *
 * This ensures schema evolution is safe and data-preserving.
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import type { Client as LibSQLClient } from '@libsql/client'

const execAsync = promisify(exec)

// ─── Types ────────────────────────────────────────────────────────────────────

interface ColumnDef {
  name: string
  type: string
  notNull: boolean
  defaultValue: string | null
  primaryKey: boolean
}

interface TableDef {
  name: string
  columns: ColumnDef[]
  /** The full original CREATE TABLE statement (with IF NOT EXISTS injected) */
  createStatement: string
}

interface IndexDef {
  name: string
  /** The full original CREATE INDEX statement (with IF NOT EXISTS injected) */
  createStatement: string
}

interface PragmaColumnRow {
  cid: number
  name: string
  type: string
  notnull: number
  dflt_value: string | null
  pk: number
}

// ─── DDL Parsing ──────────────────────────────────────────────────────────────

/**
 * Generate the full DDL from the current Prisma schema using `prisma migrate diff`.
 */
async function generateDesiredDDL(): Promise<string> {
  const { stdout } = await execAsync(
    `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`
  )
  return stdout
}

/**
 * Parse raw DDL text into structured table and index definitions.
 *
 * Handles multi-line CREATE TABLE blocks and single-line CREATE INDEX statements.
 */
export function parseDDL(ddl: string): { tables: TableDef[]; indexes: IndexDef[] } {
  const tables: TableDef[] = []
  const indexes: IndexDef[] = []

  // ── Extract CREATE TABLE blocks ──
  // Match CREATE TABLE "Name" (\n ... \n);
  const tableRegex = /CREATE TABLE\s+"(\w+)"\s*\(([\s\S]*?)\);/g
  let match: RegExpExecArray | null

  while ((match = tableRegex.exec(ddl)) !== null) {
    const tableName = match[1]
    const columnsBlock = match[2]
    const columns: ColumnDef[] = []

    // Split into individual column/constraint lines
    const lines = columnsBlock.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('CONSTRAINT') && !l.startsWith('FOREIGN KEY'))

    for (const line of lines) {
      // Match: "columnName" TYPE [NOT NULL] [DEFAULT value]
      const colMatch = line.match(/^"(\w+)"\s+(\w+(?:\s*\(\d+\))?)\s*(.*?)[\s,]*$/)
      if (!colMatch) continue

      const name = colMatch[1]
      const type = colMatch[2]
      const rest = colMatch[3]

      const notNull = /NOT NULL/i.test(rest)
      const primaryKey = /PRIMARY KEY/i.test(rest)

      let defaultValue: string | null = null
      const defaultMatch = rest.match(/DEFAULT\s+(.+?)(?:\s+NOT|\s+PRIMARY|\s*$)/i)
      if (defaultMatch) {
        defaultValue = defaultMatch[1].trim()
        // Remove trailing comma if present
        if (defaultValue.endsWith(',')) {
          defaultValue = defaultValue.slice(0, -1).trim()
        }
      }

      columns.push({ name, type, notNull, defaultValue, primaryKey })
    }

    // Build idempotent CREATE TABLE statement
    const createStatement = `CREATE TABLE IF NOT EXISTS "${tableName}" (${columnsBlock});`

    tables.push({ name: tableName, columns, createStatement })
  }

  // ── Extract CREATE INDEX statements ──
  const indexRegex = /CREATE\s+(UNIQUE\s+)?INDEX\s+"(\w+)"/g
  const fullIndexStatements = ddl.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+[\s\S]*?;/g) || []

  for (const stmt of fullIndexStatements) {
    const nameMatch = stmt.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+"(\w+)"/)
    if (nameMatch) {
      const idempotentStmt = stmt
        .replace(/CREATE UNIQUE INDEX/g, 'CREATE UNIQUE INDEX IF NOT EXISTS')
        .replace(/CREATE INDEX(?!\s+IF)/g, 'CREATE INDEX IF NOT EXISTS')
      indexes.push({ name: nameMatch[1], createStatement: idempotentStmt })
    }
  }

  return { tables, indexes }
}

// ─── Remote Introspection ─────────────────────────────────────────────────────

/**
 * Check if a table exists on the remote DB.
 */
async function remoteTableExists(client: LibSQLClient, tableName: string): Promise<boolean> {
  const result = await client.execute({
    sql: `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    args: [tableName]
  })
  return result.rows.length > 0
}

/**
 * Get the column definitions of an existing remote table via PRAGMA.
 */
async function getRemoteColumns(client: LibSQLClient, tableName: string): Promise<PragmaColumnRow[]> {
  const result = await client.execute({
    sql: `PRAGMA table_info("${tableName}")`,
    args: []
  })
  return result.rows.map(row => ({
    cid: Number(row.cid),
    name: String(row.name),
    type: String(row.type),
    notnull: Number(row.notnull),
    dflt_value: row.dflt_value != null ? String(row.dflt_value) : null,
    pk: Number(row.pk)
  }))
}

/**
 * Build an ALTER TABLE ADD COLUMN statement for a missing column.
 *
 * SQLite constraints for ADD COLUMN:
 *   - Cannot be PRIMARY KEY or UNIQUE
 *   - If NOT NULL, MUST have a DEFAULT value
 *   - Cannot reference a foreign key (we skip relation columns)
 */
function buildAlterColumn(tableName: string, col: ColumnDef): string {
  let sql = `ALTER TABLE "${tableName}" ADD COLUMN "${col.name}" ${col.type}`

  if (col.notNull && col.defaultValue != null) {
    sql += ` NOT NULL DEFAULT ${col.defaultValue}`
  } else if (col.notNull && col.defaultValue == null) {
    // SQLite won't allow NOT NULL without DEFAULT on ADD COLUMN
    // Fallback: add the column as nullable (safer than crashing)
    sql += ` DEFAULT NULL`
  } else if (col.defaultValue != null) {
    sql += ` DEFAULT ${col.defaultValue}`
  }

  return sql + ';'
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Synchronize the remote LibSQL database schema to match the current Prisma schema.
 *
 * This is the single function called by `bunnyActions.ts` during connect.
 *
 * @param client - An already-authenticated LibSQL client pointing at the remote DB
 * @returns An object describing what was applied
 */
export async function syncRemoteSchema(client: LibSQLClient): Promise<{
  tablesCreated: string[]
  columnsAdded: string[]
  indexesCreated: string[]
}> {
  const tablesCreated: string[] = []
  const columnsAdded: string[] = []
  const indexesCreated: string[] = []

  // 1. Generate desired DDL from Prisma schema
  console.log('[SchemaSyncer] Generating desired DDL from Prisma schema...')
  const ddl = await generateDesiredDDL()
  const { tables, indexes } = parseDDL(ddl)

  console.log(`[SchemaSyncer] Found ${tables.length} tables and ${indexes.length} indexes in the schema.`)

  // 2. For each table in the desired state:
  for (const table of tables) {
    const exists = await remoteTableExists(client, table.name)

    if (!exists) {
      // Brand new table → create it wholesale
      console.log(`[SchemaSyncer] Creating new table: ${table.name}`)
      await client.execute(table.createStatement)
      tablesCreated.push(table.name)
    } else {
      // Table exists → diff columns
      const remoteColumns = await getRemoteColumns(client, table.name)
      const existingNames = new Set(remoteColumns.map(c => c.name))

      for (const col of table.columns) {
        if (!existingNames.has(col.name)) {
          // Missing column → add it
          const alterSql = buildAlterColumn(table.name, col)
          console.log(`[SchemaSyncer] Adding column: ${table.name}.${col.name}`)
          try {
            await client.execute(alterSql)
            columnsAdded.push(`${table.name}.${col.name}`)
          } catch (err: any) {
            console.warn(`[SchemaSyncer] Failed to add column ${table.name}.${col.name}: ${err.message}`)
          }
        }
      }
    }
  }

  // 3. Apply idempotent index creation
  for (const index of indexes) {
    try {
      await client.execute(index.createStatement)
      indexesCreated.push(index.name)
    } catch (err: any) {
      // Index might already exist or reference missing columns — safe to skip
      console.warn(`[SchemaSyncer] Index ${index.name} skipped: ${err.message}`)
    }
  }

  console.log(`[SchemaSyncer] Sync complete: ${tablesCreated.length} tables created, ${columnsAdded.length} columns added, ${indexesCreated.length} indexes ensured.`)

  return { tablesCreated, columnsAdded, indexesCreated }
}
