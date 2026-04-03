/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useCallback } from 'react'
import { 
  getEncryptionMigrationStatus, 
  runEncryptionMigration,
  EncryptionStatus 
} from './encryptionActions'

export default function EncryptionMigration() {
  const [status, setStatus] = useState<EncryptionStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [result, setResult] = useState<{
    migrated: string[]
    skipped: string[]
    failed: string[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await getEncryptionMigrationStatus()
      if (response.success && response.status) {
        setStatus(response.status)
      } else {
        setError(response.error || 'Failed to get status')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  const runMigration = useCallback(async () => {
    setMigrating(true)
    setError(null)
    setResult(null)
    try {
      const response = await runEncryptionMigration()
      if (response.success && response.result) {
        setResult({
          migrated: response.result.migrated.map(m => m.label),
          skipped: response.result.skipped.map(s => `${s.label} (${s.reason})`),
          failed: response.result.failed.map(f => `${s.label}: ${f.error}`)
        })
        // Refresh status after migration
        await checkStatus()
      } else {
        setError(response.error || 'Migration failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setMigrating(false)
    }
  }, [checkStatus])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'encrypted':
        return '🔒'
      case 'plain':
        return '📝'
      case 'legacy':
        return '⚠️'
      case 'empty':
        return '➖'
      default:
        return '❓'
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'encrypted':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'plain':
      case 'legacy':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'empty':
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white dark:bg-[#1a1d27] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Encryption Migration
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Secure your existing sensitive data by migrating to encrypted storage
          </p>
        </div>
        <button
          onClick={checkStatus}
          disabled={loading}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                     rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {loading ? 'Checking...' : 'Check Status'}
        </button>
      </div>

      {!status && !loading && !error && (
        <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 
                        rounded-md p-4 border border-dashed border-gray-300 dark:border-gray-600">
          Click "Check Status" to see the encryption status of your sensitive data.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 
                        rounded-md text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {status && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-3 rounded-lg border ${
              status.isEnabled 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">
                Encryption Key
              </div>
              <div className={`text-sm font-semibold ${
                status.isEnabled ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
              }`}>
                {status.isEnabled ? '✅ Configured' : '❌ Not Configured'}
              </div>
            </div>
            <div className={`p-3 rounded-lg border ${
              status.hasUnencrypted 
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' 
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            }`}>
              <div className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">
                Migration Status
              </div>
              <div className={`text-sm font-semibold ${
                status.hasUnencrypted ? 'text-yellow-700 dark:text-yellow-400' : 'text-green-700 dark:text-green-400'
              }`}>
                {status.hasUnencrypted ? '⚠️ Migration Needed' : '✅ All Encrypted'}
              </div>
            </div>
          </div>

          {/* Fields Table */}
          {status.fields.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                      Field
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {status.fields.map((field) => (
                    <tr key={field.field} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-2 px-3 text-gray-900 dark:text-gray-100">
                        {field.label}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(field.status)}`}>
                          {getStatusIcon(field.status)}
                          <span className="capitalize">{field.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Migration Button */}
          {status.isEnabled && status.hasUnencrypted && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={runMigration}
                disabled={migrating}
                className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400
                           text-white rounded-md font-medium transition-colors
                           disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {migrating ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Encrypting Data...
                  </>
                ) : (
                  <>
                    🔐 Encrypt Existing Data
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                This will encrypt all unencrypted sensitive data using your ENCRYPTION_KEY
              </p>
            </div>
          )}

          {!status.isEnabled && status.hasUnencrypted && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 
                            rounded-md text-amber-800 dark:text-amber-400 text-sm">
              <p className="font-medium mb-1">⚠️ ENCRYPTION_KEY not configured</p>
              <p>
                Set the <code className="bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">ENCRYPTION_KEY</code> environment 
                variable to enable encryption. Once configured, you can migrate your existing data.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Migration Result */}
      {result && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 
                        rounded-md space-y-2">
          <h4 className="font-medium text-blue-900 dark:text-blue-400">Migration Complete</h4>
          
          {result.migrated.length > 0 && (
            <div className="text-sm">
              <span className="text-green-600 dark:text-green-400 font-medium">✅ Encrypted:</span>
              <span className="text-blue-800 dark:text-blue-300 ml-2">{result.migrated.join(', ')}</span>
            </div>
          )}
          
          {result.skipped.length > 0 && (
            <div className="text-sm">
              <span className="text-gray-600 dark:text-gray-400 font-medium">➖ Skipped:</span>
              <span className="text-blue-800 dark:text-blue-300 ml-2">{result.skipped.join(', ')}</span>
            </div>
          )}
          
          {result.failed.length > 0 && (
            <div className="text-sm">
              <span className="text-red-600 dark:text-red-400 font-medium">❌ Failed:</span>
              <span className="text-blue-800 dark:text-blue-300 ml-2">{result.failed.join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
